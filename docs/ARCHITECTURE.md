# Corgi TV — MVP 技术架构

- 版本：V1.0 · 2026-11-02
- 状态：设计基线；M0已验收，M1核心实现见 `src/core/` 与 [M1 API](m1-core-api.md)，M2皮肤与M3本地管理已实现；M4播放器与Docker静态交付已实现，实测范围见m4-test-report.md
- 原则：**纯前端、时序核心独立、视频来源适配、皮肤可插拔、播放直连**

## 1. 技术栈

- Vite + React + TypeScript；UI 用 shadcn/ui + Tailwind CSS；状态管理 Zustand。
- 本地持久化 Dexie + IndexedDB；少量偏好可用 localStorage；JSON 备份。
- 标准 HLS 点播用 hls.js + HTMLVideoElement；受支持时可使用浏览器原生 HLS 播放。
- B站官方嵌入播放器、YouTube 官方 IFrame Player API 分别由独立 Adapter 承载；AcFun 不纳入 M0 必过范围。
- 测试：Vitest、React Testing Library、Playwright；部署：静态构建产物 + OpenResty 或 Docker 静态服务。
- 初始化时选择相互兼容的稳定版本，记录实际依赖版本；不假定各平台 iframe 具备同等控制能力。

## 2. 逻辑架构

```text
React UI
├── TV View / Admin Workspace / Timeline
├── Skin Renderer (CRT80s; future skins)
│   └── actions: power / channelPrev / channelNext / volume
├── TV Core
│   ├── Power & Channel State
│   ├── Scheduler (Asia/Shanghai clock)
│   └── Playback Coordinator
│       └── Player Adapter Interface
│           ├── HlsVODAdapter (hls.js / native HLS)
│           ├── BilibiliEmbedAdapter (capabilities subject to M0)
│           └── YouTubeIFrameAdapter (official API)
└── Repository
    ├── Channels / Programs / Schedules (IndexedDB)
    ├── Settings
    └── JSON Import / Export + schema migration

Browser  ─────direct video requests─────> Provider / CDN
Static host ───serves app assets only────> Browser
```

不建设播放代理、FFmpeg 服务、抓流或下载任务；M0 对 CDN/视频请求的真实去向进行网络取证。

## 3. 数据模型（设计示意；M1已实现模型与校验，见src/core/model.ts）

```ts
type SourceType = 'hls-vod' | 'bilibili' | 'youtube';
interface Channel {
  id: string;
  number: number;
  name: string;
  sortOrder: number;
  enabled: boolean;
}
interface Program {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string;
  sourceId?: string;
  durationSeconds?: number; // 由可验证元数据提供，不盲信
}
interface Schedule {
  id: string;
  channelId: string;
  programId: string;
  startMinute: number; // 0..1439
  endMinute: number;   // 1..1440, end > start
}
interface Settings {
  schemaVersion: number;
  skinId: 'china-crt-80s';
  volume: number;
  lastChannelId?: string;
}
```

- `Schedule` 不允许同频道重叠，不跨越午夜；每日同一时段循环。`endMinute=1440` 表示 24:00，不是下一日 00:00 的重复区间。
- `Program` 独立于排片，允许复用；不要把视频 URL 嵌入 Schedule 中。
- 以 ID 关联，不以频道编号关联；调整频道顺序/编号不会破坏节目单。

## 4. 时序算法与状态机

所有排片以北京时间 `Asia/Shanghai` 的当地日期与分钟解释，但运行时从当前绝对时间戳（UTC 毫秒）推导北京日期及时间，用毫秒精度计算 `offsetSeconds`：

```text
1. 如果电视关机：UNMOUNTED；不保留视频流。
2. now = 系统当前绝对时间戳，转换至 Asia/Shanghai。
3. 找到当前频道满足 start <= todayMinute < end 的排片。
4. 无排片 -> NO_SIGNAL。
5. 存在排片 -> 取它当日北京日期的 start 对应绝对时间；offset=now-start。
6. 若媒体已知时长且 offset >= duration -> NO_SIGNAL。
7. 否则加载来源，等可 seek 后按最新 now 重新计算 offset，seek 并播放。
8. 播放中持续校准且在排片边界切换；提前 ended -> NO_SIGNAL 直到下一时段。
9. 频道改变、开机、网络恢复、标签页激活、系统睡眠恢复时重新求值。
```

建议状态：`OFF | NO_SIGNAL | LOADING | PLAYING | BLOCKED_AUTOPLAY | PLAYBACK_ERROR`。`VIDEO_ENDED_EARLY` 可作为 NO_SIGNAL 原因码。调度器应以绝对时间计算边界而不是累加 interval；背景页计时器可能被节流，恢复时立即重评估。必须防止旧频道的异步加载覆盖新频道状态（使用 generation token 或 AbortController）。

