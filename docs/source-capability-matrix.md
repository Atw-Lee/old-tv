# M0 视频来源能力矩阵

日期：2026-11-02。只描述本轮已测来源，不代表同平台所有视频。环境代号与源URL详见 [测试报告](m0-test-report.md)。PASS以实测为准，文档能力单独列出。

| 能力 | 标准VOD HLS（A/M） | B站官方iframe（B） | YouTube IFrame API（Y） |
|---|---|---|---|
| play | **PASS** C/E媒体进度、帧数/音频解码；Apple部分变体存在间歇访问失败 | **PASS** 换流量网络后C/E实际视频进度与帧数增长 | **PASS** C/E ready、state1、画面和时间推进 |
| seek | **PASS** 0秒、约300/480/600/1200/1500秒实际定位；**BLOCKED** 1800秒长源验收 | **PASS（初始t参数）** t=30，实测30.157/30.293秒；**BLOCKED** 运行期seek控制 | **PASS** seekTo(60)后state1、60.184秒 |
| setVolume / mute | **PASS** volume=.2/muted=false、volumechange | **BLOCKED（外部音量）** 当前滑块未接入官方控制，实际volume仍1；**PASS（初始muted参数）** 实际muted=true | **PASS** 异步getVolume=20/isMuted=false；立即读回曾仍为50 |
| endedEvent | **PASS** 真实片尾事件，随后NO_SIGNAL | **BLOCKED** 媒体已可播放，但未有公开外部ended订阅契约可验证 | **PASS** state0后NO_SIGNAL |
| stop | **PASS** 通过destroy路径停止；单纯pause不代表断流 | **PASS（iframe移除路径）** 不代表独立暂停/停止API可用 | **NOT RUN** 独立stopVideo方法未测；destroy停止见下一行 |
| destroyStopsLoading | **PASS** E/A与C/M播放后销毁，≥31秒无新媒体片段请求 | **PASS** C/E实际播放后移除iframe，31秒内0新请求、iframe=0 | **PASS** 播放后destroy，31.004秒无新媒体请求，iframe=0 |
| hideControls | **PASS** HTMLVideoElement controls=false、截图无原生控件；测试页按钮仅供M0调试 | **NOT RUN** 平台控件完整隐藏未测；截图/媒体样本可见平台自身控件，不尝试遮挡或绕过 | **PASS（仅controls=0参数/画面）**；**NOT RUN** 平台内暂停、键盘/触控行为的全面限制，不能宣称完整电视模式 |
| autoplay | **PASS（本轮自动化配置）** M四组合均播放；拒播恢复 **NOT RUN** | **PASS（本轮条件）** C/E用户点击加载、muted=1后播放；其余组合NOT RUN | **PASS（本轮自动化配置）** 四组合state1，API实际静音符合设置；拒播恢复 **NOT RUN** |
| CORS | **PASS** 已播放A变体和M；**FAIL** A部分变体在C出现CORS/网络失败，不能将整个Apple源宣称稳定 | **NOT RUN / 不适用父页媒体XHR** iframe本轮可加载；父页读取iframe文档受同源策略限制 | **NOT RUN / 不适用父页媒体XHR** 官方iframe加载自身媒体，不需应用跨源读取视频 |
| DRM / 嵌入限制 | **PASS（所测清单无需DRM）** 不代表DRM源可用 | **PASS（本次示例嵌入）** 不代表所有视频可用或拥有再发布授权 | **PASS（所测示例允许嵌入）** 不代表所有视频允许；其他错误码/地区/登录限制未覆盖 |
| Safari原生HLS | **PASS（已测子项）** 原生播放、60秒seek、音量、ended、时序/后台恢复；**PASS（人工验证）** 关机后保持页面打开≥30秒无持续新增分片，见人工确认记录 | **BLOCKED** Safari未测 | **BLOCKED** Safari未测 |
| 与现实时间同步 | **PASS（修复后已测短源场景）** C/E普通起播、限速重开机/恢复稳定采样最大约0.181秒；初次2.18秒失败保留。1800秒闭环BLOCKED（已批准延期），Safari真实后台PASS，恢复后三样本最大误差0.346秒 | **NOT RUN** 初始t可用，但未验证其固定时段全链路；不等于运行期间能校准 | **NOT RUN** 没有用其完成固定时段全链路；官方seek能力不能代替调度验证 |

> 2026-11-02：用户已批准1800秒长源测试延期。上述BLOCKED能力状态不变，不代表已支持或永久豁免；本轮停止寻找资源，其他失败/缺口和M1授权要求仍有效。见 [决策记录](m0-decisions.md)。

## 已接受的B站能力限制

2026-11-02用户批准：B站外部运行期音量/静音、播放控制、状态查询与结束通知暂按不支持处理，后续前端标记受限来源，对不可用操作给出可见提示并禁用。本轮不再寻找接口；M0-08保留BLOCKED作为证据状态，但属于已接受限制，不单独阻止本轮验收。初始t/muted与卸载的PASS不受影响。详细提示及提前结束行为影响见 [决策记录](m0-decisions.md)。

## 文档能力与已知限制

