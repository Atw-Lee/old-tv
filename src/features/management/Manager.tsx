import {useId,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {LoaderCircle,BookOpen,Download,Upload,Save,ChevronDown,Clock3,Film,Info,Pencil,Plus,Trash2,Tv,X} from 'lucide-react';
import type {AppStore} from '../../storage/store.js';
import type {Configuration,Channel,Program,Schedule,SourceType} from '../../core/model.js';
import {parseConfiguration} from '../../core/model.js';
import {removeChannel,removeProgram,timeText,timeMinute,friendlyError,reviseProgram,importBackup,exportBackup} from '../../core/editor.js';
import {Drawer,DrawerContent,DrawerTitle} from '../../components/ui/drawer.js';
import {Dialog,DialogContent,DialogTitle} from '../../components/ui/dialog.js';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogCancel} from '../../components/ui/alert-dialog.js';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '../../components/ui/tabs.js';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '../../components/ui/table.js';
import {Button} from '../../components/ui/button.js';
import {Input} from '../../components/ui/input.js';
import {SelectField} from './SelectField.js';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '../../components/ui/dropdown-menu.js';
import {DndContext,closestCenter,PointerSensor,KeyboardSensor,useSensor,useSensors,type DragEndEvent} from '@dnd-kit/core';
import {SortableContext,verticalListSortingStrategy,sortableKeyboardCoordinates,arrayMove} from '@dnd-kit/sortable';
import {SortableChannelRow} from './SortableChannelRow.js';
import {Switch} from '../../components/ui/switch.js';
import {Timeline} from './Timeline.js';

import {DurationField,durationText} from './DurationField.js';
import presetText from './demo-preset.json?raw';
import {ScrollArea} from '../../components/ui/scroll-area.js';
import {Manual} from './Manual.js';
import {SlotFields} from './SlotFields.js';

// Keep the dragged row inside its tbody so transforms cannot enlarge the scroll area.
const channelDragBounds: import('@dnd-kit/core').Modifiers = [
  ({transform, activeNodeRect, containerNodeRect}) => {
    if (!activeNodeRect || !containerNodeRect) return {...transform, x: 0};
    const min = containerNodeRect.top - activeNodeRect.top;
    const max = containerNodeRect.bottom - activeNodeRect.bottom;
    return {...transform, x: 0, y: Math.max(min, Math.min(max, transform.y))};
  },
];