**同步精度**：M0 建议以实际跳转偏差 ≤2 秒作为工程验证目标（取决于 HLS 关键帧/分片），节目边界切换调度触发 ≤1 秒为目标，媒体首次显示延迟另行记录。网络或平台限制导致无法达标须明示。

## 5. Player Adapter 契约

Adapter 能力必须显式探测，不能假定所有来源支持同一操作。

```ts
interface PlayerCapabilities {
  playable: boolean;
  seek: boolean;
  volume: boolean;
  endedEvent: boolean;
  statusEvents: boolean;
  destroyStopsLoading: boolean;
  hideNativeControls: boolean;
}

interface PlayerAdapter {
  getCapabilities(): PlayerCapabilities;
  load(source: Program): Promise<void>;
  play(): Promise<void>;
  seekTo(seconds: number): Promise<void>; // 可能不支持/失败
  setVolume(value: number): Promise<void>; // 可能不支持
  destroy(): Promise<void>;
  // 状态回调/订阅的具体形式由 M0 结论确定
}
```

- HLS：hls.js 使用 HTMLVideoElement，源必须有 CORS 许可；点播需要可定位时间范围。
- B站：仅使用允许的官方播放器与链接参数；即使 `t` 能指定起始秒数，也不证明远程音量/ended 事件可用。
- YouTube：使用官方 IFrame API；功能与浏览器自动播放政策及平台使用规则有关。
- 不满足关键 `seek` 或 `destroy` 等能力的来源应标记受限，不做表面上“排片成功但永远从头播”。
- 平台可能保留其自身控制 UI；不可通过规避平台限制实现隐藏。

## 6. Skin 接口与交互

皮肤只消费 Core 的只读状态并派发意图，如 `powerOn/powerOff/channelPrev/channelNext/setVolume`，不能自己维护第二份频道与播放状态。

包含：`TVFrame`、`ScreenMask`、`Controls`、`NoSignal`、`Transitions`、`SkinSounds`（如可用），第一版 `china-crt-80s`。屏幕播放器和机身分别布局，支持 CSS 裁切与屏幕比例；无信号彩条由皮肤渲染而非由视频源提供。旋钮的视觉角度要跟随核心状态。

## 7. 浏览器与部署约束

- 不能依靠部署为 HTTPS 就绕过第三方 CORS / DRM / 防盗链。
- 自动播放带声音常需用户交互；通过电视电源键获得用户操作后仍需单独验证后续来源行为。
- 视频直连不经过应用服务器；但是 HTML/JS/API 等少量流量仍由静态宿主承担。
- M0 在本地环境验证，正式上线可用 1Panel/OpenResty 提供 HTTPS 静态站点；容器并非强制要求。
- 第一版无账户与服务端同步，清理浏览器站点数据会丢失本地数据；实现 JSON 备份恢复。
- 海外设备仍按北京时间排片，但设备时钟若不准会偏移；第一版不引入时间服务器。

## 8. 代码结构建议（M1 之后才正式建立）

```text
src/
  app/
  core/          # clock, scheduler, coordinator, state
  player/        # adapter contracts and implementations
  skins/china-crt-80s/
  features/channels/
  features/programs/
  features/schedules/
  storage/
  components/ui/ # shadcn/ui
  test/
docs/
```

**M0 只需一个独立最小验证页及必要播放器封装，不应提前搭建所有目录与业务功能。**

## 9. 主要风险

| 风险 | 策略 |
|---|---|
| B站 iframe 外部可控性有限 | M0 分项验证；保留部分支持状态 |
| YouTube 自动播放受限 | 记录事件与用户交互恢复路径 |
| HLS 源缺少 CORS/seek | 换合规测试素材；不增加代理绕过 |
| 媒体长度不足排片时长 | 提前 ended -> NO_SIGNAL |
| 浏览器后台节流/睡眠 | 激活时基于绝对时间重新定位 |
| 用户浏览器存储被清理 | JSON 导入导出、模式版本迁移 |
| 浏览器不支持特定媒体编码 | M0 浏览器与编码组合实际验证 |

## M3实现决策（2026-11-03）

详见[m3-storage-api.md](m3-storage-api.md)。用户要求主界面只展示立体电视机，管理界面放在弹窗；不再采用M2外围页面元素。React继续使用已有外部订阅控制器与AppStore，无第二份播放状态，因此当前未引入设计草案中的Zustand。自动测试延续Node test runner与Playwright，不为新增模块替换已有测试工具链。Dexie版本由package-lock固定。
