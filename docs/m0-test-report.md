# M0 视频播放技术可行性验证报告

日期：2026-11-02（Asia/Shanghai）；浏览器原始日志使用 UTC（+8 小时为北京时间）。

**结论：M0已获用户整体验收通过；用户明确要求暂不开始M1。** 最新20项为17 PASS、0 FAIL、3 BLOCKED（M0-02/14已批准延期，M0-08已接受为B站能力限制）。Safari断流由用户手动确认：播放时分片请求可见，关机后保持页面打开至少30秒未持续新增请求。无剩余未接受的M0技术阻塞；用户已整体验收通过；M1未授权、未启动。初次失败与后续复测证据均保留。

> **验收政策更新（2026-11-02）**：用户已批准长源测试延期，M0-02的1800秒部分和M0-14保留BLOCKED（已批准延期），本轮停止寻找资源；长源缺口不再单独否决本轮验收。该例外本身不改变实测状态；同步问题后续经修复复测更新，其他缺口仍有效，当时尚未整体验收；现已验收通过，仍未授权进入M1。详见 [决策记录](m0-decisions.md)。

## 范围、环境与证据效力

已完整阅读四份基线文件；一致性检查与先行方案见 [m0-plan.md](m0-plan.md)。仅实现 `m0/` 实验页和测试脚本，没有电视皮肤、频道/排片业务、数据库、账号、视频代理或转码。

工作目录初始不是 Git 仓库，Commit：N/A；交付源码哈希见 [source-sha256-safari.json](evidence/source-sha256-safari.json)。运行说明见 [README](../README.md)。

| 代号 | 实际环境 | 证据 |
|---|---|---|
| C | macOS 26.6.2 / 正式 Google Chrome 156（精确补丁见 JSON），隔离 profile，headless | [环境](evidence/chrome-final/environment.json) |
| E | 同 OS / 正式 Microsoft Edge 149.0.4022.80，隔离 profile，headless | [环境](evidence/msedge-final/environment.json) |
| CH | 同 OS / 正式 Chrome 156，有界面独立窗口 | [环境](evidence/chrome-recovery/environment.json)、[恢复尝试](evidence/chrome-recovery/results.json) |
| S | Safari 26.6.2（21624.5.1.11.3）官方 safaridriver | [成功会话及环境](evidence/safari-final/environment.json)（历史拒绝记录保留） |

没有用 Playwright Chromium/WebKit 冒充品牌浏览器。自动播放测试没有传入放宽策略参数，但 headless/自动化配置的行为不能代表普通用户配置。扬声器听感、真实睡眠唤醒和隐私模式组合未测试。

原始脚本的 `execution: COMPLETED` 只表示执行完成，不等于验收 PASS；本报告依据实际事件、值与截图逐项裁定。`youtube-controls/results.json` 的脚本标签也以此报告复核为准，例如 seek 的首次返回仍为缓冲，最终 PASS 依据后续 state=1 和真实时间推进。

### 来源与合法性范围

| 代号 | 来源 | 实际时长/依据 | 用途 |
|---|---|---|---|
| A | `https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8` | VOD / ENDLIST，约 1800.001 秒，变体尾帧略有差异 | Apple 官方开发者测试素材；控制/边界/断流，不可承担 31 分钟门槛 |
| M | `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` | VOD / ENDLIST，634.584 秒，尾部变体约 634.600 | Mux/hls.js 官方测试列表的 Big Buck Bunny；短时核心闭环 |
| B | `BV1B7411m7LV` | B站官方外链文档示例；切换流量网络后C/E播放成功，实测时长590秒 | 仅官方 iframe，`t=30`，不解析站内视频地址 |
| Y | `M7lc1UVf-VE` | YouTube 官方 IFrame API 示例；API 时长约 1343.661–1344 秒 | 官方嵌入、seek/音量/结束/销毁/自动播放 |

