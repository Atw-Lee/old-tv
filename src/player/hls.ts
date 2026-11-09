import Hls from 'hls.js';
import type {Player,PlaybackOptions} from './types.js';
import {readVodDuration} from '../core/vod-duration.js';
export function createHls(host:HTMLElement,options:PlaybackOptions):Player {
  const video=document.createElement('video');video.playsInline=true;video.controls=false;video.preload='auto';video.volume=options.volume;video.muted=options.volume===0;video.setAttribute('aria-label',options.program.title);video.disablePictureInPicture=true;host.append(video);
  let disposed=false,failed=false,metadata=false,lastSeek=-Infinity,lastDuration=0;let instance:Hls|undefined;let attempts:number[]=[];
  const abort=new AbortController();const cleanups:(()=>void)[]=[];
  const alive=()=>!disposed&&!failed&&options.target()!==null;
  const status=(kind:Parameters<PlaybackOptions['status']>[0])=>{if(alive())options.status(kind);};
  const fail=(message:string)=>{if(!alive())return;options.status({kind:'ERROR',message});failed=true;instance?.destroy();instance=undefined;video.pause();video.removeAttribute('src');video.load();abort.abort();};
  const seek=(force=false)=>{
    if(!alive()||!metadata)return;const target=options.target();if(!target)return;
    if(Number.isFinite(video.duration)&&target.offset>=video.duration){options.ended();return;}
    if(!force&&(video.paused||video.seeking||video.readyState<3))return;
    const delta=Math.abs(target.offset-video.currentTime),now=performance.now();
    if(delta>.5){attempts=attempts.filter(t=>now-t<10000);if(!force&&(now-lastSeek<1000||attempts.length>=3))return;lastSeek=now;attempts.push(now);status({kind:'BUFFERING',message:'正在同步当前节目…'});try{video.currentTime=target.offset;}catch{fail('视频无法定位到当前节目时间');}}
    else if(!video.paused&&video.readyState>=3)status({kind:'PLAYING'});
  };
  const play=()=>{if(!alive())return;seek(true);if(!alive())return;void video.play().catch(e=>{if(!alive())return;if(e.name==='NotAllowedError')status({kind:'BLOCKED',message:'浏览器需要你的操作才能播放'});else if(e.name!=='AbortError')fail('视频无法播放，请检查来源、网络或编码');});};
  const on=(name:string,listener:()=>void)=>{video.addEventListener(name,listener);cleanups.push(()=>video.removeEventListener(name,listener));};
  const duration=()=>{if(!alive())return;if(!Number.isFinite(video.duration)){if(video.duration===Infinity)fail('直播流不支持每日固定排片');return;}if(video.duration>0&&lastDuration!==video.duration){lastDuration=video.duration;options.duration(video.duration);}};
  on('loadedmetadata',()=>{metadata=true;duration();play();});on('durationchange',duration);on('ended',()=>{if(alive())options.ended();});
  on('playing',()=>seek());on('canplay',()=>seek());on('seeked',()=>seek());on('waiting',()=>status({kind:'BUFFERING'}));on('pause',()=>{if(alive()&&!video.ended&&metadata)status({kind:'BLOCKED',message:'播放已暂停，点击按当前时间继续收看'});});on('error',()=>{if(video.error)fail('视频加载失败，请检查链接、网络、CORS或编码支持');});
  const timer=setInterval(()=>seek(),250);const timeout=setTimeout(()=>{if(alive()&&!metadata)fail('视频加载超时，请检查网络或重试');},20000);
  status({kind:'LOADING'});
  const safari=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg/.test(navigator.userAgent);
  if(video.canPlayType('application/vnd.apple.mpegurl')&&(safari||!Hls.isSupported())){
    void readVodDuration(options.program.sourceUrl,abort.signal).then(()=>{if(alive())video.src=options.program.sourceUrl;}).catch(e=>{if(!abort.signal.aborted)fail(e instanceof TypeError?'无法读取点播清单，请检查网络与CORS许可':e.message);});
  }else if(Hls.isSupported()){
    instance=new Hls({maxBufferLength:15,maxMaxBufferLength:30,startLevel:0,startPosition:options.target()?.offset??0});
    instance.on(Hls.Events.LEVEL_LOADED,(_,data)=>{if(!alive())return;if(data.details.live){fail('直播流不支持每日固定排片，请换用点播HLS');return;}if(data.details.totalduration>0)options.duration(data.details.totalduration);});
    instance.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)fail(data.response?.code===404?'视频链接不存在（HTTP 404）':data.details==='manifestParsingError'?'视频清单格式无效':'视频加载失败，请检查网络、CORS或视频编码');});
    instance.loadSource(options.program.sourceUrl);instance.attachMedia(video);
  }else fail('此浏览器不支持HLS播放');
  return {resume:play,sync:()=>seek(true),setVolume(value){if(!disposed){video.volume=value;video.muted=value===0;}},destroy(){if(disposed)return;disposed=true;abort.abort();clearInterval(timer);clearTimeout(timeout);cleanups.forEach(fn=>fn());instance?.destroy();instance=undefined;video.pause();video.removeAttribute('src');video.load();video.remove();}};
}
