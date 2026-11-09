import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const channel=process.argv[2]||'chrome';
const dir=`../docs/evidence/bilibili-mobile-${channel}`;await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel,headless:true});
const context=await browser.newContext({viewport:{width:1200,height:1000}}),page=await context.newPage();
const network=[],samples=[],results=[];
const clean=s=>{try{const u=new URL(s);return u.origin+u.pathname;}catch{return 'unavailable';}};
page.on('request',r=>network.push({at:Date.now(),event:'request',resource:r.resourceType(),url:clean(r.url())}));
page.on('response',r=>network.push({at:Date.now(),event:'response',status:r.status(),url:clean(r.url())}));
page.on('requestfailed',r=>network.push({at:Date.now(),event:'failed',url:clean(r.url()),error:r.failure()}));
const snapshot=async()=>{
 const frame=page.frames().find(f=>f.url().startsWith('https://player.bilibili.com/'));
 if(!frame)return {frame:false};
 return frame.evaluate(()=>{const v=document.querySelector('video');return {frame:true,text:document.body.innerText.slice(0,1600),video:v?{time:v.currentTime,duration:v.duration,paused:v.paused,ended:v.ended,readyState:v.readyState,width:v.videoWidth,volume:v.volume,muted:v.muted,frames:v.getVideoPlaybackQuality().totalVideoFrames}:null};});
};
const observe=async(label,seconds)=>{
 const until=Date.now()+seconds*1000;
 while(Date.now()<until){try{const s={label,at:Date.now(),...await snapshot()};samples.push(s);if(s.video&&!s.video.paused&&s.video.readyState>=2&&s.video.frames>0)return s;}catch(e){samples.push({label,error:e.message});}await page.waitForTimeout(1000);}
 return samples.at(-1);
};
try{
 await page.goto('http://127.0.0.1:5178');await page.getByRole('heading').waitFor();
 await fs.writeFile(dir+'/environment.json',JSON.stringify({date:'2026-11-02',os:'macOS 26.6.2',browser:channel,version:browser.version(),headless:true,network:'User reports switching from intranet to mobile data; no system network settings changed by agent',source:'BV1B7411m7LV',observation:'Cross-origin video state is read by browser test instrumentation only; app does not access iframe internals'},null,2));
 await page.locator('select').selectOption('bilibili');await page.locator('input[type=number]').fill('30');
 const started=Date.now();await page.getByRole('button',{name:'加载 / 开机',exact:true}).click();
 const first=await observe('t30',45);await page.screenshot({path:dir+'/t30.png',fullPage:true});
 let playing=!!first?.video&&!first.video.paused&&first.video.width>0;
 if(playing){await page.waitForTimeout(1500);const second=await snapshot();samples.push({label:'progress',at:Date.now(),...second});playing=second.video.time>first.video.time&&second.video.frames>first.video.frames;results.push({id:'M0-06',status:playing?'PASS':'FAIL',first,second});results.push({id:'M0-07',status:Math.abs(first.video.time-30)<=2?'PASS':'FAIL',target:30,firstTime:first.video.time,loadDelayMs:first.at-started});
 const parentAccess=await page.evaluate(()=>{try{return {accessible:!!document.querySelector('iframe')?.contentWindow?.document};}catch(e){return {accessible:false,error:e.name};}});
 const before=await snapshot();await page.locator('input[type=range]').fill('0.2');await page.waitForTimeout(1000);const after=await snapshot();
 results.push({id:'M0-08',status:'BLOCKED',parentAccess,volumeObservation:{before:before.video,after:after.video},note:'Current harness has no official Bilibili external control API. UI change alone does not test a supported API. Do not infer permanent platform inability.'});
 }else{results.push({id:'M0-06',status:'BLOCKED',actual:first});results.push({id:'M0-07',status:'BLOCKED',reason:'No actual playing media to verify t=30'});results.push({id:'M0-08',status:'BLOCKED',reason:'Media not playing; no public external control contract in official parameter documentation'});}
 await page.getByRole('button',{name:'销毁 / 关机',exact:true}).click();const cutoff=Date.now();await page.waitForTimeout(31000);
 const newRequests=network.filter(r=>r.event==='request'&&r.at>cutoff);
 results.push({id:'M0-09',status:playing?(newRequests.length===0?'PASS':'FAIL'):'BLOCKED',cutoff,end:Date.now(),iframeCount:await page.locator('iframe').count(),newRequests,previouslyPlaying:playing});
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'导出日志'}).click();await(await d).saveAs(dir+'/events.json');await page.screenshot({path:dir+'/removed.png',fullPage:true});
} catch(e){results.push({id:'environment',status:'BLOCKED',error:e.stack});}
finally{await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));await fs.writeFile(dir+'/samples.json',JSON.stringify(samples,null,2));await fs.writeFile(dir+'/network.json',JSON.stringify(network,null,2));console.log(JSON.stringify(results));await browser.close();}
