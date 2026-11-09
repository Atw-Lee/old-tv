# 复古电视

M4：真实播放器、复古电视场景、本地频道排片管理与Docker交付。等待用户验收；未发布云服务器。

- [Docker部署说明](docs/DEPLOYMENT.md)；镜像与校验和位于 `release/`。
- [M4测试报告](docs/m4-test-report.md)；[播放器决策](docs/m4-decisions.md)。

```sh
npm ci --registry=https://registry.npmjs.org
npm run dev
```

打开 http://127.0.0.1:5190/ ，点击机身「调校 · SET」。依次创建频道、节目资源、每日排片，然后开机。没有预置演示频道。节目以北京时间每日循环，空档或短视频耗尽显示无信号，关机释放播放器。

优先使用支持CORS和定位的合法VOD HLS。YouTube使用官方API，本轮网络连接超时；B站为受限嵌入，不能通过电视旋钮控制音量或获取提前结束事件，本轮未证实平台实际播放。长源1800秒验证继续按已批准例外延期。

设置存储在此地址的浏览器IndexedDB。换域名、浏览器或端口前请导出JSON备份，之后导入。容器不保存用户配置，不代理视频。

界面采用立体CSS电视机、旧水泥墙与窗景。两种控制布局的屏幕基准尺寸均为640×480；小窗口整体缩放，页面不滚动。管理使用紧凑的本地组件，Drawer 和 Scroll Area 取自 shadcn/ui 官方 New York 注册表，内容内部滚动。新增/编辑点「完成」进入草稿，最后点抽屉右下角「保存」才更新电视；导入/导出合并在左下角。未保存关闭会提示放弃确认。

本轮 UI 验证见 [调校改版报告](docs/ui-drawer-update.md)。按用户要求暂不重建 Docker 镜像，现有 release 镜像不包含本次 UI 更新。

```sh
npm run lint
npm run typecheck
npm test
npm run build
# 保持dev运行：
node tests/playback-browser.mjs chrome
node tests/playback-browser.mjs msedge
node tests/management-m4-browser.mjs chrome
node tests/appearance-browser.mjs
node tests/platform-browser.mjs chrome
# 运行Safari官方驱动5192后：
M4_RUN=safari-new-run node tests/playback-safari.mjs
```

构建输出 `web-dist/`。浏览器测试默认覆盖其同名证据目录，复测请先保留原证据，支持M4_RUN的脚本可指定新目录。旧M2/M3脚本是历史测试，不是当前界面的回归入口。

## M1：数据模型与时钟调度核心

正式核心位于 `src/core/`，测试位于 `tests/`；根目录构建输出 `dist/core/`。无业务页面或播放器集成，`AIR`表示当前应播节目，不代表媒体已开始播放。

```sh
npm ci --registry=https://registry.npmjs.org
npm run lint
npm run typecheck
npm test
npm run build
```

Node 20.19.5 / npm 10.8.2。使用M0已采用的固定TypeScript/ESLint版本及根目录package-lock；纯调度核心无运行时第三方依赖；根目录现包含React及Dexie等界面/存储依赖。M2已增加根目录Vite界面；M0独立实验页仍在下方的m0工程。

- [M1计划与验收项](docs/m1-plan.md)
- [核心API与集成约定](docs/m1-core-api.md)
- [M1测试报告与已知限制](docs/m1-test-report.md)

B站受限策略和1800秒长源延期继续有效。电视皮肤已在M2实现；M3已增加频道管理、排片工作台、IndexedDB和JSON备份；未建设后端。

## M0：保留的播放验证工程

最小工程位于 `m0/`，原始媒体证据和报告保留。

## 运行

Node.js 20.19.5（建议相同或兼容版本），npm 10.8.2。依赖精确版本见 `m0/package-lock.json`。

```sh
cd m0
npm ci --registry=https://registry.npmjs.org
npm run dev
```

打开 http://127.0.0.1:5178 。若全局 npm 镜像不可达，仅对本次安装指定官方 registry；不必更改全局配置。远端视频始终由浏览器请求，无 Vite 视频代理。

- 选择来源，HLS 填公开且授权的 VOD URL；B站填 BV；YouTube 填视频 ID。
- 初始默认静音；点击“加载 / 开机”。观察真实 `playing`、`seeked`、`ended` 和画面。
- “定位”仅为 M0 调试控制，不是正式电视模式交互。
- 固定时段实验只有每日北京时间 09:00–10:00；勾选后设置模拟时钟，再开机。
- “销毁 / 关机”释放播放器。浏览器 DevTools Network 至少观察 30 秒；区分新请求与在途请求。
- 导出日志保存当前环境、事件与 Resource Timing。Resource Timing 不能证明跨源 iframe 的所有请求，验收以浏览器自动化网络记录补充。
- `?provider=youtube&muted=0&autostart=1` 用于无手势自动播放实验。省略 provider 使用 HLS；不覆盖浏览器策略。
- `.env.example` 仅提供公开 URL 占位。所有 VITE_* 值都对浏览器公开，禁止放凭证。

