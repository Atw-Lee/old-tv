import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const channel=process.argv[2]||'chrome';
const dir=`../docs/evidence/${process.env.M0_RUN||'sync-fix-verified'}-${channel}`;await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel,headless:true});
const context=await browser.newContext({viewport:{width:1200,height:1000}});
const page=await context.newPage();const network=[],results=[];
page.on('request',r=>{const u=new URL(r.url());network.push({at:Date.now(),type:r.resourceType(),url:u.origin+u.pathname});});
const cdp=await context.newCDPSession(page);
const log=()=>page.locator('pre').textContent();
const logs=async()=>{const d=page.waitForEvent('download');await page.getByRole('button',{name:'导出日志'}).click();const file=await(await d).path();return JSON.parse(await fs.readFile(file,'utf8')).logs;};
const setClock=async(t)=>{await page.locator('input[type=datetime-local]').fill('2026-11-02T'+t);await page.getByRole('button',{name:'设置时钟'}).click();};
const on=()=>page.getByRole('button',{name:'加载 / 开机',exact:true}).click();
const off=()=>page.getByRole('button',{name:'销毁 / 关机',exact:true}).click();
const ready=async()=>{
 await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('PLAYING'),null,{timeout:45000});
 await page.waitForFunction(()=>{
   const lines=(document.querySelector('pre')?.textContent||'').split('\n');
   const settled=lines.findLastIndex(l=>l.includes(' sync-settled '));
   if(settled<0)return false;
   const samples=lines.slice(settled+1).filter(l=>l.includes(' sync-sample ')).map(l=>JSON.parse(l.slice(l.indexOf('{'))));
   return samples.length>=3&&samples.slice(-3).every(s=>!s.paused&&s.readyState>=3&&Math.abs(s.drift)<=2)&&document.querySelector('[role=status]')?.textContent?.includes('PLAYING');
 },null,{timeout:60000});
 const rows=await logs();const settled=rows.findLastIndex(x=>x.event==='sync-settled');assert.ok(settled>=0,'Need actual sync-settled event');const samples=rows.slice(settled+1).filter(x=>x.event==='sync-sample'&&!x.data.paused&&x.data.readyState>=3).slice(-3);
 assert.equal(samples.length,3,'Need three actual playing samples');
 for(const x of samples)assert.ok(Math.abs(x.data.drift)<=2,`Drift ${x.data.drift}s exceeds 2s`);
 const media=await page.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,frames:v.getVideoPlaybackQuality().totalVideoFrames}));
 assert.ok(media.frames>0&&!media.paused,'Actual decoded playback required');
 return {settled:rows[settled],samples,media};
};
const check=async(name,fn)=>{
 if(name!=='expired-during-buffering'&&name!=='destroy-31s')return;
 const start=Date.now();
 try{results.push({name,status:'PASS',start,end:Date.now(),data:await fn()});results.at(-1).end=Date.now();}
 catch(e){results.push({name,status:'FAIL',start,end:Date.now(),error:e.message,log:await log()});}
 await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));console.log(name,results.at(-1).status);
};
const throttle=async(enabled)=>{await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:enabled});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:enabled?700:0,downloadThroughput:enabled?250000:-1,uploadThroughput:enabled?125000:-1});};
try{
 await page.goto('http://127.0.0.1:5178/?fixture=mux');await page.getByRole('heading').waitFor();await page.waitForTimeout(1000);
 await page.getByLabel('启用固定时段实验').check();
 await check('normal-start',async()=>{await setClock('09:05');await on();return ready();});
 await check('slow-network-reopen',async()=>{await off();await throttle(true);await setClock('09:08');await on();const data=await ready();await throttle(false);return {...data,network:{latencyMs:700,downloadBytesPerSecond:250000,cacheDisabled:true}};});
 await throttle(false);
 await check('online-recovery',async()=>{await throttle(true);await context.setOffline(true);try{await setClock('09:07');await page.waitForTimeout(2000);}finally{await context.setOffline(false);}const data=await ready();await throttle(false);return data;});
 await check('boundary',async()=>{await setClock('09:59:59');await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:2500});assert.equal(await page.locator('video').count(),0);return {log:await log()};});
 await check('off-during-loading-no-resurrection',async()=>{await throttle(true);await setClock('09:04');await on();await page.waitForTimeout(100);await off();const cutoff=Date.now();await page.waitForTimeout(4000);assert.equal(await page.locator('video').count(),0);assert.match(await page.getByRole('status').textContent(),/OFF/);await throttle(false);return {cutoff,newRequests:network.filter(r=>r.at>cutoff)};});
 await check('expired-during-buffering',async()=>{await throttle(true);await setClock('09:10:33');await on();await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:30000});assert.equal(await page.locator('video').count(),0);await throttle(false);return {log:await log()};});
 await check('destroy-31s',async()=>{await setClock('09:03');await on();await ready();await off();const cutoff=Date.now();await page.waitForTimeout(31000);const media=network.filter(r=>r.at>cutoff&&r.url.includes('test-streams.mux.dev'));assert.equal(media.length,0);return {cutoff,end:Date.now(),newMediaRequests:media};});
 await fs.writeFile(dir+'/events.json',JSON.stringify(await logs(),null,2));await page.screenshot({path:dir+'/final.png',fullPage:true});
 await fs.writeFile(dir+'/environment.json',JSON.stringify({date:'2026-11-02',browser:channel,version:browser.version(),headless:true,source:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',ua:await page.evaluate(()=>navigator.userAgent)},null,2));
}finally{await fs.writeFile(dir+'/network.json',JSON.stringify(network,null,2));await browser.close();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
