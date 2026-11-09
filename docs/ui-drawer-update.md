# 调校抽屉改版验证

日期：2026-11-05。环境：macOS，Codex 内置 Chromium 浏览器，1280×720；独立测试源站 http://127.0.0.1:5193/。浏览器精确版本本轮未采集。未修改5190源站的用户配置。

## 交付

右侧 Drawer，频道/视频源/排片 Tabs，Table 行末编辑/删除，右上角新增，新增和编辑使用 Dialog。频道支持鼠标及键盘拖拽排序；输入、Select、普通按钮32px，频道行约45px。Select为Radix/shadcn组合组件。抽屉上左右间距16px。

所有增删改、排序、启停、时间轴调整及导入均先写入草稿；表单「完成」加入草稿，右下角「保存」才持久化并更新电视。关闭未保存草稿有确认。导入/导出合并在左下角菜单，支持导出当前草稿。视频来源提示改为通俗文字。移除用户界面的柯基/CORGI品牌；内部数据库名保留以兼容旧数据。

## 实测

|项目|结果|步骤与证据|
|---|---|---|
|鼠标拖拽频道排序|PASS|拖动第一行至第二行，顺序交换、保存启用|
|键盘排序|PASS|把手空格选中、上箭头、空格放下，恢复原顺序后保存禁用|
|播放与草稿隔离|PASS|播放Mux HLS时禁用当前频道，视频src不变、currentTime由88.505增至96.825且未暂停；保存后播放器卸载并切换频道。见 evidence/ui-drawer-v2/playback-draft.json|
|排片编辑及保存|PASS|08:55–10:00排片完成后更新草稿，保存关闭抽屉，重新打开保留配置|
|导出JSON|PASS|菜单下载并读回合法schemaVersion=1文件；evidence/ui-drawer-v2/export.json|
|导入预览与草稿|PASS|导入import-fixture.json，预览显示2频道/1视频源/3排片；确认后草稿显示3段|
|退出保护|PASS|关闭触发确认，继续编辑保留3段；放弃并重开恢复原1段且保存禁用|
|Select频道筛选|PASS|自定义下拉选择纪录片频道，表格切换为0段空态|
|控件尺寸|PASS|DOM实测视频源名称、来源类型Select、链接输入均32px；频道行45/44.5px。source-dialog.png|
|极短时间轴|PASS|1分钟与5分钟槽宽约2px/2.97px，把手display:none、宽0，不溢出。short-slots.png；极短时段可通过表格编辑|
|桌面布局|PASS|Drawer边界x340至1280，宽940、高720，截图channels.png及preview.png|
|typecheck / lint|PASS|对应.log|
|单元测试|PASS|67通过，0失败，test.log|
|生产构建|PASS|build.log；保留大chunk警告|
|本轮移动窗口及Chrome/Edge/Safari独立回归|NOT RUN|不将既往版本结果视作本轮通过|

截图与日志均位于 `docs/evidence/ui-drawer-v2/`。旧管理浏览器脚本仍针对历史界面，本轮未运行，不以其结果声称新抽屉通过。

用户要求暂不构建镜像。本轮仅更新代码、本地预览与静态构建；release中的既有Docker镜像未更新，最终收到用户明确指令再构建。等待用户检查视觉和交互。

## 2026-11-08：时长与播完后策略

- 抽屉等待退出动画完成再卸载。视频源列表显示时长；编辑 HLS 或选择未记录时长的 HLS 排片时，自动读取 VOD 清单，不请求分片。YouTube 可点击「读取时长」，使用[官方 IFrame API](https://developers.google.com/youtube/iframe_api_reference#getDuration)，返回正值才采用。B 站受限来源显示未知。读取失败可以继续手动排片。
- 每段排片独立保存「播完后」。旧配置和新排片默认显示无信号。选择循环时，10 分钟视频排 12 分钟，最后 2 分钟播放片头；晚进入、恢复或开机同样取现实时间对应的进度。按分钟预填结束时间，可手动覆盖，最晚到24:00。
- 浏览器验证 **PASS**：Chrome 156.0.8078.80 / macOS，以自制5秒测试图案验证真实解码、跨片尾、晚开机、时段结束、默认排片时长和抽屉退场。读取时长只请求一份清单。见[浏览器记录](evidence/slot-loop/results.json)与[排片截图](evidence/slot-loop/schedule.png)。复现：启动本地预览后运行 `node tests/slot-loop-browser.mjs`，需 Chrome 和 ffmpeg。
- 本轮 YouTube 真实外站、Safari、Edge 回归：**NOT RUN**。B 站循环不支持。未构建 Docker 镜像。

## 2026-11-08：调校手册与平台时长，取代上节对应限制

- 站点标题「旧电视」。表单标题和状态文字不再隐式激活控件，控件仍有独立无障碍名称。新增/编辑取消直接退出；整个抽屉仍保留草稿放弃确认。
- 按 shadcn Time Picker 示例使用时间类型字段，分钟精度，排片结束选零点表示当天24:00。
- B 站手填当前集真实秒数后启用按时钟循环和无信号；不将时段长度当成视频时长。每轮通过重建官方嵌入并设置 t（保留 p）定位。平台实际暂停、缓冲、广告导致的进度差不能观察。
- YouTube 查询不挂载 iframe。可使用本标签页真实播放缓存、可选 YouTube Data API 或手填；无凭据且无缓存时显示原因。
- 实测记录：[Chrome 独立会话](evidence/manual-settings/results.json)。手册切换、标签文字/取消、查询不创建播放器、午夜时间和 B 站外层调度 **PASS**。B 站线上实际解码、带有效 Key 的 YouTube Data API 外站请求、独立 Safari/Edge：本轮 **NOT RUN**。

**时长字段与手册更新**：视频时长标题使用与其他字段相同的 8px 间距，结果与「重新读取」间隔 12px。只有 B 站的视频源编辑器提供手动时长。YouTube 填入链接后自动查本会话记录或已配置的 Data API；未配置 Key 且首次使用时显示原因，不弹出预览。手册移除重复的右侧总标题，三个来源均提供链接示例。Chrome 验证无 Key 提示及更换链接后自动命中缓存，详见上方浏览器记录；有效 Key 在线查询本轮 NOT RUN。
