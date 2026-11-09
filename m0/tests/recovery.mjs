import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const dir='../docs/evidence/chrome-recovery';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:false}),c=await b.newContext({viewport:{width:1100,height:900}}),p=await c.newPage();const results=[];
const check=async(name,fn)=>{try{results.push({name,execution:'COMPLETED',data:await fn()});}catch(e){results.push({name,execution:'BLOCKED',error:e.message});}console.log(name,results.at(-1).execution);await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));};
const sample=()=>p.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,readyState:v.readyState,width:v.videoWidth,frames:v.getVideoPlaybackQuality().totalVideoFrames}));
const playing=()=>p.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.currentTime>0&&!v.paused&&v.readyState>=2&&v.videoWidth>0;},null,{timeout:25000});
const clock=async(t)=>{await p.locator('input[type=datetime-local]').fill('2026-11-02T'+t);await p.getByRole('button',{name:'设置时钟'}).click();};
try{
 await p.goto('http://127.0.0.1:5178');await p.getByRole('heading').waitFor();
 await p.locator('input.source').fill('https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/gear1/prog_index.m3u8');
 await p.getByLabel('启用固定时段实验').check();await clock('09:05');await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();
 await check('scheduled-load-300',async()=>{await playing();return sample();});
 await check('real-background-recovery',async()=>{const before=await sample();const other=await c.newPage();await other.goto('about:blank');await other.bringToFront();await p.waitForTimeout(5000);const hidden=await p.evaluate(()=>document.visibilityState);await p.bringToFront();await p.waitForTimeout(1500);const after=await sample();await other.close();return {hidden,before,after,log:await p.locator('pre').textContent()};});
 await check('boundary',async()=>{await clock('09:59:59');await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:2500});return p.locator('pre').textContent();});
 await check('reopen-1200',async()=>{await clock('09:20');await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();await playing();return sample();});
 await check('early-ended',async()=>{await p.getByRole('button',{name:'跳至结尾前 2 秒'}).click();await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:25000});await p.waitForTimeout(2000);return {videos:await p.locator('video').count(),log:await p.locator('pre').textContent()};});
 const d=p.waitForEvent('download');await p.getByRole('button',{name:'导出日志'}).click();await(await d).saveAs(dir+'/events.json');await p.screenshot({path:dir+'/final.png',fullPage:true});
 await fs.writeFile(dir+'/environment.json',JSON.stringify({version:b.version(),headless:false,os:'macOS 26.6.2'},null,2));
}finally{await b.close();}
