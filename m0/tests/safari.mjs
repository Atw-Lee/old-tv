import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='../docs/evidence/'+(process.env.M0_RUN||'safari-new-run');await fs.mkdir(dir,{recursive:true});
const response=await fetch('http://127.0.0.1:5182/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({capabilities:{alwaysMatch:{browserName:'safari'}}})});
const session=(await response.json()).value;if(session.error)throw Error(session.message);
const base='http://127.0.0.1:5182/session/'+session.sessionId;
async function wd(method,path='',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();if(j.value?.error)throw Error(j.value.error+': '+j.value.message);return j.value;}
const js=(script,...args)=>wd('POST','/execute/sync',{script,args});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
const state=()=>js(`const v=document.querySelector('video');return {status:document.querySelector('[role=status]')?.textContent,visibility:document.visibilityState,media:v?{time:v.currentTime,duration:v.duration,paused:v.paused,seeking:v.seeking,readyState:v.readyState,width:v.videoWidth,volume:v.volume,muted:v.muted,frames:v.getVideoPlaybackQuality?.().totalVideoFrames}:null,log:document.querySelector('pre')?.textContent,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,start:r.startTime,duration:r.duration}))};`);
async function shot(name){await fs.writeFile(dir+'/'+name+'.png',Buffer.from(await wd('GET','/screenshot'),'base64'));}
async function click(selector){await js("document.querySelector(arguments[0]).click()",selector);await pause(200);}
async function button(text){await js("[...document.querySelectorAll('button')].find(b=>b.textContent===arguments[0]).click()",text);await pause(200);}
async function value(selector,value){await js(`const e=document.querySelector(arguments[0]);Object.getOwnPropertyDescriptor(e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,arguments[1]);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));`,selector,String(value));}
async function clock(t){await value('input[type=datetime-local]','2026-11-02T'+t);await button('设置时钟');}
async function until(fn,timeout=60000){const end=Date.now()+timeout;let s;while(Date.now()<end){s=await state();if(fn(s))return s;await pause(300);}throw Error('Timed out: '+JSON.stringify(s));}
async function check(name,fn){const start=Date.now();try{const data=await fn();results.push({name,status:name==='boundary'?'NOT RUN':name==='destroy-observation-31s'?'BLOCKED':'PASS',start,end:Date.now(),data});}catch(e){results.push({name,status:'FAIL',start,end:Date.now(),error:e.message});}await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));await fs.writeFile(dir+'/'+name+'.json',JSON.stringify(await state(),null,2));console.log(name,results.at(-1).status);}
async function stable(){await until(s=>s.status?.includes('PLAYING')&&s.media?.readyState>=3&&!s.media.paused);await pause(4000);const s=await state();const rows=s.log.split('\n').filter(l=>l.includes(' sync-sample ')).slice(-3).map(l=>JSON.parse(l.slice(l.indexOf('{'))));assert.equal(rows.length,3);assert.ok(rows.every(r=>Math.abs(r.drift)<=2&&!r.paused));return {samples:rows,media:s.media};}
try{
 await fs.writeFile(dir+'/environment.json',JSON.stringify({date:'2026-11-02',...session.capabilities,source:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',interaction:'DOM click; not trusted gesture autoplay evidence',driver:'Official Safari WebDriver; user enabled remote automation; no autoplay policy override'},null,2));
 await wd('POST','/url',{url:'http://127.0.0.1:5178/?fixture=mux'});await until(s=>!!s.status);await pause(1500);
 await check('native-play',async()=>{await button('加载 / 开机');const a=await until(s=>s.media?.time>1&&!s.media.paused&&s.media.readyState>=3&&s.media.width>0);await pause(1500);const b=await state();assert.ok(b.media.time>a.media.time&&b.media.frames>a.media.frames);assert.match(b.log,/'?engine"?:"native"/);await shot('playing');return {a:a.media,b:b.media};});
 await check('seek-60',async()=>{await value('input[type=number]',60);await button('定位');const s=await until(s=>s.media&&!s.media.seeking&&s.media.readyState>=2&&Math.abs(s.media.time-60)<2);return s.media;});
 await check('volume-mute',async()=>{await value('input[type=range]',.2);await click('input[type=checkbox]');await pause(500);const s=await state();assert.equal(s.media.volume,.2);assert.equal(s.media.muted,false);return s.media;});
 await click('input[type=checkbox]');await button('点击继续收看');
 await check('ended',async()=>{await button('跳至结尾前 2 秒');const s=await until(s=>s.status.includes('NO_SIGNAL'));assert.match(s.log,/ ended /);return {log:s.log};});
 await click('section:nth-of-type(2) input[type=checkbox]');
 await check('scheduled-reopen',async()=>{await clock('09:05');await button('加载 / 开机');return stable();});
 await check('real-tab-background',async()=>{
 const original=await wd('GET','/window');const before=await state();
 const tab=await wd('POST','/window/new',{type:'tab'});await wd('POST','/window',{handle:tab.handle});await wd('POST','/url',{url:'about:blank'});await pause(6000);
 await wd('DELETE','/window');await wd('POST','/window',{handle:original});await pause(2500);
 const after=await state();assert.match(after.log,/visibility .*"state":"hidden"/);assert.match(after.log,/visibility .*"state":"visible"/);assert.match(after.log,/recalibrate/);const stableAfter=await stable();return {before:before.media,after:after.media,log:after.log,stableAfter};
 });
 await check('boundary',async()=>{await clock('09:59:59');const start=Date.now();await until(s=>s.status.includes('NO_SIGNAL'),2500);return {elapsedMs:Date.now()-start};});
 await check('destroy-observation-31s',async()=>{await clock('09:04');await button('加载 / 开机');await stable();const before=await state();await button('销毁 / 关机');const cutoff=Date.now();await pause(31000);const after=await state();assert.equal(after.media,null);assert.match(after.status,/OFF/);return {cutoff,end:Date.now(),beforeResources:before.resources,afterResources:after.resources,note:'Resource Timing coverage must be reviewed; DOM removal alone does not prove native HLS network shutdown'};});
 await shot('final');
}finally{await fs.writeFile(dir+'/final.json',JSON.stringify(await state(),null,2));await wd('DELETE');}
