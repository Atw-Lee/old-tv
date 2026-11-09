import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import type {AppStore} from '../storage/store.js';
import {MediaScreen} from '../player/MediaScreen.js';
import {CRT80s} from '../skins/china-crt-80s/TV.js';
import {Manager} from '../features/management/Manager.js';
import '../features/management/manager.css';
export function App({store}:{store:AppStore}){
  const {controller}=store;
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const data=useSyncExternalStore(store.subscribe,store.getSnapshot);
  const [open,setOpen]=useState(false);
  const roomObject=useRef<HTMLDivElement>(null);
  const [viewport,setViewport]=useState({width:window.innerWidth,height:window.innerHeight});
  const [roomScale,setRoomScale]=useState(1);
  const layout=viewport.width<1000?'stacked':'side';
  useEffect(()=>{const resize=()=>setViewport({width:window.innerWidth,height:window.innerHeight});window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useLayoutEffect(()=>{const el=roomObject.current;if(!el)return;setRoomScale(Math.min(1,(viewport.width-60)/(el.offsetWidth+45),(viewport.height-60)/(el.offsetHeight+45)));},[viewport,layout]);
  const preferenceTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{void store.load();const cleanup=controller.connectBrowser(document,window);return()=>{cleanup();clearTimeout(preferenceTimer.current);};},[store,controller]);
  const persist=()=>{clearTimeout(preferenceTimer.current);preferenceTimer.current=setTimeout(()=>{void store.savePreferences().catch(()=>{});},200);};
  const actions={togglePower:controller.togglePower,nextChannel:(direction:1|-1)=>{controller.nextChannel(direction);persist();},selectChannel:(id:string)=>{controller.selectChannel(id);persist();},setVolume:(value:number)=>{controller.setVolume(value);persist();}};
  return <main className="television-room" aria-label="复古电视">
    <div className="room-light" aria-hidden="true"/><div className="wall-stains" aria-hidden="true"/><div className="old-window" aria-hidden="true"><div className="window-foliage"/></div><div className="window-beam" aria-hidden="true"/><div className="wall-grain" aria-hidden="true"/>
    <div className="television-object" ref={roomObject} data-layout={layout} style={{'--room-scale':Math.max(.1,roomScale)} as CSSProperties}>
      <CRT80s state={state} actions={actions} onManage={()=>setOpen(true)}>
        {state.schedule.kind==='AIR'&&<MediaScreen key={state.schedule.token} controller={controller} token={state.schedule.token}/>}
      </CRT80s>
    </div>
    <p id="knob-instructions" className="sr-only">旋钮可点击、上下拖动或滚轮调节；聚焦后方向键、Home、End调节。通过机身设置键管理频道。</p>
    {(!data.ready||data.error)&&<div className="storage-message" role={data.error?'alert':'status'}>{data.error||'正在读取本机配置…'}{!data.busy&&<button type="button" onClick={()=>void store.load()}>重新载入</button>}</div>}
    {open&&data.ready&&<Manager store={store} config={data.config} busy={data.busy||!data.ready} onClose={()=>setOpen(false)}/>}
  </main>;
}
