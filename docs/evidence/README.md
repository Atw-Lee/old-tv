# M0 证据目录

日期：2026-11-02。JSON里的ISO时间使用UTC，北京时间+8小时。完整验收裁定见../m0-test-report.md。

最终有效证据：

- msedge-final/：Edge + Apple HLS核心、故障夹具、B站/YouTube。
- chrome-final/：Chrome下Apple源跨域失败、故障夹具、B站连接关闭、YouTube播放/卸载。
- chrome-mux/：Chrome + Mux短片时序、真实ended、断流；记录了首显相对时钟滞后。
- youtube-controls/：官方API seek/音量/结束/销毁。
- autoplay-final/：HLS/YouTube各四组合，实际YouTube静音状态。
- chrome-recovery/：有界面真实标签页切换尝试，没有观察到hidden且源加载失败；不能当PASS。
- safari-session.json：Safari官方驱动拒绝会话。
- source-candidates.json、apple-candidates.json：文本清单时长核验，不是浏览器播放证据。
- engineering-checks.md、npm-audit-initial.json：工具链检查结果。
- source-sha256.json：最终源码/配置哈希，因项目初始无Git仓库而记录。

初轮chrome/、msedge/包含测试夹具缺陷（日期格式、offline清理）的无效后续结果，保留用于审计，不用于最终验收。autoplay/缺少YouTube实际muted观测，使用autoplay-final/替代。

COMPLETED只意味着执行完毕。任何PASS必须同时检查实际媒体状态、事件和网络记录；例如iframe load、DOM移除、播放器方法返回都不是完整能力证明。未保存视频、响应体、cookie或请求头；网络URL查询串被移除。资源日志中公开视频ID/官方嵌入参数保留以便复现。

同步修复最终有效证据：sync-fix-verified-chrome/、sync-fix-verified-msedge/（各7项PASS）。sync-fix-*/和sync-fix-final-*/为中间回归，保留采样边界/固定等待不足的失败记录；以报告说明和最终连续采样结果裁定。source-sha256-sync-fix.json是本次修复源码哈希，原source-sha256.json保留为初次交付快照。

B站换网最终证据：bilibili-mobile-chrome/、bilibili-mobile-msedge/。两浏览器M0-06/07/09通过；M0-08保留接口契约缺口，区分工具跨域观测与应用外部控制。source-sha256-bilibili-retest.json为本轮源码快照（新增测试脚本，播放器代码未变）。
