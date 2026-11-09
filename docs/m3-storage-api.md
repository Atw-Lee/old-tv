# M3 本地数据与编辑接口

2026-11-03。用户授权本地管理及视觉调整；M4未启动。

## 数据持久化

- Dexie 4.4.7，数据库`corgi-tv`，IndexedDB版本1，对象仓库`configurations`，键`main`。
- 记录为`{id, revision, config}`。`config`含channels/programs/schedules/settings，仍采用M1的Schema 1。整份配置作为一个聚合记录写入，避免删除关联或导入时留下半份数据。
- `Repository.load()`返回已校验配置和revision；数据库为空才返回空配置。读取错误或损坏数据不触发初始化覆盖。
- `Repository.save(config, expectedRevision)`先校验，再在同一读写事务内比较revision和写入。过期版本拒绝，用户需重新载入；不采用最后写入者静默覆盖。
- `AppStore.commit()`串行提交，持久化成功后才通知界面和`TVController.replaceConfiguration()`重评估当前状态。失败保留已保存数据、表单输入并显示错误。
- 电源不保存；旋钮音量及最后频道防抖200ms后写入。用户应等待写入完成再关闭页面；强制结束进程或瞬间关闭可能丢失最后一次尚未提交的偏好变更，不影响此前已完成的配置事务。
- 不跨浏览器、来源地址或设备同步。当前数据库版本1没有历史版本迁移需求；未来升级需显式增加迁移，未知JSON schema直接拒绝。

事务实现参考[Dexie官方事务文档](https://dexie.org/docs/Dexie/Dexie.transaction%28%29)。未引入云同步、网络代理或业务后端。

## 编辑规则

`src/core/editor.ts`提供纯函数：

- removeChannel：删除频道及其排片，保留节目，清理失效lastChannelId。
- removeProgram：删除节目及跨频道引用它的排片。两种删除均在UI中明确确认。
- timeMinute/timeText：分钟精度的00:00–24:00转换。开始不能24:00；排片校验由M1保证非重叠、不跨午夜、引用有效。
- moveSlot：拖移或调整起止，按5分钟刻度吸附，钳制在日内；移动保留时长。碰撞则整次保存被拒绝，轨道回到已保存位置。
- 精确输入仍可使用任意分钟；短于轨道可读宽度的节目，可通过下方列表编辑。

## JSON备份

格式：`{schemaVersion:1, channels, programs, schedules, settings}`，settings内部也保持schemaVersion 1。导入大小上限5MB；先解析、完整校验及展示实体数量，不在预览时写入。确认覆盖后单事务替换，失败不改变原数据。不做合并或自动猜测迁移；备份包含来源链接，界面提示妥善保管。

## 界面与阶段边界

- 原生dialog承载管理UI，关闭恢复焦点，Tab在控件间循环，Escape关闭；未保存输入离开时确认。
- 主界面去除标题、导航、频道卡片及页脚；机壳厚度、边缘光影、内凹屏幕与按钮通过CSS和真实DOM实现，没有将整台电视替换为静态图片。
- 三种来源仅保存元数据。HLS提示点播/CORS限制；B站提示外部音量、状态及结束事件不支持；YouTube提示官方嵌入/自动播放限制。不下载、探测或代理视频。
- 有排片时显示标题和“视频播放将在下一阶段接入”；AIR不等于PLAYING。M0能力结论及长源延期不变。
