import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {AppStore} from '../storage/store.js';
import {MediaScreen} from '../player/MediaScreen.js';
import {IllustratedTV} from '../skins/illustrated/IllustratedTV.js';
import {paintedRoom} from '../skins/china-crt-80s/geometry.js';
import {Manager} from '../features/management/Manager.js';
import '../features/management/manager.css';
export function App({store}:{store:AppStore}){
  const {controller}=store;
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const data=useSyncExternalStore(store.subscribe,store.getSnapshot);
  const [drawer,setDrawer]=useState<'closed'|'opening'|'open'>('closed');
  useEffect(()=>{
    if(drawer!=='opening')return;
    // Let the physical switch travel before the drawer covers the cabinet.
    const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:65;
    const timer=window.setTimeout(()=>setDrawer('open'),delay);
    return ()=>window.clearTimeout(timer);
  },[drawer]);
  const preferenceTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{void store.load();const cleanup=controller.connectBrowser(document,window);return()=>{cleanup();clearTimeout(preferenceTimer.current);};},[store,controller]);
  const persist=()=>{clearTimeout(preferenceTimer.current);preferenceTimer.current=setTimeout(()=>{void store.savePreferences().catch(()=>{});},200);};
  const actions={togglePower:controller.togglePower,nextChannel:(direction:1|-1)=>{controller.nextChannel(direction);persist();},selectChannel:(id:string)=>{controller.selectChannel(id);persist();},setVolume:(value:number)=>{controller.setVolume(value);persist();}};
  return <main className="television-room" aria-label="复古电视">
    <IllustratedTV skin={paintedRoom} state={state} actions={actions} settingsOpen={drawer!=='closed'} onManage={()=>{if(drawer==='closed'&&data.ready)setDrawer('opening');}}>
      {state.schedule.kind==='AIR'&&<MediaScreen key={state.schedule.token} controller={controller} token={state.schedule.token}/>}
    </IllustratedTV>
    <p id="knob-instructions" className="sr-only">旋钮可点击、上下拖动或滚轮调节；聚焦后方向键、Home、End调节。通过机身设置键管理频道。</p>
    {(!data.ready||data.error)&&<div className="storage-message" role={data.error?'alert':'status'}>{data.error||'正在读取本机配置…'}{!data.busy&&<button type="button" onClick={()=>void store.load()}>重新载入</button>}</div>}
    {drawer==='open'&&data.ready&&<Manager store={store} config={data.config} busy={data.busy||!data.ready} onClose={()=>setDrawer('closed')}/>}
  </main>;
}