type Editor={kind:'channel';value:Channel|null}|{kind:'program';value:Program|null}|{kind:'schedule';value:Schedule|null};
type Removal={kind:'channel'|'program'|'schedule';id:string;name:string};
const sourceNames:Record<SourceType,string>={'hls-vod':'HLS','youtube':'YouTube','bilibili':'Bilibili'};
function field(form:HTMLFormElement,name:string){return String(new FormData(form).get(name)??'').trim();}
function IconButton({label,children,...props}:React.ComponentProps<typeof Button>&{label:string}){return <Button type="button" variant="ghost" className="icon-button" aria-label={label} title={label} {...props}>{children}</Button>;}
function EmptyRow({columns,children}:{columns:number;children:ReactNode}){return <TableRow><TableCell colSpan={columns}><div className="table-empty">{children}</div></TableCell></TableRow>;}
export function Manager({store,config:persisted,busy,onClose}:{store:AppStore;config:Configuration;busy:boolean;onClose():void}){
  const sourceHintId=useId();
  const [drawerOpen,setDrawerOpen]=useState(true);
  const finishClose=()=>setDrawerOpen(false);
  const [config,setDraft]=useState(()=>structuredClone(persisted));
  const initial=useRef(JSON.stringify(config));
  const [imported,setImported]=useState(false),[pendingImport,setPendingImport]=useState<Configuration|null>(null);
  const importInput=useRef<HTMLInputElement|null>(null);
  const hasChanges=JSON.stringify(config)!==initial.current;
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  const editorInput=useRef<HTMLInputElement|HTMLButtonElement|null>(null);
  const previousFocus=useRef(document.activeElement),editorTrigger=useRef<HTMLElement|null>(null),fallbackFocus=useRef<HTMLButtonElement|null>(null);
  const [tab,setTab]=useState('channels'),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  const [editorOpen,setEditorOpen]=useState(false);
  const [editor,setEditor]=useState<Editor|null>(null),[removal,setRemoval]=useState<Removal|null>(null),[discard,setDiscard]=useState(false);
  const [sourceUrl,setSourceUrl]=useState('');
  const [source,setSource]=useState<SourceType>('hls-vod'),[enabled,setEnabled]=useState(true);
  const [channelId,setChannelId]=useState(config.channels[0]?.id??'');
  const selected=config.channels.some(c=>c.id===channelId)?channelId:config.channels[0]?.id??'';
  const ordered=[...config.channels].sort((a,b)=>a.sortOrder-b.sortOrder||a.number-b.number);
  const slots=config.schedules.filter(s=>s.channelId===selected).sort((a,b)=>a.startMinute-b.startMinute);
  const modalOpen=!!editor||!!removal||!!discard||!!pendingImport;
  const message=error||store.getSnapshot().error;
  function openEditor(next:Editor){editorTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setDirty(false);setError('');setEditor(next);setEditorOpen(true);if(next.kind==='program'){setSource(next.value?.sourceType??'hls-vod');setSourceUrl(next.value?.sourceUrl??'');}if(next.kind==='channel')setEnabled(next.value?.enabled??true);}
  function closeEditor(){if(busy)return;setDirty(false);setEditorOpen(false);setError('');}
  // Dialogs, drag/drop and imports update only this editing session.
  function save(next:Configuration,after?:()=>void){try{setError('');setDraft(parseConfiguration(next));after?.();}catch(e){setError(`无法应用：${friendlyError(e)}`);}}
  function closeDrawer(){if(busy)return;if(hasChanges)setDiscard(true);else finishClose();}
  async function applyDraft(){if(busy||!hasChanges)return;try{setError('');await store.commit(config,imported);finishClose();}catch(e){setError(`保存失败：${friendlyError(e)} 草稿仍保留，可导出备份。`);}}
  useEffect(()=>{if(!hasChanges&&!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[hasChanges,dirty]);
  function exportDraft(){const url=URL.createObjectURL(new Blob([exportBackup(config)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`retro-tv-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function readImport(file:File|undefined){if(!file)return;setError('');try{if(file.size>5_000_000)throw Error('文件超过5MB');setPendingImport(importBackup(await file.text()));}catch(e){setError(`导入失败：${friendlyError(e)}`);}}

  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!editor||busy)return;const form=e.currentTarget,next=structuredClone(config);
    try{
      if(editor.kind==='channel'){const value:Channel={id:editor.value?.id??crypto.randomUUID(),name:field(form,'name'),number:Number(field(form,'number')),sortOrder:editor.value?.sortOrder??Math.max(-1,...config.channels.map(c=>c.sortOrder))+1,enabled};next.channels=editor.value?next.channels.map(c=>c.id===value.id?value:c):[...next.channels,value];}
      if(editor.kind==='program'){let url=field(form,'url');let sourceId:string|undefined;if(source==='bilibili'&&/^BV[\w]+$/.test(url)){sourceId=url;url=`https://www.bilibili.com/video/${url}`;}if(source==='youtube'&&/^[\w-]{11}$/.test(url)){sourceId=url;url=`https://www.youtube.com/watch?v=${url}`;}const value:Program={id:editor.value?.id??crypto.randomUUID(),title:field(form,'title'),sourceType:source,sourceUrl:url};if(sourceId)value.sourceId=sourceId;const preserved=reviseProgram(editor.value??undefined,value);const n=Number(field(form,'durationSeconds'));if(n>0)preserved.durationSeconds=n;else if(source!=='hls-vod')delete preserved.durationSeconds;next.programs=editor.value?next.programs.map(p=>p.id===value.id?preserved:p):[...next.programs,preserved];}
      if(editor.kind==='schedule'){const value:Schedule={id:editor.value?.id??crypto.randomUUID(),channelId:field(form,'channel'),programId:field(form,'program'),startMinute:timeMinute(field(form,'start')),endMinute:timeMinute(field(form,'end')),endBehavior:field(form,'behavior')==='loop'?'loop':'no-signal'};const p=next.programs.find(p=>p.id===value.programId),n=Number(field(form,'durationSeconds'));if(p&&n>0)p.durationSeconds=n;next.schedules=editor.value?next.schedules.map(s=>s.id===value.id?value:s):[...next.schedules,value];}
      void save(next,()=>{setDirty(false);setEditorOpen(false);});
    }catch(e){setError(`保存失败：${friendlyError(e)}`);}
  }
  function reorder({active,over}:DragEndEvent){if(!over||active.id===over.id||busy)return;const from=ordered.findIndex(c=>c.id===active.id),to=ordered.findIndex(c=>c.id===over.id);if(from<0||to<0)return;save({...config,channels:arrayMove(ordered,from,to).map((c,i)=>({...c,sortOrder:i}))});}
  function askRemove(value:Removal){editorTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setError('');setRemoval(value);}
  function confirmRemove(){if(!removal||busy)return;try{const next=removal.kind==='channel'?removeChannel(config,removal.id):removal.kind==='program'?removeProgram(config,removal.id):{...config,schedules:config.schedules.filter(s=>s.id!==removal.id)};void save(next,()=>setRemoval(null));}catch(e){setError(friendlyError(e));}}
  function restoreEditorFocus(e:Event){e.preventDefault();const target=editorTrigger.current?.isConnected?editorTrigger.current:fallbackFocus.current;target?.focus();}
  const editTitle=editor?`${editor.value?'编辑':'新增'}${editor.kind==='channel'?'频道':editor.kind==='program'?'视频源':'排片'}`:'';
  const saveLabel='完成';
  const linkedCount=removal?config.schedules.filter(s=>removal.kind==='channel'?s.channelId===removal.id:s.programId===removal.id).length:0;
  return <Drawer open={drawerOpen} autoFocus direction="right" handleOnly shouldScaleBackground={false} dismissible={!modalOpen&&!busy} onOpenChange={open=>{if(!open&&!modalOpen&&!busy)closeDrawer();}}>
    <DrawerContent aria-describedby={undefined} className="management-surface manager-drawer" onCloseAutoFocus={e=>{e.preventDefault();if(previousFocus.current instanceof HTMLElement)previousFocus.current.focus();if(!drawerOpen)onClose();}}>
      <header className="manager-heading"><div><DrawerTitle className="manager-title">调校</DrawerTitle></div><IconButton label="关闭设置" disabled={busy||modalOpen} onClick={closeDrawer}><X/></IconButton></header>
      <Tabs value={tab} onValueChange={value=>{setTab(value);setError('');}} className="manager-tabs">
        <TabsList aria-label="设置分类"><TabsTrigger value="channels"><Tv/>频道</TabsTrigger><TabsTrigger value="programs"><Film/>视频源</TabsTrigger><TabsTrigger value="schedules"><Clock3/>排片</TabsTrigger><TabsTrigger value="manual"><BookOpen/>手册</TabsTrigger></TabsList>
        {message&&!modalOpen&&<p role="alert" className="manager-error">{message}</p>}
        <TabsContent value="channels">
          <div className="table-toolbar"><div><h2>频道 <span className="count-badge">{config.channels.length}</span></h2></div><Button ref={fallbackFocus} disabled={busy} onClick={()=>openEditor({kind:'channel',value:null})}><Plus/>新增频道</Button></div>
          <DndContext modifiers={channelDragBounds} sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder} accessibility={{screenReaderInstructions:{draggable:"按空格选中频道，用上下方向键移动，再按空格放下；Escape取消。"}}}><SortableContext items={ordered.map(c=>c.id)} strategy={verticalListSortingStrategy}><div className="table-scroll"><div className="channel-table-clip"><Table aria-label="频道列表"><TableHeader><TableRow><TableHead className="drag-cell"><span className="sr-only">排序</span></TableHead><TableHead>编号</TableHead><TableHead>频道名称</TableHead><TableHead>状态</TableHead><TableHead>排片</TableHead><TableHead className="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
            {ordered.map(c=><SortableChannelRow key={c.id} id={c.id} name={c.name} disabled={busy}><TableCell className="tabular">{String(c.number).padStart(2,'0')}</TableCell><TableCell className="name-cell">{c.name}</TableCell><TableCell><div className="status-control"><Switch checked={c.enabled} disabled={busy} aria-label={`${c.enabled?'停用':'启用'} ${c.name}`} onCheckedChange={value=>{const next=structuredClone(config);next.channels=next.channels.map(v=>v.id===c.id?{...v,enabled:value}:v);void save(next);}}/><span>{c.enabled?'已启用':'已停用'}</span></div></TableCell><TableCell className="muted">{config.schedules.filter(s=>s.channelId===c.id).length} 段</TableCell><TableCell><div className="row-actions"><IconButton label={`编辑频道 ${c.name}`} disabled={busy} onClick={()=>openEditor({kind:'channel',value:c})}><Pencil/></IconButton><IconButton label={`删除频道 ${c.name}`} className="icon-button delete-button" disabled={busy} onClick={()=>askRemove({kind:'channel',id:c.id,name:c.name})}><Trash2/></IconButton></div></TableCell></SortableChannelRow>)}
            {!ordered.length&&<EmptyRow columns={6}><Tv/><strong>还没有频道</strong><p>点击右上角「新增频道」，创建你的第一个频道。</p></EmptyRow>}
          </TableBody></Table></div></div></SortableContext></DndContext>
        </TabsContent>
        <TabsContent value="programs">
          <div className="table-toolbar"><div><h2>视频源 <span className="count-badge">{config.programs.length}</span></h2></div><Button ref={fallbackFocus} disabled={busy} onClick={()=>openEditor({kind:'program',value:null})}><Plus/>新增视频源</Button></div>
          <div className="table-scroll"><Table aria-label="视频源列表"><TableHeader><TableRow><TableHead>名称 / 链接</TableHead><TableHead>类型</TableHead><TableHead>时长</TableHead><TableHead>使用次数</TableHead><TableHead className="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
            {config.programs.map(p=><TableRow key={p.id}><TableCell className="source-cell"><span className="source-title">{p.title}</span><span className="source-url" title={p.sourceUrl}>{p.sourceUrl}</span></TableCell><TableCell><span className="source-badge">{sourceNames[p.sourceType]}</span>{p.sourceType==='bilibili'&&<span className="limited-label">受限</span>}</TableCell><TableCell className="tabular">{durationText(p.durationSeconds)}</TableCell><TableCell className="muted">{config.schedules.filter(s=>s.programId===p.id).length} 次排片</TableCell><TableCell><div className="row-actions"><IconButton label={`编辑视频源 ${p.title}`} disabled={busy} onClick={()=>openEditor({kind:'program',value:p})}><Pencil/></IconButton><IconButton label={`删除视频源 ${p.title}`} className="icon-button delete-button" disabled={busy} onClick={()=>askRemove({kind:'program',id:p.id,name:p.title})}><Trash2/></IconButton></div></TableCell></TableRow>)}
            {!config.programs.length&&<EmptyRow columns={5}><Film/><strong>添加一个视频源</strong><p>支持点播 HLS、YouTube 和 Bilibili 官方视频链接。</p></EmptyRow>}
          </TableBody></Table></div>
        </TabsContent>
        <TabsContent value="schedules">
          <div className="table-toolbar schedule-toolbar">
            <h2>每日排片 <span className="count-badge">{slots.length}</span></h2>
            <div className="schedule-actions">
              <SelectField id="schedule-channel" label="排片频道" placeholder="暂无频道" value={selected||undefined} onValueChange={value=>{setChannelId(value);setError('');}} disabled={busy||!ordered.length} options={ordered.map(c=>({value:c.id,label:`${c.number} · ${c.name}${c.enabled?'':'（已停用）'}`}))}/>
              <Button ref={fallbackFocus} disabled={busy||!selected||!config.programs.length} onClick={()=>openEditor({kind:'schedule',value:null})}><Plus/>新增排片</Button>
            </div>
          </div>
          <div className="table-scroll"><Table aria-label="排片列表"><TableHeader><TableRow><TableHead>播出时间</TableHead><TableHead>视频源</TableHead><TableHead>时段长度</TableHead><TableHead>播完后</TableHead><TableHead className="actions-column">操作</TableHead></TableRow></TableHeader><TableBody>
            {slots.map(s=><TableRow key={s.id}><TableCell className="tabular">{timeText(s.startMinute)} – {timeText(s.endMinute)}</TableCell><TableCell className="name-cell">{config.programs.find(p=>p.id===s.programId)?.title}</TableCell><TableCell className="muted">{s.endMinute-s.startMinute} 分钟</TableCell><TableCell>{s.endBehavior==='loop'?'循环':'无信号'}</TableCell><TableCell><div className="row-actions"><IconButton label={`编辑排片 ${timeText(s.startMinute)}`} disabled={busy} onClick={()=>openEditor({kind:'schedule',value:s})}><Pencil/></IconButton><IconButton label={`删除排片 ${timeText(s.startMinute)}`} className="icon-button delete-button" disabled={busy} onClick={()=>askRemove({kind:'schedule',id:s.id,name:`${timeText(s.startMinute)} – ${timeText(s.endMinute)} 的排片`})}><Trash2/></IconButton></div></TableCell></TableRow>)}
            {!slots.length&&<EmptyRow columns={5}><Clock3/><strong>{!selected?'先创建一个频道':!config.programs.length?'先添加视频源':'这个频道还没有排片'}</strong><p>{!selected?'在「频道」中新增频道后，即可安排播放。':!config.programs.length?'在「视频源」中添加链接后，即可安排播放。':'点击右上角「新增排片」，安排每日播放时间。'}</p></EmptyRow>}
          </TableBody></Table></div>
          {selected&&slots.length>0&&<details open className="timeline-disclosure"><summary><span>24 小时时间轴</span><ChevronDown/></summary><Timeline config={config} channelId={selected} disabled={busy} onSelect={s=>openEditor({kind:'schedule',value:s})} onChange={s=>{const next=structuredClone(config);next.schedules=next.schedules.map(v=>v.id===s.id?s:v);void save(next);}}/></details>}
        </TabsContent>
        <TabsContent value="manual"><Manual onPreset={()=>setPendingImport(importBackup(presetText))}/></TabsContent>
      </Tabs>
      <footer className="manager-footer"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={busy||modalOpen}>导入 / 导出<ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="start" side="top"><DropdownMenuItem onSelect={()=>importInput.current?.click()}><Upload/>导入配置</DropdownMenuItem><DropdownMenuItem onSelect={exportDraft}><Download/>{hasChanges?'导出当前草稿':'导出配置'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu><input ref={importInput} type="file" accept=".json,application/json" aria-label="导入配置文件" hidden onChange={e=>{void readImport(e.target.files?.[0]);e.currentTarget.value='';}}/><Button disabled={busy||modalOpen||!hasChanges} onClick={()=>void applyDraft()}>{busy?<LoaderCircle className="spin"/>:<Save/>}{busy?'正在保存…':'保存'}</Button></footer>
      <Dialog open={editorOpen} onOpenChange={open=>{if(!open)closeEditor();}}>
        <DialogContent aria-describedby={undefined} className="management-surface editor-dialog" onOpenAutoFocus={e=>{e.preventDefault();editorInput.current?.focus();}} onCloseAutoFocus={e=>{setEditor(null);restoreEditorFocus(e);}} onEscapeKeyDown={e=>{e.preventDefault();closeEditor();}}>
          <header className="editor-heading"><div><DialogTitle>{editTitle}</DialogTitle></div><IconButton label="关闭编辑" disabled={busy} onClick={closeEditor}><X/></IconButton></header>
          {editor&&<form key={`${editor.kind}-${editor.value?.id??'new'}`} onSubmit={submit} onChange={()=>setDirty(true)}>
            <ScrollArea className="editor-scroll" data-vaul-no-drag><fieldset disabled={busy} className="editor-fields">
              {editor.kind==='channel'&&<><div className="control-field">频道名称<Input ref={el=>{editorInput.current=el;}} name="name" aria-label="频道名称" required maxLength={80} autoFocus defaultValue={editor.value?.name??''} placeholder="例如：经典动画"/></div><div className="control-field">频道编号<Input name="number" aria-label="频道编号" type="number" min="1" step="1" max="9999" required defaultValue={editor.value?.number??Math.max(0,...config.channels.map(c=>c.number))+1}/><span className="field-hint">显示在电视屏幕上，不能与其他频道重复。</span></div><div className="switch-field"><div><span>启用频道</span><p>停用后保留排片，切台时会跳过此频道。</p></div><Switch aria-label="启用频道" id="channel-enabled" checked={enabled} onCheckedChange={value=>{setEnabled(value);setDirty(true);}}/></div></>}
              {editor.kind==='program'&&<><div className="control-field">视频源名称<Input ref={el=>{editorInput.current=el;}} name="title" aria-label="视频源名称" required maxLength={160} autoFocus defaultValue={editor.value?.title??''} placeholder="例如：经典动画第一集"/></div><div className="control-field"><span className="behavior-caption">来源类型
                <span className="behavior-help source-type-help"><button type="button" aria-label="来源类型说明" aria-describedby={sourceHintId}><Info size={14} aria-hidden="true"/></button><span id={sourceHintId} role="tooltip">{source==='bilibili'?'粘贴 B 站视频链接或 BV 号。音量需要在视频里或系统中调节；填写实际时长后，电视按时间处理片尾。':source==='youtube'?'粘贴 YouTube 视频链接或视频 ID。画面可能保留 YouTube 按钮；需要网络能访问，且该视频允许在其他网站播放。':'粘贴以 .m3u8 为格式的视频播放地址。请选择能跳到指定时间的录播视频，不要使用直播地址；来源网站也需要允许外部播放。'}</span></span>
              </span><SelectField label="来源类型" value={source} onValueChange={value=>{setSource(value as SourceType);setSourceUrl('');setDirty(true);}} options={[{value:'hls-vod',label:'点播 HLS / M3U8'},{value:'youtube',label:'YouTube'},{value:'bilibili',label:'Bilibili（受限）'}]}/></div><div className="control-field">链接或平台 ID<Input name="url" aria-label="链接或平台 ID" required maxLength={4096} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder={source==='hls-vod'?'https://example.com/video.m3u8':source==='bilibili'?'视频链接或 BV 号':'视频链接或 11 位视频 ID'}/></div><DurationField editable key={source+sourceUrl.trim()} type={source} url={sourceUrl.trim()} known={editor.value?.sourceType===source&&editor.value.sourceUrl===sourceUrl.trim()?editor.value.durationSeconds:undefined}/></>}
              {editor.kind==='schedule'&&<><div className="control-field">频道<SelectField triggerRef={el=>{editorInput.current=el;}} name="channel" label="所属频道" defaultValue={editor.value?.channelId??selected} onValueChange={()=>setDirty(true)} options={ordered.map(c=>({value:c.id,label:`${c.number} · ${c.name}${c.enabled?'':'（已停用）'}`}))}/></div><SlotFields programs={config.programs} slot={editor.value} dirty={()=>setDirty(true)}/></>}
              {message&&<p role="alert" className="manager-error">{message}</p>}
            </fieldset></ScrollArea><footer className="editor-footer"><Button type="button" variant="outline" disabled={busy} onClick={closeEditor}>取消</Button><Button type="submit" disabled={busy}>{busy&&<LoaderCircle className="spin"/>}{busy?'正在保存…':saveLabel}</Button></footer>
          </form>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!removal} onOpenChange={open=>{if(!open&&!busy){setRemoval(null);setError('');}}}><AlertDialogContent onCloseAutoFocus={restoreEditorFocus}><AlertDialogTitle>删除{removal?.kind==='channel'?'频道':removal?.kind==='program'?'视频源':'排片'}？</AlertDialogTitle><AlertDialogDescription>将删除“{removal?.name}”。{removal?.kind!=='schedule'&&linkedCount>0?`同时删除引用它的 ${linkedCount} 段排片。`:removal?.kind==='schedule'?'视频源仍会保留。':''}点击右下角「保存」后才会正式删除。</AlertDialogDescription>{message&&<p role="alert" className="manager-error">{message}</p>}<div className="confirm-actions"><AlertDialogCancel asChild><Button variant="outline" disabled={busy}>取消</Button></AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={confirmRemove}>{busy?'正在删除…':'确认删除'}</Button></div></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!discard} onOpenChange={open=>{if(!open)setDiscard(false);}}><AlertDialogContent onCloseAutoFocus={e=>{e.preventDefault();if(editorInput.current)editorInput.current.focus();else fallbackFocus.current?.focus();}}><AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle><AlertDialogDescription>本次在抽屉中的修改还没有保存。关闭后将放弃这些修改，电视继续使用之前的配置。</AlertDialogDescription><div className="confirm-actions"><AlertDialogCancel asChild><Button variant="outline">继续编辑</Button></AlertDialogCancel><Button onClick={()=>{setDiscard(false);setDirty(false);setError('');finishClose();}}>放弃修改</Button></div></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!pendingImport} onOpenChange={open=>{if(!open)setPendingImport(null);}}><AlertDialogContent><AlertDialogTitle>导入配置？</AlertDialogTitle><AlertDialogDescription>包含 {pendingImport?.channels.length} 个频道、{pendingImport?.programs.length} 个视频源、{pendingImport?.schedules.length} 段排片。导入会替换抽屉中的草稿，点击右下角「保存」后才更新电视。建议先导出当前配置留作备份。</AlertDialogDescription><div className="confirm-actions"><AlertDialogCancel asChild><Button variant="outline">取消</Button></AlertDialogCancel><Button onClick={()=>{if(pendingImport){save(pendingImport);setImported(true);setPendingImport(null);}}}>导入到草稿</Button></div></AlertDialogContent></AlertDialog>
    </DrawerContent>
  </Drawer>;
}
