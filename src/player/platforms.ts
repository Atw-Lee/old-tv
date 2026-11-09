import {rememberDuration} from '../core/youtube-duration.js';
import {platformId} from '../core/source-id.js';
import type {Player,PlaybackOptions} from './types.js';
type YPlayer={playVideo():void;seekTo(n:number,allow:boolean):void;setVolume(n:number):void;mute():void;unMute():void;getCurrentTime():number;getDuration():number;getPlayerState():number;destroy():void};
type YApi={Player:new(el:HTMLElement,options:Record<string,unknown>)=>YPlayer};
declare global {interface Window{YT?:YApi;onYouTubeIframeAPIReady?:()=>void}}
let apiPromise:Promise<YApi>|undefined;
export function loadYouTube():Promise<YApi>{
  if(window.YT?.Player)return Promise.resolve(window.YT);if(apiPromise)return apiPromise;
  apiPromise=new Promise<YApi>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(Error('YouTube API连接超时，请检查网络'));},15000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);if(window.YT)resolve(window.YT);else reject(Error('YouTube API不可用'));};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('无法连接YouTube API'));};document.head.append(script);
  }).catch(e=>{apiPromise=undefined;throw e;});return apiPromise;
}
export function createYouTube(host:HTMLElement,options:PlaybackOptions):Player {
  const id=platformId(options.program);let disposed=false,failed=false,ready=false,player:YPlayer|undefined,volume=options.volume,lastDuration=0,lastSeek=-Infinity;let attempts:number[]=[];
  const alive=()=>!disposed&&!failed&&options.target()!==null;
  const fail=(message:string)=>{if(!alive())return;options.status({kind:'ERROR',message});failed=true;player?.destroy();player=undefined;};
  const setVolume=(value:number)=>{volume=value;if(ready&&player){player.setVolume(value*100);if(value===0)player.mute();else player.unMute();}};
  const sync=(force=false)=>{if(!alive()||!ready||!player)return;const target=options.target();if(!target)return;
    const duration=player.getDuration();if(duration>0&&duration!==lastDuration){lastDuration=duration;rememberDuration(id,duration);options.duration(duration);if(!alive())return;}
    if(duration>0&&target.offset>=duration){options.ended();return;}
    const now=performance.now();attempts=attempts.filter(t=>now-t<10000);
    if((force||player.getPlayerState()===1)&&Math.abs(player.getCurrentTime()-target.offset)>.5&&(force||(now-lastSeek>=1000&&attempts.length<3))){lastSeek=now;attempts.push(now);player.seekTo(target.offset,true);}
  };
  const play=()=>{if(!alive()||!ready)return;sync(true);player?.playVideo();};
  options.status({kind:'LOADING'});
  void loadYouTube().then(api=>{if(!alive())return;const element=document.createElement('div');host.append(element);player=new api.Player(element,{videoId:id,width:'100%',height:'100%',playerVars:{autoplay:1,controls:0,disablekb:1,playsinline:1,origin:location.origin,start:Math.floor(options.target()?.offset??0)},events:{
    onReady:()=>{if(!alive())return;ready=true;setVolume(volume);play();},
    onStateChange:(event:{data:number})=>{if(!alive())return;if(event.data===0)options.ended();else if(event.data===1){sync();options.status({kind:'PLAYING'});}else if(event.data===2)options.status({kind:'BLOCKED',message:'平台播放器已暂停，点击继续收看'});else if(event.data===3)options.status({kind:'BUFFERING'});},
    onAutoplayBlocked:()=>{if(alive())options.status({kind:'BLOCKED',message:'浏览器阻止自动播放，请点击继续收看'});},
    onError:(event:{data:number})=>fail(`YouTube无法播放（${event.data}），可能禁止嵌入或有地区/登录限制`),
  }});}).catch(e=>fail(e.message));
  const timer=setInterval(()=>sync(),500);const timeout=setTimeout(()=>{if(alive()&&!ready)fail('YouTube播放器加载超时');},25000);
  return {resume:play,sync:()=>sync(true),setVolume,destroy(){if(disposed)return;disposed=true;clearInterval(timer);clearTimeout(timeout);player?.destroy();player=undefined;host.replaceChildren();}};
}
export function createBilibili(host:HTMLElement,options:PlaybackOptions):Player {
  const id=platformId(options.program),frame=document.createElement('iframe');let disposed=false;
  const target=options.target();const params=new URLSearchParams({bvid:id,t:String(Math.floor(target?.offset??0)),autoplay:'1',muted:options.volume===0?'1':'0',danmaku:'0'});
  const p=new URL(options.program.sourceUrl).searchParams.get('p');if(p&&/^\d+$/.test(p))params.set('p',p);
  frame.src=`https://player.bilibili.com/player.html?${params}`;frame.title=options.program.title;frame.allow='autoplay; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  const note='B站受限来源：音量请使用视频内控件或系统音量；无法获取播放状态及提前结束通知。';
  options.status({kind:'LIMITED',message:note});host.append(frame);
  // Cross-origin load is not proof of playback. No invented postMessage controls.
  return {resume(){},sync(){},setVolume(){},destroy(){if(disposed)return;disposed=true;frame.remove();}};
}
