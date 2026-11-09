import {useEffect,useRef,useState} from 'react';
import {Film,LoaderCircle} from 'lucide-react';
import type {Program,SourceType} from '../../core/model.js';
import {platformId} from '../../core/source-id.js';
import {readVodDuration} from '../../core/vod-duration.js';
import {loadYouTube} from '../../player/platforms.js';
import {cachedDuration,rememberDuration} from '../../core/youtube-duration.js';
import {SourcePreview} from './SourcePreview.js';
import {Input} from '../../components/ui/input.js';
import {Button} from '../../components/ui/button.js';

export function durationText(seconds?:number){
  if(seconds===undefined)return '未知';
  const n=Math.round(seconds),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
  return h?h+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'):m+':'+String(s).padStart(2,'0');
}
function DurationPicker({initial}:{initial:number|undefined}){
  const [edited,setEdited]=useState<string|null>(null);
  const representable=initial!==undefined&&initial<86400;
  const original=representable?[Math.floor(initial/3600),Math.floor(initial/60)%60,Math.floor(initial)%60].map(n=>String(n).padStart(2,'0')).join(':'):initial===undefined?'00:00:00':'';
  const [h=0,m=0,s=0]=(edited??'').split(':').map(Number);
  const total=edited===null?initial:h*3600+m*60+s;
  return <><Input type="time" step={1} aria-label="视频时长" value={edited??original} onChange={e=>setEdited(e.target.value)}/>
    <input type="hidden" name="durationSeconds" value={total||''}/>
    {edited===null&&initial!==undefined&&!representable&&<span className="field-hint">已保留原时长 {durationText(initial)}；重新选择会替换此值。</span>}</>;
}
// Mount with a source-specific key: no response can populate a different URL.
export function DurationField({type,url,known,onRead,editable=false}:{type:SourceType;url:string;known:number|undefined;editable?:boolean;onRead?:(seconds:number)=>void}){
  const [attempt,retry]=useState(0),[seconds,setSeconds]=useState(known);
  const [status,setStatus]=useState(''),[pending,setPending]=useState(false);
  const [ready,setReady]=useState(false);
  const preview=useRef<HTMLDivElement>(null);
  const callback=useRef(onRead);
  callback.current=onRead;
  useEffect(()=>{
    if(!url||type==='bilibili'||(!attempt&&known!==undefined&&!(editable&&type==='youtube')))return;
    setReady(false);setPending(true);setStatus('');
    const abort=new AbortController();let timeout:ReturnType<typeof setTimeout>;
    let poll:ReturnType<typeof setInterval>|undefined,observer:IntersectionObserver|undefined,player:{destroy():void}|undefined;
    const host=preview.current;
    function cleanup(){abort.abort();clearTimeout(timeout);clearInterval(poll);observer?.disconnect();player?.destroy();player=undefined;host?.replaceChildren();}
    function finish(n?:number){if(abort.signal.aborted)return;const keep=editable&&type==='youtube'&&n!==undefined&&n>0;if(keep){clearTimeout(timeout);clearInterval(poll);observer?.disconnect();}else {cleanup();setReady(false);}setPending(false);
      if(n!==undefined&&Number.isFinite(n)&&n>0){setSeconds(n);setStatus('');callback.current?.(n);}
      else setStatus('未能读取时长，可手动填写排片结束时间。');}
    const debounce=setTimeout(async()=>{
      timeout=setTimeout(()=>{finish();if(type==='youtube')setStatus('读取超时，请检查网络或换一个允许嵌入的点播视频。');},type==='youtube'?32000:16000);
      try{
        if(type==='hls-vod'){
          const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();
          finish(await readVodDuration(u.href,abort.signal));return;
        }
        const program:Program={id:'probe',title:'时长预览',sourceType:type,sourceUrl:/^[\w-]{11}$/.test(url)?'https://www.youtube.com/watch?v='+url:url};
        const id=platformId(program),cached=cachedDuration(id);
        if(!attempt&&cached!==undefined){if(!editable){finish(cached);return;}setSeconds(cached);}
        const api=await loadYouTube();if(abort.signal.aborted||!host)return;
        const element=document.createElement('div');host.append(element);
        let measured=false;
        const read=()=>{if(abort.signal.aborted||measured)return;const n=yt.getDuration?.();if(Number.isFinite(n)&&n>0){measured=true;rememberDuration(id,n);finish(n);}};
        const yt=new api.Player(element,{videoId:id,width:'100%',height:200,playerVars:{autoplay:0,controls:1,playsinline:1,origin:location.origin},events:{
          onReady:()=>{
            if(abort.signal.aborted)return;
            setReady(true);read();if(abort.signal.aborted||measured)return;
            if(editable&&!attempt&&(known!==undefined||cached!==undefined)){finish(known??cached);return;}
            yt.mute();poll=setInterval(read,200);
            setStatus('正在读取视频信息；如未开始，请点预览中的播放按钮。');
            observer=new IntersectionObserver(entries=>{
              if(!abort.signal.aborted&&document.visibilityState==='visible'&&entries.some(e=>e.intersectionRatio>0.5)&&!document.querySelector('.media-host iframe[src*="youtube"]')){
                observer?.disconnect();yt.playVideo();
              }
            },{threshold:[0.51]});observer.observe(host);
          },
          onStateChange:()=>{if(!abort.signal.aborted&&player)read();},
          onError:(event:{data:number})=>{if(abort.signal.aborted)return;finish();setStatus('YouTube 无法载入此视频（'+event.data+'），请确认链接有效且允许嵌入。');},
        }});player=yt;
      }catch(e){if(!abort.signal.aborted){finish();if(type==='youtube'&&e instanceof Error)setStatus(e.message);}}
    },attempt?0:450);
    return ()=>{clearTimeout(debounce);cleanup();};
  },[type,url,known,attempt,editable]);
  const manual=editable&&type==='bilibili';
  const youtubePreview=type==='youtube'&&<div className="duration-stage" hidden={editable?!url:!pending}>
      {!ready&&<div className="duration-placeholder" role="status">{pending?<><LoaderCircle className="spin" aria-hidden="true"/>正在加载 YouTube 预览…</>:<><Film aria-hidden="true"/>视频预览暂不可用</>}</div>}
      <div ref={preview} className="duration-preview" hidden={!ready}/>
    </div>;
  return <>{editable?<div className="control-field"><span>视频预览</span>
    {!url&&<div className="duration-placeholder"><Film aria-hidden="true"/>填写链接后可在这里预览视频</div>}
    {url&&type!=='youtube'&&<SourcePreview key={url} type={type} url={url}/>}
    {youtubePreview}</div>:youtubePreview}
    <div className="control-field duration-field"><span>视频时长</span>
    {manual?<DurationPicker initial={known}/>:<div className="duration-result" aria-busy={pending}>
      <output aria-label="视频时长">{durationText(seconds)}</output>
      {seconds!==undefined&&<input type="hidden" name="durationSeconds" value={seconds}/>}
      {url&&type!=='bilibili'&&<Button type="button" variant="outline" disabled={pending} onClick={()=>retry(n=>n+1)}>{pending?<><LoaderCircle aria-hidden="true" className="spin"/>正在读取…</>:'重新读取'}</Button>}
    </div>}
    {(type==='bilibili'||status)&&<div role="status" className="field-hint">{type==='bilibili'?(editable?'按播放器显示的时、分、秒填写后，电视可按时间循环或切到无信号。':'时长可在视频源中填写。'):status}</div>}
  </div></>;
}
