import type {Program} from './model.js';
export function platformId(program: Program): string {
  const u=new URL(program.sourceUrl);
  if(program.sourceType==='youtube'){
    if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname))throw Error('请输入YouTube官方视频链接或合法视频ID');
    const value=program.sourceId??(u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')??u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);
    if(!value||! /^[\w-]{11}$/.test(value))throw Error('无法识别YouTube视频ID');return value;
  }
  if(!['bilibili.com','www.bilibili.com','m.bilibili.com','player.bilibili.com'].includes(u.hostname))throw Error('请输入B站官方视频链接或BV号，短链接请先打开再复制完整地址');
  const value=program.sourceId??u.searchParams.get('bvid')??u.pathname.match(/\/(BV[\w]+)/)?.[1];
  if(!value||!/^BV[\w]{10}$/.test(value))throw Error('无法识别B站BV号');return value;
}
