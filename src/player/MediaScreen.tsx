import {useEffect,useRef,useState} from 'react';
import type {TVController} from '../core/tv-controller.js';
import type {Player,PlaybackStatus,PlaybackOptions} from './types.js';
import {createHls} from './hls.js';
import {createYouTube,createBilibili} from './platforms.js';
import {Button} from '../components/ui/button.js';
export function MediaScreen({controller,token}:{controller:TVController;token:number}){
  const host=useRef<HTMLDivElement>(null),instance=useRef<Player|null>(null);
  const [status,setStatus]=useState<PlaybackStatus>({kind:'LOADING'}),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const state=controller.getSnapshot().schedule;if(!host.current||state.kind!=='AIR'||state.token!==token)return;
    let disposed=false;const start=state.target.startMs,end=state.target.endMs;
    const valid=()=>{const s=controller.getSnapshot().schedule;return !disposed&&s.kind==='AIR'&&s.token===token;};
    const options:PlaybackOptions={program:state.target.program,volume:controller.getSnapshot().volume,
      target:()=>{if(!valid())return null;const now=Date.now();if(now<start||now>=end){controller.refresh();return null;}const current=controller.getSnapshot().schedule;if(current.kind!=='AIR')return null;const elapsed=(now-start)/1000,duration=current.target.durationSeconds;return {offset:current.target.schedule.endBehavior==='loop'&&duration!==undefined?elapsed%duration:elapsed};},
      status:s=>{if(valid())setStatus(s);},duration:n=>{if(valid())controller.mediaDuration(token,n);},ended:()=>{if(valid())controller.mediaEnded(token);}};
    const stop=()=>{disposed=true;instance.current?.destroy();instance.current=null;};
    let appliedVolume=options.volume;const unsubscribe=controller.subscribe(()=>{if(!valid())stop();else {const next=controller.getSnapshot().volume;if(next!==appliedVolume){appliedVolume=next;instance.current?.setVolume(next);}}});
    try{instance.current=state.target.program.sourceType==='hls-vod'?createHls(host.current,options):state.target.program.sourceType==='youtube'?createYouTube(host.current,options):createBilibili(host.current,options);}catch(e){setStatus({kind:'ERROR',message:e instanceof Error?e.message:String(e)});}
    const online=()=>setRetry(n=>n+1),shown=()=>{if(document.visibilityState==='visible'){if(state.target.program.sourceType==='bilibili')setRetry(n=>n+1);else instance.current?.sync();}};
    const pageshow=()=>setRetry(n=>n+1);
    window.addEventListener('online',online);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',pageshow);document.addEventListener('visibilitychange',shown);
    return ()=>{stop();unsubscribe();window.removeEventListener('online',online);window.removeEventListener('pagehide',stop);window.removeEventListener('pageshow',pageshow);document.removeEventListener('visibilitychange',shown);};
  },[controller,token,retry]);
  return <div className="media-screen" data-playback={status.kind}>
    <div className="media-host" ref={host}/>
    {status.kind==='LIMITED'&&<span className="sr-only" role="status">{status.message}</span>}
    {status.kind!=='PLAYING'&&status.kind!=='LIMITED'&&<div className={`playback-overlay playback-${status.kind.toLowerCase()}`} role="status"><p>{status.message??(status.kind==='LOADING'?'正在接收信号…':'正在缓冲与同步…')}</p>{status.kind==='BLOCKED'&&<Button onClick={()=>instance.current?.resume()}>点击继续收看</Button>}{status.kind==='ERROR'&&<Button onClick={()=>setRetry(n=>n+1)}>重新连接</Button>}</div>}
  </div>;
}
