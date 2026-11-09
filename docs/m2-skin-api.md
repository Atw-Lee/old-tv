# M2 皮肤接口与技术决策

日期：2026-11-03。范围：电视外观与交互；等待用户验收，M3未启动。

## 接口

`src/skins/types.ts` 的 `SkinProps` 包含：

| 字段 | 约定 |
| --- | --- |
| state | TVSnapshot：powered、channelId、channels、volume（0–1）、schedule；深度冻结，只读 |
| actions | togglePower、nextChannel(1或-1)、selectChannel(id)、setVolume(value) |
| children | 宿主提供的屏幕内容；皮肤不创建播放器或获取视频 |

`TVController` 包装 M1 Scheduler，以 `subscribe/getSnapshot` 对接 React `useSyncExternalStore`。电源和频道由调度器决定；音量归控制器所有，钳制至0–1、保留两位小数，忽略非有限输入。`connectBrowser` 绑定生命周期并返回清理函数；`dispose` 释放订阅、计时器和监听。

皮肤可拥有开关机、切台动画的短暂视觉状态，不维护第二份电源、频道、音量或节目时间。替换皮肤时保留同一控制器和接口。M1的AIR只表示当前应播节目，不证明媒体已经播放。

## 已采用决策

1. 用CSS构建木纹CRT机身、玻璃反光与扫描线；屏幕保持4:3。窄屏将控制区移到屏幕下方。
2. 频道、音量旋钮采用可聚焦ARIA slider，支持指针拖动、滚轮、方向键、Home/End、PageUp/PageDown；提供前后频道按钮。点击频道旋钮在末台循环，点击最大音量保持100%；拖动、键盘与滚轮到边界钳制。
3. 动画仅属表现层，尊重prefers-reduced-motion；快速操作仍以最新控制器状态为准。
4. M2只提供明确标注的本地SVG演示信号。两路演示频道与一路空白频道用于验证切台、无信号。无video/audio/iframe，无远端媒体请求；音量仅验证状态，没有实际声音。
5. 不保存设置，刷新回到初始关机状态。频道管理、IndexedDB、JSON备份留给M3，真实平台播放器集成留给M4。不增加后端、代理或下载功能。

## 后续边界

真实播放器必须由宿主管理并接收控制动作，关机销毁、停止拉流、开机按当前北京时间定位仍遵循M0/M1约定。M2卸载本地画面不等于重新证明真实媒体断流；M0来源能力矩阵及已批准限制不变。
