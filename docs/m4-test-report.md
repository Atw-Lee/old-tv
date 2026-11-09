# M4 测试报告

日期：2026-11-04。交付：真实播放器集成、管理回归、视觉调整与Docker镜像；等待用户验收，未部署云服务器。

## 结论与范围

HLS在Chrome/Edge完成实际播放、定位、切台、关机31秒无新请求及恢复闭环；Safari通过原生播放与定位、音量、销毁重开、短源耗尽和弹窗检查。Docker生产页面通过真实UI创建两个频道、排片、播放/切台及刷新备份。67项单元测试与lint/typecheck/build通过。

本轮不是全浏览器、全平台全绿：YouTube/B站实际播放受限，Safari原生分片网络证据缺失，真实后台页签测试未成功建立hidden条件，Safari坐标点击存在自动化复现缺口。不得用历史M0结果补成当前PASS。长源1800秒继续按用户批准延期，不阻止交付镜像。尚不声称完整M4验收通过。

## 环境与方法

macOS 26.6.2 (25G83)，Chrome156.0.8078.79，Edge156.0.4314.58，官方Safari26.6.2；详见各证据目录environment.json及[OS](evidence/m4/os.txt)。Chrome/Edge是本机品牌浏览器隔离会话，不是Playwright Chromium替代；Safari使用官方safaridriver。

HLS源：`https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`（Mux公开测试短片）。YouTube官方示例`M7lc1UVf-VE`，B站`BV1B7411m7LV`，仅官方嵌入。本轮无私有凭证。浏览器时序测试在隔离会话偏移Date.now模拟北京时间09点，实际媒体、网络和计时器运行；不是等待真实次日。关机网络观测真实31秒。时间定位取连续3次真实媒体采样，误差目标≤2秒并核对帧/时间推进。

请求路径见chrome/msedge/container/platforms-*/network.json：HLS直接到test-streams.mux.dev，平台页面到官方域名；本地应用只有静态资源，无视频代理。构建无API密钥。测试脚本及原始截图/日志均保留。

## 最终执行明细

以下逐项列出脚本结果。PASS仅针对对应浏览器、条件、源；表中子项不推广到未测浏览器。原始失败历史见后文。

### Chrome HLS

