import {useEffect,useRef,useState} from 'react';
import Hls from 'hls.js';
import {Play} from 'lucide-react';
import {platformId} from '../../core/source-id.js';
import {Button} from '../../components/ui/button.js';

export function SourcePreview({type,url}:{type:'bilibili'|'hls-vod';url:string}){
  const video=useRef<HTMLVideoElement>(null);
  const [play,setPlay]=useState(false),[frame,setFrame]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let engine:Hls|undefined;const media=video.current;
    const timer=setTimeout(()=>{
      try{
        if(type==='bilibili'){
          const sourceUrl=/^BV[\w]{10}$/.test(url)?'https://www.bilibili.com/video/'+url:url;
          const id=platformId({id:'preview',title:'预览',sourceType:type,sourceUrl});
          const params=new URLSearchParams({bvid:id,autoplay:'0',danmaku:'0'});
          const part=new URL(sourceUrl).searchParams.get('p');if(part&&/^\d+$/.test(part))params.set('p',part);
          setFrame('https://player.bilibili.com/player.html?'+params);return;
        }
        const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('请输入有效的 HLS 地址。');
        if(!play||!media)return;
        const start=()=>{void media.play().catch(()=>{/* Native controls allow another attempt. */});};
        if(media.canPlayType('application/vnd.apple.mpegurl')){media.src=url;start();}
        else if(Hls.isSupported()){
          engine=new Hls({maxBufferLength:12});engine.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){setError('无法播放预览，请检查链接和跨站访问权限。');engine?.destroy();engine=undefined;}});
          engine.on(Hls.Events.MANIFEST_PARSED,start);engine.loadSource(url);engine.attachMedia(media);
        }else throw Error('当前浏览器不支持 HLS 预览。');
      }catch(e){setError(e instanceof Error?e.message:'无法加载预览');}
    },play?0:400);
    return ()=>{clearTimeout(timer);engine?.destroy();if(media){media.pause();media.removeAttribute('src');media.load();}};
  },[type,url,play]);
  return <div className="source-preview" aria-label="视频预览">{error?<span role="status">{error}</span>:type==='bilibili'?(frame?<iframe src={frame} title="Bilibili 视频预览" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<span>正在加载 Bilibili 预览…</span>):play?<video ref={video} controls playsInline onError={()=>setError('无法播放 HLS 预览。')}/>:<Button type="button" variant="outline" onClick={()=>setPlay(true)}><Play/>播放 HLS 预览</Button>}</div>;
}
