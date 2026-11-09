# M1 数据模型与时钟调度器测试报告

日期：2026-11-03（Asia/Shanghai）。状态：**M1实施完成，等待用户验收；未进入M2。** 授权依据：M0已验收，用户明确“开始 M1”。工作区不是Git仓库，commit N/A。

## 交付范围

- `src/core/model.ts`：Channel/Program/Schedule/Settings/Configuration类型、schemaVersion=1运行时校验、字段级错误、频道导航。
- `src/core/clock.ts`、`schedule.ts`：Asia/Shanghai日期、毫秒偏移、24小时每日循环和下一边界，无宿主时区依赖。
- `src/core/scheduler.ts`：电源/频道/配置变更、可注入时钟与定时器、播放意图、会话token隔离、实际时长/结束/加载完成回调、关机清理。
- `src/core/lifecycle.ts`：visible/online/pageshow重评估及监听清理。
- `src/core/source-policy.ts`：M0接受的B站受限策略；不伪造逐URL可播放能力。
- 根目录独立工具链与51项自动测试。M0工程和媒体原始证据保留。

没有实施M2电视皮肤、频道管理界面、M3排片工作台/IndexedDB/JSON导入导出、后端或视频代理。M1不是新的播放器验证页。

## 环境和执行证据

Node v20.19.5，npm 10.8.2；TypeScript 5.9.3、ESLint 9.39.5、typescript-eslint 8.72.1（沿用M0采用版本，根目录锁定）。使用Node原生node:test；完整TypeScript编译后测试构建产物，未跳过类型检查。本轮无React组件，暂不引入Vitest/React Testing Library。

| 检查 | 状态 | 结果/证据 |
|---|---|---|
| lint | PASS | [lint.txt](evidence/m1/lint.txt) |
| typecheck | PASS | [typecheck.txt](evidence/m1/typecheck.txt) |
| build | PASS | npm test前执行tsc，生成JS与声明；见[tests.txt](evidence/m1/tests.txt) |
| 自动化测试 | PASS | 51项通过、0失败、0跳过；[完整TAP](evidence/m1/tests.txt) |
| 依赖审计 | FAIL（已知开发工具风险） | 11 moderate、0 high/critical；[原始审计](evidence/m1/npm-audit.json)。涉及ESLint/minimatch开发依赖链，不含核心运行时依赖。安装还提示该ESLint版本已停止支持；未执行破坏性强制降级。工具链后续升级需单独回归。 |

## 验收覆盖

| 项目 | 状态 | 实测范围 |
|---|---|---|
| 模型/引用/字段验证 | PASS | 非法结构、重复ID/频道号、悬空引用、非法数值/协议/凭证URL、schema拒绝；返回独立数据副本 |
| 排片约束 | PASS | 同频道交叠/包含关系/跨午夜/零时长拒绝；相邻排片、跨频道并行、end=1440接受 |
| 频道切换 | PASS | 稳定排序、跳过停用频道、前后循环、空频道、当前频道失效回退 |
| 北京时间精度 | PASS | 09:30:00.125对应1800.125秒；起点包含、终点排除；全天1440分钟逐点对照 |
| 宿主时区独立 | PASS | 子进程TZ=UTC/Asia/Shanghai/America/Los_Angeles/Europe/London计算一致，含美国夏令时切换日期 |
| 每日循环/午夜 | PASS | 24:00进入新播出实例，跨年、闰日，次日重复；相同节目相邻排片也重新开始 |
| 边界与空档 | PASS | 假时钟在边界触发stop旧会话→start新会话，空档stop并NO_SIGNAL；不是浏览器实际首显延迟证明 |
| 结束/时长 | PASS | 提前ended保留无信号；重开/调台不重播本次节目，次日恢复；实际metadata覆盖时长，缓冲过期立即无信号 |
| 关机/重开 | PASS | 取消定时器、发出stop，20分钟后按1200秒重新起播意图；不等同于新一轮真实断流抓包 |
| 慢加载和恢复 | PASS | ready使用最新时钟；隐藏→可见、online、pageshow、节流跳过70分钟、时钟回拨重新求值；皆注入时钟/事件测试 |
| 异步隔离/资源清理 | PASS | 旧token的ended/duration/ready被忽略，关机前排队的旧定时器不复活，dispose幂等、unsubscribe清理 |
| 修改排片/来源 | PASS | 验证失败不影响现有会话；移除当前排片停止；替换来源新会话；无关配置不抹掉已结束记录 |
| B站策略 | PASS | 保留initial-only定位及外部音量/状态/ended不可用标志；平台内控件仍有限制 |
| 新核心接入真实媒体 | NOT RUN（后续集成范围） | M1只输出start/stop/resync意图，不创建播放器、不发视频请求 |
| 新核心真实浏览器后台/睡眠 | NOT RUN（后续集成范围） | 本轮只测试生命周期事件逻辑；M0真实后台证据保留，不能当作本核心已做浏览器集成 |
| 1800秒真实媒体 | BLOCKED（既有批准延期） | M1数学测试不替代M0-02/14长源验证 |

## 技术决策与限制

1. 核心与UI、播放器、存储隔离；AIR表示排片目标，而非真实PLAYING。后续协调器应消费有序意图，并按[API契约](m1-core-api.md)执行异步销毁/加载、检查token、处理autoplay及缓冲。无需后端或视频代理。
2. 使用绝对时钟+单一可取消定时器，通常每250ms求值，临近边界缩短间隔；暂停期间不累加播放进度。后台节流不保证实时触发，恢复时追上当前节目。M0缓冲纠偏策略留给媒体协调层，不在纯调度器中强制每tick seek。
3. 目前支持现代2000–2099日期的24小时北京节目单；没有引入可信服务器时间，设备时钟错误仍影响播出。`sourceUrl`要求完整HTTP(S)URL，粘贴BV/YouTube ID的UI解析后续实施。
4. 同配置替换会重新建立播放会话，以保证节目、排片或来源变更生效；无关改动保留ended记录。后续若需无中断编辑可优化为更细粒度差异处理。
5. 开发依赖审计问题如上保留，不改写为PASS。实际媒体集成与工具链升级仍需后续阶段验证，不能据本报告宣称产品端到端已完成。

## 阶段结论

M1范围内核心功能与自动化验证完成，暂无本阶段功能测试失败。建议提交M1验收；用户验收并授权后才进入M2。M0的长源延期和B站受限策略不变，M0报告不因M1算法测试升级为全绿。

## 后续阶段授权

2026-11-03用户明确“开始 M2”，已实现皮肤/旋钮与只读状态控制层，详见[M2报告](m2-test-report.md)。本报告51项为M1交付时的历史测试数；M2新增4项控制层测试后总计55项。M3未授权。