## 故障夹具与浏览器测试

手工测试 404/CORS 时另开终端：

```sh
cd m0
node tests/fixtures.mjs
```

夹具只在 `127.0.0.1:5179` 返回故意 404 或缺少 CORS 的文本，不访问远端、不提供视频、不属于业务后端。404 按钮使用该端口；CORS 测试输入 `http://127.0.0.1:5179/cors.m3u8`；无效清单按钮使用 Vite 静态夹具。

自动化测试前关闭手工夹具（脚本自行启停），保持 Vite 运行：

```sh
cd m0
node tests/browser.mjs chrome
node tests/browser.mjs msedge
node tests/autoplay.mjs
```

使用本机已安装的正式 Chrome/Edge，隔离 profile、默认自动播放策略、headless 模式，不用 Playwright Chromium 冒充品牌浏览器。每次运行会覆盖同名证据目录，复测前请保留原报告对应文件。截图、媒体事件、网络记录写入 `docs/evidence/`；脚本的 `execution: COMPLETED` **不是**验收 PASS，必须核对实际值和完整判据。Safari 仅以官方 Safari/驱动测试；WebKit 测试不能代替 Safari。

可通过 `M0_HLS_URL` 为浏览器脚本提供合格公开长源；短源不能通过 1800 秒门槛，不拼接/循环伪造时长。

## 工程检查

```sh
cd m0
npm run lint
npm run typecheck
npm test
npm run build
```

单元测试只检验北京时间、每日循环、区间端点、毫秒偏移和提前结束判定，不替代媒体实测。构建产物是静态文件。

## 交付文档

- `docs/m0-plan.md`：一致性核对、实施与测试计划。
- `docs/m0-test-report.md`：20 项验收与证据。
- `docs/source-capability-matrix.md`：来源能力矩阵。
- `docs/m0-decisions.md`：门槛、风险与后续决策。

M0 通过与否以报告为准；未经用户验收确认不进入 M1。

## 缓冲后时钟校准回归

固定时段实验现在在 seek完成/可播放/播放事件后重新核对当前时钟，并每250ms观察一次。偏差超过0.5秒才纠正；每次纠正至少间隔1秒，10秒内最多3次，未收敛时显示同步中。暂停或自动播放被拒时不反复seek，也不覆盖用户手势恢复状态；关机时销毁校准监听和计时器。

固定时段模式下，手动调试seek会被时钟校准纠正。测试真实ended可关闭固定时段实验；测试时段内素材耗尽则把模拟时钟设到素材尾部附近。

```sh
cd m0
node tests/sync-browser.mjs chrome
node tests/sync-browser.mjs msedge
```

该脚本用公开Mux短片验证普通起播、限速重开机、限速网络恢复、边界、加载中关机、缓冲期间素材耗尽及31秒断流；不替代已批准延期的1800秒测试。限速为700ms延迟、250000字节/秒下载、禁用缓存。稳定性以校准完成后连续3次真实播放采样误差≤2秒判断，设有超时；不是只检查函数返回。

### Safari补测复现

先启用Safari“开发→允许远程自动化”（用户本轮已开启），在独立终端运行 `/usr/bin/safaridriver -p 5182`；确认Vite在5178运行后，在m0目录执行 `node tests/safari.mjs`。脚本创建官方Safari会话，默认写入 `docs/evidence/safari-new-run/`，可用M0_RUN指定新目录，避免覆盖历史证据。无自动播放安全策略覆盖；DOM点击不作为可信用户手势证明。

最新有效证据为 `docs/evidence/safari-final/reviewed-results.json`。原生Resource Timing不足以证明分片断流，故该项BLOCKED；短片耗尽不能作为整点边界证明，Safari该子项NOT RUN。真实后台恢复已有hidden/visible和连续同步采样证据。

调校的「手册」页按 HLS、YouTube、Bilibili 提供添加说明。B 站可填写实际时长（秒）以按北京时间切换或循环，不能感知嵌入页内的暂停或缓冲。YouTube 时长查询无需 API Key。新链接会先显示加载提示，再显示撑满表单宽度、高 200px 的官方播放器，读到时长后仍可继续预览，离开表单时释放；当前标签页已读取的结果可以复用。只有 B 站显示手工时长输入框。