复现入口：`tests/playback-browser.mjs chrome`；[原始逐项结果](evidence/m4/chrome/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| hls-real-play-latest-time-volume-and-direct-network | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| slot-boundary-replaces-old-player | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| channel-switch-uses-current-clock | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| off-stops-requests-31seconds-and-reopen-seeks-now | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| buffering-network-recovery-resynchronizes | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| short-source-exhausted-shows-no-signal | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| gap-and-midnight-daily-cycle | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| injected-autoplay-block-recovery | PASS | 注入NotAllowedError验证恢复分支；不冒充原生策略拒播。 |
| loading-power-off-and-no-stale-events | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Edge HLS

复现入口：`tests/playback-browser.mjs msedge`；[原始逐项结果](evidence/m4/msedge/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| hls-real-play-latest-time-volume-and-direct-network | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| slot-boundary-replaces-old-player | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| channel-switch-uses-current-clock | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| off-stops-requests-31seconds-and-reopen-seeks-now | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| buffering-network-recovery-resynchronizes | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| short-source-exhausted-shows-no-signal | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| gap-and-midnight-daily-cycle | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| injected-autoplay-block-recovery | PASS | 注入NotAllowedError验证恢复分支；不冒充原生策略拒播。 |
| loading-power-off-and-no-stale-events | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Chrome管理

复现入口：`tests/management-m4-browser.mjs chrome`；[原始逐项结果](evidence/m4/management-chrome/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| single-tv-empty-state-and-modal-keyboard | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| channel-create-edit-reorder-disable-and-duplicate | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| program-create-platform-policy-edit | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| schedule-minute-input-overlap-midnight-and-shared-program | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| timeline-native-drag-move-resize-and-conflict-rollback | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| preferences-refresh-retains-off-state | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| export-backup-and-invalid-import-no-mutation | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| delete-channel-program-cascades-and-import-roundtrip | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| indexeddb-write-failure-retains-saved-data-and-retry | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| cross-tab-conflict-prevents-lost-update | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| mobile-dialog-layout-and-media-network-boundary | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| knob-native-drag-wheel-power-and-reduced-motion | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| indexeddb-read-failure-blocks-editing-and-recovers | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Chrome视觉

复现入口：`tests/appearance-browser.mjs`；[原始逐项结果](evidence/m4/appearance/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| fixed-screen-no-scroll-1440x1000 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| fixed-screen-no-scroll-1280x900 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| fixed-screen-no-scroll-980x1100 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| fixed-screen-no-scroll-390x844 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| fixed-screen-no-scroll-800x500 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| fixed-dialog-radix-focus | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Safari原生HLS（键盘操作）

复现入口：`M4_RUN=safari-new-run node tests/playback-safari.mjs`；[原始逐项结果](evidence/m4/safari-keyboard/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| native-hls-start-and-sync | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| native-volume | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| off-release-and-reopen-latest-time | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| expired-short-source-no-signal | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| native-modal-fixed-height-and-persistence | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| native-hls-segment-stop-network-observation | NOT RUN | Safari WebDriver Resource Timing does not expose all native segment requests; DOM removal is not network proof. M0 manual result is historical, not reused as M4 evidence. |

### Chrome Docker生产页面

复现入口：`tests/container-browser.mjs`；[原始逐项结果](evidence/m4/container/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| docker-ui-create-two-channels-resource-and-schedules | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| docker-real-hls-and-channel-switch | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| docker-refresh-and-backup-browser-direct-media | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Chrome恢复与错误夹具

复现入口：`tests/recovery-m4-browser.mjs`；[原始逐项结果](evidence/m4/recovery-final/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| real-background-tab-return | FAIL | 原始脚本FAIL：events=[]，未建立真实hidden/visible条件；评审归类BLOCKED，不能推断恢复功能通过或失败。 |
| http-404 | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| invalid-playlist | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| live-rejected | PASS | 实际值见链接JSON及同目录截图/网络日志。 |

### Chrome平台嵌入

复现入口：`tests/platform-browser.mjs chrome`；[原始逐项结果](evidence/m4/platforms-chrome/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| youtube-integration | BLOCKED | YouTube API连接超时，请检查网络重新连接 |
| bilibili-limited-volume-ui | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| bilibili-integration | BLOCKED | B站受限来源：音量请使用视频内控件或系统音量；无法获取播放状态及提前结束通知。 |

### Edge平台嵌入

复现入口：`tests/platform-browser.mjs msedge`；[原始逐项结果](evidence/m4/platforms-msedge/results.json)。

| 测试 | 结果 | 条件/说明 |
|---|---|---|
| youtube-integration | BLOCKED | YouTube API连接超时，请检查网络重新连接 |
| bilibili-limited-volume-ui | PASS | 实际值见链接JSON及同目录截图/网络日志。 |
| bilibili-integration | BLOCKED | B站受限来源：音量请使用视频内控件或系统音量；无法获取播放状态及提前结束通知。 |

## 工程与部署验证

| 项目 | 结果 | 证据 |
|---|---|---|
| 单元测试67项 | PASS | [unit-tests.txt](evidence/m4/unit-tests.txt) |
| lint（含最终新增脚本） | PASS | [lint-final.txt](evidence/m4/lint-final.txt) |
| TypeScript | PASS | [typecheck.txt](evidence/m4/typecheck.txt) |
| 生产构建 | PASS | [build.txt](evidence/m4/build.txt)；JS约1.05MB/333KB gzip，存在分包体积警告，不是构建失败 |
| amd64镜像构建 | PASS | [构建日志](evidence/m4/docker-amd64-final-build.txt) |
| arm64镜像构建 | PASS | [构建日志](evidence/m4/docker-arm64-build.txt) |
| 两种架构容器启动/HTTP/健康检查 | PASS | [amd64健康](evidence/m4/docker-health.json)、[arm64健康](evidence/m4/docker-arm64-health.json)、对应docker-*-http.txt |
| amd64生产镜像UI及真实媒体闭环 | PASS | 上方container三项 |
| arm64实际浏览器端到端 | NOT RUN | 已验证静态服务启动，没有重复完整UI流程 |
| 用户服务器部署/正式域名兼容性 | NOT RUN | 用户要求自行部署，已交付镜像与说明 |

镜像标识见[docker-images.json](evidence/m4/docker-images.json)，发布包校验和见[SHA256SUMS](../release/SHA256SUMS)。

## 明确的证据缺口与影响

| 项目 | 状态 | 影响及解除条件 |
|---|---|---|
| YouTube实际播放/seek/volume/ended/销毁断流 | BLOCKED | Chrome和Edge均API连接超时；不能宣称M4完整集成已通过。需可达官方API与媒体的观看网络复测 |
| B站实际播放与起点定位 | BLOCKED | 官方播放器出现但进度未推进；受限提示/禁用音量已验证，不代表媒体可播放 |
| B站外部音量/状态/提前ended | BLOCKED | 沿用已接受“不支持”策略，产品显示受限提示；不构造非官方消息API |
| 平台成功播放后的31秒销毁观测 | NOT RUN | 当前未成功播放，不能以空iframe移除代替断流证据 |
| Safari原生分片关机网络观测 | NOT RUN | WebDriver/Resource Timing不足以观察全部原生媒体请求；需要该版界面Network人工观察≥30秒 |
| 真实后台页签恢复 | BLOCKED | 两次headful切页都无hidden/visible事件，原始断言FAIL保留；需真实隐藏/恢复观测。网络恢复与时序校准已通过，不替代此项 |
| Safari鼠标坐标点击电源 | BLOCKED | WebDriver click调用后电源仍false；原生键盘操作成功。尚未证明手工鼠标也失败，需人工或更可靠坐标操作复核 |
| 1800秒真实长源定位 | BLOCKED | 用户已批准延期；不再寻找长源，不用短源拼接冒充 |
| 真实设备睡眠/唤醒、长期播放、所有平台原生自动播放策略矩阵 | NOT RUN | 本轮有限时长回归与注入拒播只覆盖对应分支 |
| M4实际自然ended事件（而非偏移耗尽） | NOT RUN | 当前浏览器断言验证短源偏移超过时长；不能等同于自然播放到尾。M0证据仅作历史参考 |

## 初始失败与复测说明

- `chrome-native-hls-buffering/`：原生HLS路径持续缓冲；改用hls.js后chrome/msedge各9项PASS。
- `chrome-boundary-observation-initial/`：测试在旧实例尚未移除时读取状态；增加等待旧video断开再采样。`chrome-buffering-initial/`、`chrome-dependency-reload/`、`chrome-server-not-started/`保留初始调试/环境记录，不计作通过。
- `management-chrome-error-message-initial/`：弹窗内保存错误提示缺少可识别前缀；增加“保存失败”后13项回归通过。
- `safari/`：原始总帧统计增长断言失败；后续改用requestVideoFrameCallback并记录实际呈现帧，`safari-keyboard/`连续采样时间14.619→15.875→16.884，帧回调0→9→60，偏差均小于0.5秒，截图确认真实画面。
- `safari-frame-callback/`、`safari-final/`：坐标点击未开启电源，后续键盘操作通过；没有把坐标点击问题写成已修复。`safari-launch-initial/`保留启动阻塞。
- `recovery/`与`recovery-final/`：真实后台前提未建立，原始FAIL不删除；评审列BLOCKED以区别产品逻辑失败与无法构造测试环境。

## 交付与验收建议

[部署说明](DEPLOYMENT.md)、[技术决策](m4-decisions.md)、[来源能力矩阵](source-capability-matrix.md)及release镜像已交付。推荐先按HLS主路径验收核心功能与视觉，平台和Safari专项缺口按上表明确保留；不自动视为用户接受例外。M4等待用户验收，不开启下一阶段。

## 用户人工复测补充（2026-11-04）

用户针对此前编号1–5逐项反馈：“1 正常 / 2 正常 / 3 正常 / 4 正常 / 5 正常”。该反馈为人工验收证据，不是新增自动化日志；未附截图、网络导出或具体浏览器版本。上方自动化结果及缺口是此次反馈前的历史快照，以下人工复测更新相应结论：

| 编号 | 人工测试项 | 结果 | 证据与范围 |
|---|---|---|---|
| 1 | Safari鼠标开关电源、打开设置 | PASS（人工） | 用户反馈“1 正常”；解除手动操作是否正常的疑问，自动化坐标点击失败历史保留 |
| 2 | Safari播放HLS后关机，Network观察至少30秒无持续新增分片 | PASS（人工） | 用户按所列步骤反馈“2 正常”；未提供请求明细，不伪造网络日志 |
| 3 | 真实后台标签页停留约60秒后恢复、跟上当前节目时间 | PASS（人工） | 用户反馈“3 正常”；具体浏览器未说明，不扩展为Chrome/Edge/Safari逐个通过，也不声称测得精确偏差 |
| 4 | YouTube实际画面与持续播放 | PASS（人工） | 用户反馈“4 正常”；此前Chrome排片检查提供上下文，但未明确本次浏览器版本；不据此补齐音量、自然ended、销毁31秒和全部API测试 |
| 5 | B站实际播放、进度增长与排片起点观察 | PASS（人工） | 用户反馈“5 正常”；无精确起点采样，仍按官方iframe受限来源处理，不意味着外部音量/状态/ended受支持 |

上述5项不再作为用户当前环境下的未确认故障。自动化环境中的YouTube超时/B站不推进仍保留，以说明网络与环境差异。剩余专项范围仍按前表保留：1800秒长源已批准延期；自然ended、设备睡眠唤醒、平台完整控制与销毁矩阵、正式云域名验证等未被本次反馈覆盖。

该反馈确认5项人工复测结果，不擅自等同于M4整体验收或下一阶段授权。
