# M1 核心 API 与集成约定

日期：2026-11-03。入口 `src/core/index.ts`；无React/DOM播放器/存储依赖。构建输出 `dist/core/index.js` 与类型声明，可供之后Vite应用引用。

## 模型

`Configuration`包含channels/programs/schedules/settings，`settings.schemaVersion=1`。`parseConfiguration(unknown)`返回独立副本，或抛出带字段路径的`ConfigurationError`。频道编号唯一、排序按sortOrder/number/id稳定排列；排片通过ID关联；同频道不重叠、区间左闭右开、不跨午夜、允许endMinute=1440。未知媒体时长省略；不能用排片长度代替媒体时长。仅接受无用户名密码的HTTP(S)来源URL，UI对BV/视频ID的粘贴解析留给后续来源适配；类型和URL校验不证明资源授权、CORS或可播放。

这里的schema是内存对象契约，不是已实现IndexedDB或JSON导入。当前skinId保持PRD第一套皮肤基线，并未开发皮肤。

`sourcePolicy(type)`记录M0接受的能力策略，不是逐源探测结果。B站只有初始定位能力，不支持外部运行期音量、状态或ended；集成层必须提示受限，不能因为调度器产生resync意图就假定平台支持。

## 时钟与求值

`Clock.now()`返回绝对epoch毫秒；生产默认Date.now，测试注入FakeTime。`broadcastDay`显式使用Intl的Asia/Shanghai，不使用浏览器本地日期；当前支持2000–2099现代播出日期，以避免把历史上海夏令时当作现代24小时节目单。非法日期抛出RangeError。

`evaluateSchedule(config,channelId,epoch)`是无副作用函数，要求输入已验证。返回：

- AIR：本日排片、节目、绝对起止时间、毫秒精度offsetSeconds及occurrence。
- NO_SIGNAL：NO_CHANNEL/GAP/MEDIA_ENDED；附下个边界时间。

occurrence由北京时间日期、频道ID、排片ID共同确定；相同节目复用到相邻排片仍是不同播出实例。次日重新从头计算。M1的1800.125秒测试只证明数学结果，不能替代延期的长源实测。

## 生命周期

```ts
const scheduler = new Scheduler(config);
const unbind = bindBrowserLifecycle(scheduler, document, window);
const unsubscribe = scheduler.subscribe(update => {
  // 未来播放协调层按数组顺序消费commands：stop先于start。
  // update.state.kind === 'AIR'只表示“应播出”，不是播放器已PLAYING。
});
scheduler.powerOn();
scheduler.selectChannel('channel-id');
scheduler.nextChannel(-1);
scheduler.powerOff();
// 组件卸载顺序：先取消外部事件，再让播放器消费者收到最后的stop。
unbind();
scheduler.dispose();
unsubscribe();
```

Scheduler输出start/stop/resync意图；消费层订阅者应仅派发播放器操作，不在同步回调中再次修改scheduler，以免重入交错更新。返回的Update和subscribe更新是同一条逻辑更新的副本，选一种消费方式，不重复执行。订阅不立即回放现有状态，应先订阅再开机。

- 开机/切台/配置替换：求当前时刻；更换播出实例先stop旧token、再start新token。
- 关机：同步发出stop、取消调度定时器；是否真实断流由播放器destroy实现，M1本身不下载视频。
- 定时：单个可取消setTimeout，最多250ms重新求值，临近边界缩短延时；不累加秒数。浏览器节流可能延迟触发，恢复后直接求当前节目，不补播错过的节目。
- visible、online、pageshow：重评估并resync；超过1秒未运行或时钟回拨也触发重新校准。
- 慢加载：Adapter回调`ready(token)`，接收最新目标，不能使用原始load时捕获的偏移。
- 实际元数据：`mediaDuration(token,seconds)`采用实际时长，当前偏移已超时则stop/no-signal。
- 提前结束：`mediaEnded(token)`阻止本次排片再次起播；关机重开、调台、无关配置变更也不重放；次日清理。
- 旧回调：已经切台、关机或dispose的token返回null；旧定时回调也不能恢复播放。
- 配置修改：验证通过后原子替换。当前配置会话重新发出stop/start，确保新来源/排片生效；未更改的排片保留ended/时长观测。无效配置不影响当前会话。

## 后续集成职责

M1未实现PlayerAdapter或播放协调器：异步destroy/load顺序、取消旧请求、autoplay拒播提示、缓冲后校准节流/限次、播放器实际状态与音量、B站能力提示等必须由后续协调层落实；M0已有部分验证算法供参考。本阶段只测试意图顺序与token隔离，不宣称完整媒体集成或真实设备睡眠通过。

测试框架采用Node原生node:test，与M0保持一致；TypeScript先做完整编译再测JS产物，不使用transpile跳过类型检查。Vitest/React Testing Library在实际UI集成需要时再引入。本轮不新增React界面、Dexie、Zustand、后端或视频代理。
