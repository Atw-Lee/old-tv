# M0 实施计划与一致性核对

日期：2026-11-02（Asia/Shanghai）。已完整阅读 AGENTS.md、PRD.md、ARCHITECTURE.md、M0-ACCEPTANCE.md。

## 核对结论

四份文件一致：纯前端、浏览器直连、北京时间每日固定时段、按现实时间定位、提前结束/空档无信号、关机销毁。只执行 M0；无正式皮肤、频道 CRUD、排片编辑、业务数据库、账号或后端。架构列出的 Zustand/Dexie 和正式目录属于以后阶段，本次不安装。shadcn/ui 仅使用最小 Button 源码模式，不建立产品 UI。

执行口径：采用验收文档更明确的至少 31 分钟源要求；不得将 30 分钟片尾定位视为 1800 秒播放通过。算法单元测试不能代替真实媒体定位。自动化 Chromium/WebKit 不能冒充 Chrome/Edge/Safari。iframe load 不等于媒体可播。网络错误不能据此认定平台永远不支持。

## 步骤与资源

1. m0/ 隔离工程：Vite、React、TypeScript、hls.js、最小 shadcn Button、Tailwind；版本锁定 package-lock.json。
2. 核验官方公开测试源来源、VOD ENDLIST、实际时长；短片验证 ended，合格长片用于 1800 秒与模拟 09:30 场景。
3. 浏览器真实媒体观测：loadedmetadata、playing、seeked、帧数、currentTime、音量、ended；错误分类及用户手势恢复。
4. 使用 B站官方示例 BV1B7411m7LV、官方 t 参数；YouTube 官方 API 示例 M7lc1UVf-VE。不使用私有 API，不访问登录凭证。
5. 固定测试时段 09:00–10:00，注入绝对时间、边界、重新开机、恢复校准；只做实验夹具。
6. 记录 Chrome/Edge/Safari 的实际环境与限制，销毁后观测至少 30 秒，保存请求发起时间与域名、截图与 JSON。
7. 输出报告、来源能力矩阵、决策记录；未满足门槛不得进入 M1，完成后等待用户验收。

## 判据与证据

沿用 M0-ACCEPTANCE.md 的全部 20 项。定位误差目标 ≤2 秒；边界调度 ≤1 秒，媒体加载单独计时。非 PASS 项逐条给出 FAIL/BLOCKED/NOT RUN、已尝试步骤与解除条件。网络日志去除查询串，不保存 cookies、令牌、视频文件。测试夹具仅本机提供故意 404/CORS 错误响应，不代理任何远端视频，不是业务后端。

## 官方资料

- https://developer.apple.com/streaming/examples/ ：Apple 官方测试素材。
- https://test-streams.mux.dev/ ：hls.js/Mux 公开测试素材。
- https://player.bilibili.com/ ：官方嵌入参数，t 是初始秒数，未公开外部播放控制契约。
- https://developers.google.com/youtube/iframe_api_reference ：官方 IFrame API，能力需实测。
- https://vite.dev/guide/ ：工具链兼容性参考，当前 Node 20.19.5。
