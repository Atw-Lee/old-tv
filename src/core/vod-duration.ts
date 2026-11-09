/** Native HLS still requires a finite VOD playlist, not a live sliding window. */
export async function readVodDuration(url:string,signal:AbortSignal):Promise<number>{
  for(let depth=0;depth<4;depth++){
    const response=await fetch(url,{signal,credentials:'omit'});if(!response.ok)throw Error(`视频清单请求失败（HTTP ${response.status}）`);
    const text=await response.text();if(!text.trimStart().startsWith('#EXTM3U'))throw Error('不是有效的HLS清单');
    if(text.includes('#EXT-X-STREAM-INF:')){const lines=text.split(/\r?\n/);const index=lines.findIndex(l=>l.startsWith('#EXT-X-STREAM-INF:'));const next=lines.slice(index+1).find(l=>l.trim()&&!l.startsWith('#'));if(!next)throw Error('HLS主清单没有可用变体');url=new URL(next.trim(),response.url).href;continue;}
    if(!/^#EXT-X-ENDLIST\s*$/m.test(text))throw Error('该链接是直播或未结束的流；每日排片需要可定位的点播HLS');
    const segments=text.split(/\r?\n/).filter(line=>line.startsWith('#EXTINF:')).map(line=>Number(line.slice(8).split(',')[0]));
    if(!segments.length||segments.some(n=>!Number.isFinite(n)||n<=0))throw Error('清单未提供有效的分片时长');
    return segments.reduce((sum,n)=>sum+n,0);
  }
  throw Error('HLS清单层级异常');
}