[B站官方文档](https://player.bilibili.com/)列出bvid、t、autoplay、muted等参数。t是初始时间，不证明运行期间seekTo、音量控制或ended订阅可用。没有伪造控制命令来测试不存在的公开契约；本轮换网后已验证初始t与muted；运行期外控仍缺少可验证的公开契约。

[YouTube官方API](https://developers.google.com/youtube/iframe_api_reference)提供seekTo、音量、状态、stopVideo与destroy等方法。实际调用存在异步状态：本轮setVolume后立即getVolume仍返回旧值，稍后观察才确认新值。controls=0不能据此承诺用户完全无法暂停/操纵平台播放器。

HLS的可控性最适合继续验证纯前端时序播出；可用性取决于授权、CORS、编码、清单时长和CDN稳定性，不能只检验URL后缀。公开测试源是测试资源，不是正式内容授权库。

## 证据索引与建议

- HLS：[Edge媒体事件](evidence/msedge-final/hls-final.json)、[Chrome Mux事件](evidence/chrome-mux/events.json)、[失败网络](evidence/chrome-final/network.json)。
- B站：[换网后Chrome结果](evidence/bilibili-mobile-chrome/results.json)、[Edge结果](evidence/bilibili-mobile-msedge/results.json)、[实际画面](evidence/bilibili-mobile-chrome/t30.png)。初次连接错误保留在chrome-final/，已不代表最新可播结果。
- YouTube：[控制事件](evidence/youtube-controls/events.json)、[真实画面](evidence/youtube-controls/playing.png)、[销毁窗口](evidence/youtube-controls/results.json)。
- 自动播放：[八组合观测](evidence/autoplay-final/results.json)。

建议仅将HLS列为后续首选候选，YouTube列为需要明确平台交互限制的候选，B站可列为仅初始参数和卸载已验证的受限嵌入来源。**本轮不批准任何来源进入正式产品，也不进入M1。**

同步修复证据：[Chrome最终回归](evidence/sync-fix-verified-chrome/results.json)、[Edge最终回归](evidence/sync-fix-verified-msedge/results.json)。原始失败没有因验收例外被豁免，而是经代码修复和媒体实测后更新。

Safari证据：[最终测试](evidence/safari-final/results.json)。Safari下B站/YouTube本轮NOT RUN，表中C/E结果不能外推。自动化取消静音出现暂停，已补充暂停状态提示；未证明所有可信用户手势/自动播放组合。

## Safari人工观察补充（最新）

用户报告：“播放时能看到视频分片请求，关机时没有持续新增这些请求。”这补齐了分片可见性和关机后未持续新增的人工观察；证据为[会话反馈记录](evidence/safari-manual-observation.md)，不是自动化日志。用户随后明确确认关机后保持页面打开并观察至少30秒，Safari断流更新为PASS（人工验证），M0-20更新为PASS（已测核心链路及差异已记录）。最新20项：17 PASS / 0 FAIL / 3 BLOCKED；剩余M0-02/14为已批准延期，M0-08为已接受限制。没有尚待处理的M0技术阻塞；等待整体验收，未获M1授权。手测没有附截图或网络日志，精确浏览器版本未另行报告，不将人工确认冒充自动化抓取证据。

## M4 增量实测（2026-11-04，不改写M0历史结论）

| 能力 | HLS Chrome/Edge | HLS Safari | YouTube Chrome/Edge | B站 Chrome/Edge |
|---|---|---|---|---|
| 实际播放、按当前时间定位 | PASS | PASS（原生键盘开机） | BLOCKED（官方API超时） | BLOCKED（未观察到进度推进） |
| 外部音量 | PASS | PASS（实际volume读回） | BLOCKED | BLOCKED，按不支持处理，旋钮禁用提示PASS |
| 偏移超过时长→无信号 | PASS | PASS | BLOCKED | BLOCKED，无法接收时长/提前结束 |
| 自然播放到尾ended | NOT RUN | NOT RUN | BLOCKED | BLOCKED |
| 关机销毁DOM | PASS | PASS | 成功播放后NOT RUN | 成功播放后NOT RUN |
| 关机31秒无新分片 | PASS | NOT RUN（缺Network证据） | NOT RUN | NOT RUN |
| 自动播放拒绝后的恢复 | PASS（注入拒绝，非原生策略矩阵） | NOT RUN | BLOCKED | BLOCKED |
| 真实后台恢复 | BLOCKED（测试未产生hidden） | NOT RUN | NOT RUN | NOT RUN |
| 原生控件隐藏 | PASS | PASS | BLOCKED，待可播放复验 | 受限，不保证完全隐藏 |
| CORS/网络直连 | PASS，Mux浏览器直连 | PASS清单/原生源地址；完整分片网络NOT RUN | BLOCKED完整媒体 | BLOCKED完整媒体 |
| 1800秒定位 | BLOCKED，已批准延期 | BLOCKED，已批准延期 | NOT RUN | NOT RUN |

详见[M4逐项报告](m4-test-report.md)及其原始证据。平台参数/API设计能力与本轮实测结果严格区分。

### M4人工复测更新（2026-11-04）

用户逐项反馈测试1–5均“正常”：Safari鼠标操作、Safari关机后30秒无持续新分片、真实后台恢复、YouTube实际播放、B站实际播放及起点观察，均记为PASS（人工）。具体浏览器版本、后台恢复所用浏览器和精确偏差未提供，不扩展为全浏览器矩阵PASS；未新增自动化网络日志。上表BLOCKED/NOT RUN保留为此前自动化证据状态，当前人工结论见[m4-test-report.md](m4-test-report.md)末尾。B站外部控制限制与长源延期不变。