来源用途依据：[Apple Streaming Examples](https://developer.apple.com/streaming/examples/)、[Mux Test Streams](https://test-streams.mux.dev/)、[B站官方参数](https://player.bilibili.com/)、[YouTube 官方 API](https://developers.google.com/youtube/iframe_api_reference)。公开测试用途不等于允许将素材再发布为正式内容频道。

已核验 Mux 列表 8 个清单，均短于 31 分钟；Apple 其他候选也不合格或不可用：[Mux 候选](evidence/source-candidates.json)、[Apple 候选](evidence/apple-candidates.json)。用户明确回复没有可供测试的视频。未拼接、循环或修改清单伪造时长。候选清单探测是文本资源核验，不是媒体下载；未保存视频片段。

## 20 项验收结果

下表每行的 C/E/A/M/B/Y 指代上述精确环境与公开源；所有测试日期均为 2026-11-02。PASS 仅覆盖列出的实际环境与条件。

| ID | 状态 | 环境/源/步骤与判据 | 实际结果及证据 |
|---|---|---|---|
| M0-01 | PASS | C/E，A；C，M。点击加载，观察媒体事件、画面、音视频解码与进度 | E/A 时间 0.011→1.195 秒，帧数 5→38，音频解码字节 411→1125；C/M 正常画面/播放。扬声器听感 NOT RUN。Apple 在部分后续 C 运行发生 CORS/网络失败，不能宣称稳定兼容。[E 数据](evidence/msedge-final/checks.json)、[画面](evidence/msedge-final/hls-playing.png)、[M 数据](evidence/chrome-mux/results.json) |
| M0-02 | BLOCKED | C/E，A/M；0 秒与 1800 秒定位、素材≥1860 秒 | 0 秒 seeked 正常；1800 秒被时长保护阻止。A 只有约1800秒，M约635秒。缺长源，不能视为 FAIL 或用片尾通过。[E 数据](evidence/msedge-final/checks.json)、[候选核验](evidence/source-candidates.json) |
| M0-03 | PASS | E/A；C/M。音量 .2、解除静音、跳至真实片尾观察 ended | E 实际 volume=.2/muted=false，真实 ended=1800.095777；C/M ended=634.599999，随后销毁。[E 事件](evidence/msedge-final/hls-final.json)、[M 事件](evidence/chrome-mux/events.json) |
| M0-04 | PASS | C/E，本机夹具：HTTP404、缺 CORS、非 M3U8 正文；不崩溃 | 分别为 `HTTP_404/code404`、`CORS_OR_NETWORK/code0`、`INVALID_MANIFEST/code200`。JS 不能单凭 code0 区分 CORS 和断网，CORS 结论来自浏览器控制台与已知夹具；未绕过跨域限制。[错误日志](evidence/chrome-final/errors.json)、[浏览器网络/控制台](evidence/chrome-final/network.json)、[截图](evidence/chrome-final/errors.png) |
| M0-05 | PASS | E/A、C/M；实际播放后销毁，观察≥30秒 | E/A 31.002秒，0 个销毁后新片段请求；C/M 独立31秒结果见链接。清除video.src并load，hls.destroy；既有在途请求允许结束/中断，不作为新增流量。[E 窗口](evidence/msedge-final/checks.json)、[E 网络](evidence/msedge-final/network.json)、[M 窗口](evidence/chrome-mux/results.json) |
| M0-06 | PASS | C/E，B；用户切换流量网络后官方iframe复测 | C播放进度30.157→32.093秒、帧158→216；E30.293→31.857秒、帧163→209，均640像素画面、readyState4、非暂停。上次连接关闭记录保留为历史网络条件结果。[C复测](evidence/bilibili-mobile-chrome/results.json)、[E复测](evidence/bilibili-mobile-msedge/results.json)、[画面](evidence/bilibili-mobile-chrome/t30.png) |
| M0-07 | PASS | C/E，B；官方t=30参数，实际媒体起点误差目标≤2秒 | 首次观察C30.156708秒、E30.293227秒，均符合目标；加载至首次采样约2.46/2.41秒。仅证明初始t参数，不代表运行期间seekTo可用。[C样本](evidence/bilibili-mobile-chrome/samples.json)、[E样本](evidence/bilibili-mobile-msedge/samples.json) |
| M0-08 | BLOCKED | C/E，B；外部音量/ended/状态/控制分项评估 | 用户已接受本项为能力限制，暂按不支持并在后续前端提示，本轮不再追查接口；原始BLOCKED不改为PASS。网络前置条件已解除。父页直接访问iframe文档报SecurityError；当前页面音量滑块设0.2后，内嵌视频仍volume=1。官方参数文档没有提供可供本方案验证的完整外部控制契约；结束/状态订阅、运行期控制仍BLOCKED，不能据当前未实现控制推导平台永久不支持。测试工具的跨域观测不是应用可用API。[C控制观察](evidence/bilibili-mobile-chrome/results.json)、[矩阵](source-capability-matrix.md) |
| M0-09 | PASS | C/E，B；实际播放后移除iframe，观察≥30秒 | C31.005秒、E31.040秒窗口内均0个新请求，iframe数0；本次卸载前有实际播放/帧增长证据。[C窗口](evidence/bilibili-mobile-chrome/results.json)、[E窗口](evidence/bilibili-mobile-msedge/results.json)、[网络](evidence/bilibili-mobile-chrome/network.json) |
| M0-10 | PASS | C/E，Y；官方IFrame API | `yt-ready`、state=1、视频画面与时间递增均实际观测。[C截图](evidence/chrome-final/youtube.png)、[E日志](evidence/msedge-final/youtube.json)、[控制日志](evidence/youtube-controls/events.json) |
| M0-11 | PASS | C，Y；官方seekTo(60,true)，目标误差≤2秒 | 先缓冲state3，再state1；播放起点60.184秒，误差约0.184秒，后续60.698秒。不是仅依据seekTo返回。[事件](evidence/youtube-controls/events.json)、[截图](evidence/youtube-controls/playing.png) |
| M0-12 | PASS | C，Y；音量/静音、状态、结束和destroy | 音量命令立即读值仍50，异步观察后volume=20/muted=false；state0→NO_SIGNAL；destroy后31.004秒0新媒体请求且iframe=0。独立stopVideo调用 NOT RUN，此项通过“结束+销毁”路径。[结果](evidence/youtube-controls/results.json)、[事件](evidence/youtube-controls/events.json)、[网络](evidence/youtube-controls/network.json) |
| M0-13 | PASS | C，Y；全新context分别测试有/无手势×静音/有声 | 4组合均实测state1；API实际muted分别true/false，未观察到拒播。拒播后的点击恢复路径 NOT RUN（没有触发拒播），不能承诺普通用户无手势有声必播。HLS/M的4组合亦播放。[8组合结果](evidence/autoplay-final/results.json) |
| M0-14 | BLOCKED | E，A；固定09:00开始，模拟09:30开机，真实偏移1800秒 | 元数据确认时长不足，进入NO_SIGNAL，没有从头冒充播放。算法单元测试1800.125秒通过，不替代本项媒体测试。[E结果](evidence/msedge-final/checks.json)、[事件](evidence/msedge-final/hls-final.json) |
| M0-15 | PASS | E/A、C/M；播放中将注入时钟设09:59:59，到10:00撤销媒体 | 边界日志延迟 E约31.0ms、C约47.3ms，均≤1秒；销毁并进入NO_SIGNAL。固定实验下一时段为空档，未测下一媒体首显延迟。[E事件](evidence/msedge-final/hls-final.json)、[M事件](evidence/chrome-mux/events.json) |
| M0-16 | PASS | E/A、C/M；固定一小时时段，短素材跳至真实尾部前2秒 | 收到真实ended后NO_SIGNAL，video数0；额外观察2秒未自动循环。并非合成ended事件，也未等待完整30分钟。[E结果](evidence/msedge-final/checks.json)、[M结果](evidence/chrome-mux/results.json) |
| M0-17 | PASS | C/E，M；普通起播、限速重开机；缓冲后连续3次播放样本误差≤2秒 | 修复后：普通起播最大偏差C约0.181秒/E约0.122秒；限速重开机C约0.081秒/E约0.077秒。700ms延迟、250000字节/秒下载、禁用缓存；缓冲完成后实际seek并收敛，未用函数返回冒充播放。首次约2.18秒失败保留于历史记录。[C复测](evidence/sync-fix-verified-chrome/results.json)、[E复测](evidence/sync-fix-verified-msedge/results.json)、[初次失败](evidence/chrome-mux/events.json) |
| M0-18 | PASS | E/A网络恢复；S/M真实标签页后台约6秒后返回 | Safari记录hidden→visible→recalibrate，恢复后三次播放采样最大误差0.346秒；真实睡眠NOT RUN。[Safari结果](evidence/safari-final/results.json)、[恢复事件](evidence/safari-final/real-tab-background.json) |
| M0-19 | PASS | C/E，A/M/Y；浏览器请求发起日志 | HLS清单/片段直接请求Apple或Mux；YouTube媒体到googlevideo.com。应用host只提供页面、脚本、CSS；本机错误夹具不提供媒体。无应用视频代理。[E网络](evidence/msedge-final/network.json)、[M网络](evidence/chrome-mux/network.json)、[Y网络](evidence/youtube-controls/network.json) |
| M0-20 | PASS | Chrome/Edge/Safari已测核心链路及差异；Safari断流为人工验证 | Safari原生播放、seek、音量、ended、短源时序与后台恢复有自动化实证；用户确认播放时分片可见，关机后保持页面打开≥30秒无持续新增分片。Safari第三方嵌入等未测子项仍NOT RUN，不外推全能力兼容。[自动化证据](evidence/safari-final/reviewed-results.json)、[人工确认](evidence/safari-manual-observation.md) |

## 补充观察与边界

### 首显延迟不等于seek误差

C/M 09:05 测试：metadata时重新计算目标301.9305秒，seeked=301.930824，媒体定位本身约0.000324秒误差；但后续缓冲约1.36秒，使播放相对模拟时钟落后。09:08重开进一步出现约2.18秒落后。因此“seek成功”不能单独证明实时播出已同步。这是初次失败的原因；现已在可播放/seek完成后校准并通过下述复测。历史日志不改写为成功。

### 同步修复与最终回归（2026-11-02）

新增M0专用HLS校准观察器：seeked/canplay/playing及250ms观察时重新计算当前应播位置；偏差超过0.5秒才纠正。校正至少间隔1秒，10秒内最多3次；未收敛时显示SYNCHRONIZING/BUFFERING。暂停/拒播时不追赶、不覆盖手势恢复状态；销毁时清理监听和定时器，过期时段/素材转NO_SIGNAL。

正式Chrome与Edge各7项最终回归全部PASS：普通起播、限速重开机、限速offline→online恢复、时段结束、加载中关机防止旧实例恢复、缓冲期间素材耗尽、销毁后31秒无新媒体请求。源为官方Mux短片，均为隔离headless配置；不代替Safari、真实后台或1800秒长源验证。

| 场景 | Chrome稳定后最大绝对偏差 | Edge稳定后最大绝对偏差 |
|---|---|---|
| 普通起播 | 0.181秒 | 0.122秒 |
| 限速重开机 | 0.081秒 | 0.077秒 |
| 限速网络恢复 | 0.063秒 | 0.072秒 |

以上取各场景校准完成后的连续3次实际播放采样；样本必须非暂停、有解码帧、readyState≥3且每次偏差≤2秒。等待稳定样本有60秒超时，初始等待播放45秒；网络缓冲/首显等待时长不计作“稳定后误差”，也不承诺任意网络下立即首显。

证据：[Chrome环境](evidence/sync-fix-verified-chrome/environment.json)、[Edge环境](evidence/sync-fix-verified-msedge/environment.json)、[Chrome全部事件](evidence/sync-fix-verified-chrome/events.json)、[Edge全部事件](evidence/sync-fix-verified-msedge/events.json)、[Chrome网络](evidence/sync-fix-verified-chrome/network.json)、[Edge网络](evidence/sync-fix-verified-msedge/network.json)。

复测调试记录也保留：sync-fix-chrome/的失败断言混入校准前样本；sync-fix-final-msedge/固定等待内未收集足够稳定样本。最终脚本按最近一次sync-settled之后连续3样本判断，未删除这些中间记录以掩盖问题。原始缓冲期间的较大偏差仍在事件日志中。

### B站换网复测（2026-11-02）

用户说明已从内网切换为流量网络，本轮未修改系统网络设置。正式Chrome/Edge隔离headless配置复测官方示例BV1B7411m7LV，静音自动播放、t=30，成功通过M0-06/07/09；不能仅凭这次变化断言上次故障的唯一根因，但原连接关闭问题本轮未复现。

媒体由浏览器请求bilivideo.com CDN，页面/静态资源涉及player.bilibili.com、api.bilibili.com、hdslb.com等，未走应用代理。网络日志去除查询串，不保存cookies/响应体。工具只读取iframe内实际video状态作为测试观测，不将跨域调试能力植入应用，也不使用私有控制消息。

父页面仍显示IFRAME_LOADED_UNVERIFIED和自身统计0，这是缺少外部状态接口时的保守提示；实际媒体播放由独立浏览器样本、帧增长与截图确认。当前外部音量滑块并未接入B站控制，音量无变化只能证明本方案未实现外控，不能证明平台不存在任何控制方式。M0-08保留BLOCKED（公开接口契约缺口）；用户随后已批准暂按不支持、后续前端提示，作为已接受限制处理，不再单独阻塞本轮验收。无需再把它归因为网络未通。

证据：[Chrome环境](evidence/bilibili-mobile-chrome/environment.json)、[Edge环境](evidence/bilibili-mobile-msedge/environment.json)、[Chrome网络](evidence/bilibili-mobile-chrome/network.json)、[Edge网络](evidence/bilibili-mobile-msedge/network.json)。仅新增复测脚本与文档，没有改动播放器代码；脚本语法检查及lint通过。

### 销毁与网络取证

网络记录来自 Playwright 对实际品牌浏览器的 request/response/requestfailed 事件，属于浏览器网络取证；不是curl代替媒体测试。未保存完整HAR响应体或视频。销毁后按新请求的发起时间判断；部分正在拉取的请求可能出现aborted，保留在原始日志中。没有计量物理网卡字节或给出“绝对零尾流”的承诺。

HTTP404/CORS测试使用本机5179（Chrome）/5181（Edge）故障夹具。它只返回故意失败文本，不代理、下载或转码任何视频。跨域请求的code0不自动等于CORS；本次控制台有明确CORS错误且夹具故意缺少响应头。

### 无效初轮与复测

`evidence/chrome/`、`evidence/msedge/` 为初轮调试证据。日期字段包含冗余`:00`导致自动化fill失败，且异常路径曾未恢复offline；这些目录的后续网络/第三方结论**全部无效，不用于验收**。修复格式、finally恢复网络后，使用 `*-final/` 重跑；Chrome后续Apple源失败是真实源访问问题，另以 `chrome-mux/` 补充。`chrome/fatal.txt`属于更早Vite预构建重载，不是当前工程运行错误。

`evidence/autoplay/`为第一次自动播放观察，未记录YouTube实际muted；最终以 `autoplay-final/` 为准。`chrome-recovery/`的COMPLETED不能当作后台PASS，因为实际visibility仍visible。

## 工程质量与验证范围

- lint、typecheck、4个单元测试（含校准节流、销毁和暂停保护）、生产build均通过：[检查记录](evidence/engineering-checks.md)。构建有约870KB未压缩单chunk警告，本轮不做产品性能优化。
- 安装依赖版本锁定。npm审计报告11项moderate，均涉及开发期ESLint/minimatch依赖链；保留[原始审计](evidence/npm-audit-initial.json)。未执行会退回ESLint4的强制修复；这是待工具链升级处理的已知风险。没有提交凭证。
- 普通用户自动播放全组合、真实睡眠恢复、长时源、YouTube独立stopVideo、严格禁止平台内暂停/拖动、扬声器听感均未证明，不能外推为全浏览器或全来源通过。

进入M1必要门槛：长源闭环 **BLOCKED（用户已批准延期，不单独否决本轮验收）**；直连 **PASS**；销毁 **PASS**；已测同步场景 **PASS**、真实后台恢复 **PASS**；20项记录 **PASS**；用户验收 **通过；暂不开始M1**。

后续解除条件与建议见 [m0-decisions.md](m0-decisions.md)。M0已验收通过，当前停止开发，等待后续指令。

## Safari补测（2026-11-02）

用户启用远程自动化后，官方Safari 26.6.2会话成功，未开启alwaysAllowAutoplay或放宽证书验证。操作通过DOM点击测试控件，不作为可信用户手势的自动播放证据。

- **PASS** 原生HLS实际播放：时间1.206→2.713秒、解码帧12→59；60秒seek完成；volume=.2、muted=false事件与属性一致。
- **PASS** 恢复静音并继续播放后，真实ended→NO_SIGNAL；09:05短源起播稳定后三次采样最大误差0.913秒。
- **PASS** 真实后台恢复：06:30:32.366Z hidden，06:30:38.450Z visible，立即recalibrate；稳定后最大误差0.346秒。没有伪造visibility事件。
- **历史自动化结果BLOCKED（现由人工验证补齐）** Safari原生HLS断流网络证明：Resource Timing仅见顶层清单，未完整暴露媒体分片；移除video与31秒观察不能等同于“无新分片请求”。Chrome/Edge既有网络断流证据仍有效。
- **NOT RUN** Safari准确时段边界：脚本boundary虽返回PASS，但时钟跳至短片时长之外会先触发素材耗尽，5ms结果不能证明10:00边界调度。该标签不用于验收。C/E边界证据仍有效。

首次safari-enabled点击未生效、safari-verified取消静音后暂停的中间记录均保留。最终以safari-final逐项证据及本报告的人工复核为准。新增pause事件和PAUSED_NEEDS_GESTURE状态，避免暂停仍显示PLAYING；datetime-local增加input处理，保证模拟时钟输入被采纳。没有开发正式产品功能。

Chrome额外有界面切页仍未观察hidden，记录为测试环境BLOCKED，而非播放器恢复FAIL；Safari已提供真实后台成功证据。原生窗口控制接口超时，也未用于宣称成功。

Safari逐项最终裁定见 [reviewed-results.json](evidence/safari-final/reviewed-results.json)；results.json保留自动化原始断言，不以其boundary/销毁标签代替实际验收证据。

### 本次慢网回归补充

`safari-change-regression-chrome/`普通/限速起播、网络恢复、加载中关机通过，但慢网下清单已返回而首段元数据未就绪，耗尽检查30秒超时；后续销毁用例在起播等待阶段45秒超时，并未测到销毁动作，不是已证实关机仍拉流。中间运行保留原始FAIL，不用于替代最终复测。

针对前者，在hls.js LEVEL_LOADED读取已知VOD时长，若当前偏移已超过时长立即NO_SIGNAL，无需等待首段元数据。最终定向复测见 [manifest-expiry-fixed-chrome/results.json](evidence/manifest-expiry-fixed-chrome/results.json)。

最终定向回归：清单已知时长但首段缓冲期间素材过期 → NO_SIGNAL **PASS**；实际播放后销毁并观察31秒无新媒体请求 **PASS**（Chrome）。证据：[manifest-expiry-fixed-chrome/results.json](evidence/manifest-expiry-fixed-chrome/results.json)。本轮新增补丁后的lint/typecheck/4项单元测试/build均PASS。

## Safari人工观察补充（最新）

用户报告：“播放时能看到视频分片请求，关机时没有持续新增这些请求。”这补齐了分片可见性和关机后未持续新增的人工观察；证据为[会话反馈记录](evidence/safari-manual-observation.md)，不是自动化日志。用户随后明确确认关机后保持页面打开并观察至少30秒，Safari断流更新为PASS（人工验证），M0-20更新为PASS（已测核心链路及差异已记录）。最新20项：17 PASS / 0 FAIL / 3 BLOCKED；剩余M0-02/14为已批准延期，M0-08为已接受限制。没有尚待处理的M0技术阻塞；等待整体验收，未获M1授权。手测没有附截图或网络日志，精确浏览器版本未另行报告，不将人工确认冒充自动化抓取证据。
