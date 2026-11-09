import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {startFixtures} from './fixtures.mjs';
const channel=process.argv[2]||'chrome',dir=path.resolve('../docs/evidence',process.env.M0_LABEL||channel+'-final');await fs.mkdir(dir,{recursive:true});
const events=[],checks=[];const clean=u=>{try{const x=new URL(u);return x.origin+x.pathname;}catch{return u;}};
const fixturePort=channel==='chrome'?5179:5181;
const fixture=startFixtures(fixturePort);
let browser;
try{
 browser=await chromium.launch({channel,headless:true});
 const context=await browser.newContext({viewport:{width:1200,height:1000}}),page=await context.newPage();
 page.on('request',r=>events.push({at:Date.now(),type:'request',url:clean(r.url()),resource:r.resourceType()}));
 page.on('requestfailed',r=>events.push({at:Date.now(),type:'failed',url:clean(r.url()),error:r.failure()}));
 page.on('response',r=>{if(/m3u8|\.ts|\.m4s|videoplayback/.test(r.url()))events.push({at:Date.now(),type:'response',url:clean(r.url()),status:r.status()});});
 page.on('console',m=>{if(m.type()==='error')events.push({at:Date.now(),type:'console',text:m.text().replace(/https?:\/\/[^\s]+/g,clean)});});
 page.on('pageerror',e=>events.push({at:Date.now(),type:'pageerror',message:e.message}));
 await page.goto('http://127.0.0.1:5178');await page.getByRole('heading').waitFor();await page.waitForTimeout(1500);
 await fs.writeFile(path.join(dir,'environment.json'),JSON.stringify({date:'2026-11-02',channel,version:browser.version(),headless:true,ua:await page.evaluate(()=>navigator.userAgent),os:'macOS 26.6.2',policy:'Default browser policy; no autoplay overrides; isolated profile'},null,2));
 const check=async(name,fn)=>{try{checks.push({name,execution:'COMPLETED',at:Date.now(),data:await fn()});}catch(e){checks.push({name,execution:'BLOCKED',at:Date.now(),error:e.message});}await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(checks,null,2));console.log(name,checks.at(-1).execution);};
 const source=page.locator('input.source'),load=()=>page.getByRole('button',{name:'加载 / 开机',exact:true}).click(),off=()=>page.getByRole('button',{name:'销毁 / 关机',exact:true}).click();
 const snapshot=()=>page.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,readyState:v.readyState,width:v.videoWidth,volume:v.volume,muted:v.muted,decoded:v.getVideoPlaybackQuality().totalVideoFrames,audioDecodedBytes:v.webkitAudioDecodedByteCount}));
 const playing=()=>page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2&&v.videoWidth>0;},null,{timeout:25000});
 const target=async(n)=>{await page.locator('input[type=number]').fill(String(n));await page.getByRole('button',{name:'定位',exact:true}).click();await page.waitForFunction(n=>{const v=document.querySelector('video');return v&&!v.seeking&&Math.abs(v.currentTime-n)<2&&v.readyState>=2;},n,{timeout:20000});return snapshot();};
 const dump=async(name)=>{const d=page.waitForEvent('download');await page.getByRole('button',{name:'导出日志'}).click();await(await d).saveAs(path.join(dir,name+'.json'));await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});};
 const setClock=async(s)=>{await page.locator('input[type=datetime-local]').fill(('2026-11-02T'+s).replace(/:00$/, ''));await page.getByRole('button',{name:'设置时钟'}).click();};
 await check('hls-load',async()=>{if(process.env.M0_HLS_URL)await source.fill(process.env.M0_HLS_URL);await load();await playing();const a=await snapshot();await page.waitForTimeout(1200);return {a,b:await snapshot()};});
 if(checks.at(-1).execution==='COMPLETED'){
 await check('hls-seek-0',()=>target(0));
 await check('hls-seek-1800',async()=>{if((await snapshot()).duration<1860)throw Error('Source shorter than 31 minutes');return target(1800);});
 await check('hls-volume-mute',async()=>{await page.locator('input[type=range]').fill('0.2');await page.getByLabel('静音',{exact:true}).uncheck();return snapshot();});await dump('hls-playing');
 await check('hls-destroy-30s',async()=>{await off();const cutoff=Date.now();await page.waitForTimeout(31000);return {cutoff,end:Date.now(),newSegments:events.filter(e=>e.type==='request'&&e.at>cutoff&&/\.ts$|\.m4s$/.test(e.url))};});
 await check('schedule-0930',async()=>{await page.getByLabel('静音',{exact:true}).check();await page.getByLabel('启用固定时段实验').check();await setClock('09:30:00');await load();await page.waitForTimeout(5000);if(await page.locator('video').count()===0)throw Error('NO_SIGNAL: source shorter than required offset');await playing();return snapshot();});
 await check('schedule-boundary',async()=>{await setClock('09:10:00');await load();await playing();await setClock('09:59:59');const t=Date.now();await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:2500});return {elapsed:Date.now()-t,status:await page.getByRole('status').textContent()};});
 await check('power-reopen',async()=>{await setClock('09:20:00');await load();await playing();return snapshot();});
 await check('network-recalibration',async()=>{await context.setOffline(true);try{await setClock('09:25:00');}finally{await context.setOffline(false);}await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&v.currentTime>=1500&&v.currentTime<1510&&v.readyState>=2;},null,{timeout:20000});return snapshot();});
 await page.getByLabel('启用固定时段实验').uncheck();
 await check('ended-no-signal',async()=>{await page.getByRole('button',{name:'跳至结尾前 2 秒'}).click();await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:25000});await page.waitForTimeout(2000);return {videos:await page.locator('video').count(),status:await page.getByRole('status').textContent()};});
 }
 await dump('hls-final');await off();
 for(const [name,url] of [['404',`http://127.0.0.1:${fixturePort}/404.m3u8`],['cors',`http://127.0.0.1:${fixturePort}/cors.m3u8`],['invalid','http://127.0.0.1:5178/invalid.m3u8']]){await check('error-'+name,async()=>{await source.fill(url);await load();await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('PLAYBACK_ERROR'),null,{timeout:18000});return {status:await page.getByRole('status').textContent()};});await off();}await dump('errors');
 for(const provider of ['bilibili','youtube']){
 await page.locator('select').selectOption(provider);await page.locator('input[type=number]').fill('30');
 await check(provider+'-load',async()=>{await load();await page.waitForTimeout(18000);return {status:await page.getByRole('status').textContent(),frames:page.frames().map(f=>clean(f.url())),note:'Execution only; final PASS requires actual media observations'};});await dump(provider);await off();const cutoff=Date.now();await page.waitForTimeout(31000);checks.push({name:provider+'-removed',execution:'COMPLETED',data:{cutoff,end:Date.now(),iframes:await page.locator('iframe').count(),requests:events.filter(e=>e.type==='request'&&e.at>cutoff)}});
 }
 await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(checks,null,2));await context.close();
}catch(e){await fs.writeFile(path.join(dir,'fatal.txt'),e.stack);console.error(e);}finally{await browser?.close();fixture.close();await fs.writeFile(path.join(dir,'network.json'),JSON.stringify(events,null,2));}
