// Only duration and video ID are cached, never a URL with private parameters.
export function rememberDuration(id:string,seconds:number){
  if(Number.isFinite(seconds)&&seconds>0)try{sessionStorage.setItem('yt-length:'+id,String(seconds));}catch{/* Storage may be disabled. */}
}
export function cachedDuration(id:string){
  try{const n=Number(sessionStorage.getItem('yt-length:'+id));if(Number.isFinite(n)&&n>0)return n;}catch{/* Storage may be disabled. */}
  return undefined;
}
