import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const dir='../docs/evidence/chrome-mux';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1100,height:900}}),p=await c.newPage();const results=[],requests=[];p.on('request',r=>{const u=new URL(r.url());requests.push({at:Date.now(),url:u.origin+u.pathname,type:r.resourceType()});});
const check=async(name,fn)=>{try{results.push({name,execution:'COMPLETED',data:await fn()});}catch(e){results.push({name,execution:'BLOCKED',error:e.message});}console.log(name,results.at(-1).execution);await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));};
const sample=()=>p.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,readyState:v.readyState,width:v.videoWidth,frames:v.getVideoPlaybackQuality().totalVideoFrames}));
const playing=()=>p.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2&&v.videoWidth>0;},null,{timeout:25000});
const clock=async(t)=>{await p.locator('input[type=datetime-local]').fill('2026-11-02T'+t);await p.getByRole('button',{name:'设置时钟'}).click();};
try{
 await p.goto('http://127.0.0.1:5178');await p.getByRole('heading').waitFor();
 await p.locator('input.source').fill('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
 await p.getByLabel('启用固定时段实验').check();await clock('09:05');await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();
 await check('scheduled-load-300',async()=>{await playing();return sample();});
 await check('boundary',async()=>{await clock('09:59:59');await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:2500});return p.locator('pre').textContent();});
 await check('reopen-480',async()=>{await clock('09:08');await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();await playing();return sample();});
 await check('early-ended',async()=>{await p.getByRole('button',{name:'跳至结尾前 2 秒'}).click();await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:25000});await p.waitForTimeout(2000);return {videos:await p.locator('video').count(),log:await p.locator('pre').textContent()};});
 await clock('09:05');await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();await playing();
 await check('destroy-31s',async()=>{await p.getByRole('button',{name:'销毁 / 关机',exact:true}).click();const cutoff=Date.now();await p.waitForTimeout(31000);return {cutoff,end:Date.now(),newRequests:requests.filter(r=>r.at>cutoff)};});
 await fs.writeFile(dir+'/network.json',JSON.stringify(requests,null,2));
 const d=p.waitForEvent('download');await p.getByRole('button',{name:'导出日志'}).click();await(await d).saveAs(dir+'/events.json');await p.screenshot({path:dir+'/final.png',fullPage:true});
 await fs.writeFile(dir+'/environment.json',JSON.stringify({version:b.version(),headless:true,os:'macOS 26.6.2'},null,2));
}finally{await b.close();}
