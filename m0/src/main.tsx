import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Hls from 'hls.js';
import {Button} from './components/ui/button';
import {locate} from './clock.mjs';
import './style.css';
import {observeClockSync} from './sync';

type Log = {at:string;elapsed:number;event:string;data:unknown};
type YPlayer = {playVideo():void;seekTo(n:number,allow:boolean):void;setVolume(n:number):void;getVolume():number;isMuted():boolean;mute():void;unMute():void;getCurrentTime():number;getDuration():number;getPlayerState():number;destroy():void;stopVideo():void};
declare global {interface Window {YT?:{Player:new(el:HTMLElement,options:Record<string,unknown>)=>YPlayer};onYouTubeIframeAPIReady?:()=>void;}}
const query=new URLSearchParams(location.search);
const sources = {
 apple:'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
 mux:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
};
function App(){
 const [kind,setKind]=useState(query.get('provider')==='youtube'?'youtube':'hls'); const [url,setUrl]=useState(query.get('provider')==='youtube'?'M7lc1UVf-VE':import.meta.env.VITE_HLS_URL || (query.get('fixture')==='mux'?sources.mux:sources.apple));
 const [offset,setOffset]=useState(0);const [muted,setMuted]=useState(query.get('muted')!=='0');const [volume,setVolume]=useState(.5);const [status,setStatus]=useState('OFF');
 const [logs,setLogs]=useState<Log[]>([]);const [stats,setStats]=useState({time:0,duration:0,paused:true,width:0});
 const [clockInput,setClockInput]=useState('2026-11-02T09:30:00');const [scheduled,setScheduled]=useState(false);
 const host=useRef<HTMLDivElement>(null);const video=useRef<HTMLVideoElement|null>(null);const hls=useRef<Hls|null>(null);const yt=useRef<YPlayer|null>(null);
 const stopSync=useRef<(()=>void)|null>(null);
 const generation=useRef(0);const lastObservation=useRef(0);const allLogs=useRef<Log[]>([]);const clock=useRef({epoch:Date.parse('2026-11-02T09:30:00+08:00'),anchor:performance.now()});const active=useRef(false);const schedule=useRef(false);const lastActive=useRef(false);
 const log=(event:string,data:unknown={})=>{const entry={at:new Date().toISOString(),elapsed:performance.now(),event,data};allLogs.current.push(entry);setLogs(allLogs.current.slice(-80));};
 const now=()=>clock.current.epoch+performance.now()-clock.current.anchor;
 const destroy=(state='OFF')=>{
   generation.current++;active.current=false;stopSync.current?.();stopSync.current=null;
   hls.current?.destroy();hls.current=null;yt.current?.destroy();yt.current=null;
   if(video.current){video.current.pause();video.current.removeAttribute('src');video.current.load();video.current=null;}
   host.current?.replaceChildren();setStats({time:0,duration:0,paused:true,width:0});setStatus(state);log('destroy',{state});
 };
 const play=async()=>{const gen=generation.current;try{if(video.current)await video.current.play();else yt.current?.playVideo();}catch(e){if(gen!==generation.current)return;setStatus('BLOCKED_AUTOPLAY');log('play-rejected',{name:(e as Error).name,message:(e as Error).message});}};
 const seek=(target:number)=>{
   if(!Number.isFinite(target)||target<0){log('invalid-target',{target});return;}
   if(video.current){const v=video.current;if(Number.isFinite(v.duration)&&target>=v.duration){destroy('NO_SIGNAL');return;}log('seek-request',{target});v.currentTime=target;}
   else if(yt.current){log('yt-seek-request',{target});yt.current.seekTo(target,true);}
   else log('seek-unavailable');
 };
 const load=()=>{
   destroy();const gen=generation.current;active.current=true;setStatus('LOADING');
   const target=schedule.current?locate(now()).offset:offset;
   if(schedule.current&&!locate(now()).active){destroy('NO_SIGNAL');return;}
   log('load',{kind,url,target,muted,scheduled:schedule.current});
   if(kind==='hls'){
     const v=document.createElement('video');video.current=v;v.playsInline=true;v.controls=false;v.muted=muted;v.volume=volume;host.current?.append(v);
     for(const event of ['loadedmetadata','canplay','playing','waiting','seeking','seeked','pause','ended','error','volumechange'])v.addEventListener(event,()=>{
       if(gen!==generation.current)return;
       log(event,{time:v.currentTime,duration:v.duration,readyState:v.readyState,volume:v.volume,muted:v.muted,error:v.error?.message});
       if(event==='playing'&&!schedule.current)setStatus('PLAYING');
       if(event==='pause'&&!v.ended)setStatus('PAUSED_NEEDS_GESTURE');
       if(event==='ended')destroy('NO_SIGNAL');
       if(event==='error')setStatus('PLAYBACK_ERROR');
     });
     stopSync.current=observeClockSync(v,()=>gen===generation.current&&schedule.current?locate(now()):null,log,setStatus,()=>destroy('NO_SIGNAL'));
     v.addEventListener('loadedmetadata',()=>{if(gen!==generation.current)return;seek(schedule.current?locate(now()).offset:target);void play();},{once:true});
     if(v.canPlayType('application/vnd.apple.mpegurl')&&navigator.userAgent.includes('Safari')&&!navigator.userAgent.includes('Chrome')){log('engine',{engine:'native'});v.src=url;}
     else if(Hls.isSupported()){
       const instance=new Hls({maxBufferLength:15,maxMaxBufferLength:30});hls.current=instance;log('engine',{engine:'hls.js',version:Hls.version});
       instance.on(Hls.Events.ERROR,(_,d)=>{if(gen!==generation.current)return;log('hls-error',{type:d.type,details:d.details,fatal:d.fatal,code:d.response?.code,category:d.response?.code===404?'HTTP_404':d.details==='manifestParsingError'?'INVALID_MANIFEST':d.type==='networkError'?'CORS_OR_NETWORK':d.type});if(d.fatal){setStatus('PLAYBACK_ERROR');instance.stopLoad();}});
       instance.on(Hls.Events.LEVEL_LOADED,(_,d)=>{if(gen!==generation.current)return;log('manifest',{live:d.details.live,duration:d.details.totalduration});if(!d.details.live&&schedule.current&&locate(now()).offset>=d.details.totalduration)destroy('NO_SIGNAL');});
       instance.on(Hls.Events.FRAG_LOADING,(_,d)=>log('fragment-request',{url:d.frag.url,start:d.frag.start}));
       instance.loadSource(url);instance.attachMedia(v);
     }else{setStatus('PLAYBACK_ERROR');log('unsupported-hls');}
   }else if(kind==='bilibili'){
     const frame=document.createElement('iframe');frame.title='Bilibili official embed';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;
     frame.src=`https://player.bilibili.com/player.html?bvid=${encodeURIComponent(url)}&t=${target}&autoplay=1&muted=${muted?1:0}&danmaku=0`;
     frame.onload=()=>{if(gen===generation.current){log('iframe-load',{note:'Load event does not prove playable'});setStatus('IFRAME_LOADED_UNVERIFIED');}};host.current?.append(frame);
   }else{
     const init=()=>{if(gen!==generation.current||!window.YT)return;const el=document.createElement('div');host.current?.append(el);
       yt.current=new window.YT.Player(el,{videoId:url,width:640,height:360,playerVars:{autoplay:1,controls:0,origin:location.origin,start:Math.floor(target),playsinline:1},events:{
         onReady:()=>{if(gen!==generation.current)return;log('yt-ready');if(muted)yt.current?.mute();yt.current?.setVolume(volume*100);void play();},
         onStateChange:(e:{data:number})=>{if(gen!==generation.current)return;log('yt-state',{state:e.data,time:yt.current?.getCurrentTime()});if(e.data===1)setStatus('PLAYING');if(e.data===0)destroy('NO_SIGNAL');},
         onError:(e:{data:number})=>{if(gen!==generation.current)return;log('yt-error',{code:e.data});setStatus('PLAYBACK_ERROR');},
         onAutoplayBlocked:()=>{if(gen!==generation.current)return;log('yt-autoplay-blocked');setStatus('BLOCKED_AUTOPLAY');}
       }});
     };
     if(window.YT)init();else{window.onYouTubeIframeAPIReady=init;if(!document.querySelector('#youtube-api')){const script=document.createElement('script');script.id='youtube-api';script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{log('yt-api-network-error');setStatus('PLAYBACK_ERROR');};document.head.append(script);}}
   }
 };
 useEffect(()=>{
   log('environment',{ua:navigator.userAgent,platform:navigator.platform,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,date:'2026-11-02'});
   const onMessage=(e:MessageEvent)=>{if(e.origin==='https://player.bilibili.com')log('bilibili-message',{origin:e.origin,dataType:typeof e.data});};
   window.addEventListener('message',onMessage);
   const auto=query.get('autostart')==='1'?setTimeout(load,0):undefined;
   return ()=>{clearTimeout(auto);stopSync.current?.();window.removeEventListener('message',onMessage);hls.current?.destroy();yt.current?.destroy();};
 },[]);
 useEffect(()=>{
   const calibrate=()=>{if(active.current&&schedule.current){log('recalibrate',{visibility:document.visibilityState,target:locate(now()).offset});if(!locate(now()).active)destroy('NO_SIGNAL');else seek(locate(now()).offset);}};
   const visible=()=>{log('visibility',{state:document.visibilityState});if(!document.hidden)calibrate();};
   document.addEventListener('visibilitychange',visible);window.addEventListener('online',calibrate);
   const timer=setInterval(()=>{
     const v=video.current;const y=yt.current;
     if(v)setStats({time:v.currentTime,duration:v.duration,paused:v.paused,width:v.videoWidth});
     else if(y?.getCurrentTime)setStats({time:y.getCurrentTime(),duration:y.getDuration(),paused:y.getPlayerState()!==1,width:0});
     if(y?.getPlayerState&&performance.now()-lastObservation.current>1000){lastObservation.current=performance.now();log('yt-observation',{time:y.getCurrentTime(),state:y.getPlayerState(),volume:y.getVolume(),muted:y.isMuted()});}
     const inSlot=locate(now()).active;
     if(schedule.current&&active.current&&lastActive.current&&!inSlot){log('boundary',{clock:new Date(now()).toISOString(),latenessMs:(locate(now()).offset-3600)*1000});destroy('NO_SIGNAL');}
     lastActive.current=inSlot;
   },100);
   return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',calibrate);};
 });
 const clockSet=()=>{const epoch=Date.parse(clockInput+'+08:00');if(!Number.isFinite(epoch)){log('invalid-clock');return;}clock.current={epoch,anchor:performance.now()};lastActive.current=locate(epoch).active;log('clock-set',{beijing:clockInput});};
 const exportLog=()=>{const blob=new Blob([JSON.stringify({environment:navigator.userAgent,source:url,logs:allLogs.current,resources:performance.getEntriesByType('resource').map(e=>({name:e.name,startTime:e.startTime,duration:e.duration}))},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='m0-browser-evidence.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
 return <main><h1>Corgi TV · M0 播放验证</h1><p>仅技术实验。固定测试时段：北京时间每日 09:00–10:00。无正式业务功能。</p>
 <section><label>来源 <select value={kind} onChange={e=>{destroy();setKind(e.target.value);setUrl(e.target.value==='hls'?sources.apple:e.target.value==='bilibili'?'BV1B7411m7LV':'M7lc1UVf-VE');}}><option value="hls">HLS VOD</option><option value="bilibili">Bilibili 官方嵌入</option><option value="youtube">YouTube IFrame API</option></select></label>
 <label>URL / 视频 ID <input className="source" value={url} onChange={e=>setUrl(e.target.value)}/></label>
 <label>定位秒数 <input type="number" min="0" value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label>
 <label><input type="checkbox" checked={muted} onChange={e=>{setMuted(e.target.checked);if(video.current)video.current.muted=e.target.checked;if(yt.current){if(e.target.checked)yt.current.mute();else yt.current.unMute();}}}/>静音</label>
 <label>音量 <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e=>{const n=Number(e.target.value);setVolume(n);if(video.current)video.current.volume=n;if(yt.current){yt.current.setVolume(n*100);log('yt-volume',{actual:yt.current.getVolume()});}}}/></label>
 <div className="buttons"><Button onClick={load}>加载 / 开机</Button><Button onClick={()=>seek(offset)}>定位</Button><Button onClick={()=>void play()}>点击继续收看</Button><Button variant="outline" onClick={()=>destroy()}>销毁 / 关机</Button><Button variant="outline" onClick={()=>{if(video.current)seek(video.current.duration-2);else if(yt.current)seek(yt.current.getDuration()-2);}}>跳至结尾前 2 秒</Button><Button variant="outline" onClick={exportLog}>导出日志</Button></div>
 {kind==='hls'&&<div className="buttons"><Button variant="outline" onClick={()=>setUrl(sources.mux)}>Mux 短片</Button><Button variant="outline" onClick={()=>setUrl('http://127.0.0.1:5179/404.m3u8')}>404 测试</Button><Button variant="outline" onClick={()=>setUrl(location.origin+'/invalid.m3u8')}>无效清单</Button></div>}
 </section><section><label><input type="checkbox" checked={scheduled} onChange={e=>{setScheduled(e.target.checked);schedule.current=e.target.checked;}}/>启用固定时段实验</label><label>模拟北京时间 <input type="datetime-local" step="0.001" value={clockInput} onInput={e=>setClockInput(e.currentTarget.value)} onChange={e=>setClockInput(e.target.value)}/></label><Button variant="outline" onClick={clockSet}>设置时钟</Button></section>
 <p role="status">状态：{status} · 位置：{stats.time.toFixed(3)}s · 时长：{Number.isFinite(stats.duration)?stats.duration.toFixed(3):'?'}s · paused：{String(stats.paused)} · videoWidth：{stats.width}</p>
 <div ref={host} className="player"/>
 <details open><summary>事件日志（完整日志可导出）</summary><pre>{logs.map(l=>`${l.at} ${l.event} ${JSON.stringify(l.data)}`).join('\n')}</pre></details></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
