import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const dir='../docs/evidence/youtube-controls';await fs.mkdir(dir,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1200,height:1000}}),p=await c.newPage();const events=[],results=[];
p.on('request',r=>{const u=new URL(r.url());events.push({at:Date.now(),type:r.resourceType(),host:u.hostname,path:u.pathname});});
const check=async(name,fn)=>{try{results.push({name,status:'PASS',data:await fn()});}catch(e){results.push({name,status:'BLOCKED',error:e.message});}console.log(name,results.at(-1).status);await fs.writeFile(dir+'/results.json',JSON.stringify(results,null,2));};
const status=()=>p.getByRole('status').textContent();
try{
 await p.goto('http://127.0.0.1:5178/?provider=youtube');await p.getByRole('heading').waitFor();await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();
 await check('play',async()=>{await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('PLAYING'),null,{timeout:30000});await p.waitForTimeout(2000);return status();});
 await check('seekTo-60',async()=>{await p.locator('input[type=number]').fill('60');await p.getByRole('button',{name:'定位',exact:true}).click();await p.waitForFunction(()=>{const t=document.querySelector('[role=status]')?.textContent||'';const n=Number(t.match(/位置：(\d+\.\d+)/)?.[1]);return n>=60&&n<62;},null,{timeout:20000});return status();});
 await check('volume-mute',async()=>{await p.locator('input[type=range]').fill('0.2');await p.getByLabel('静音',{exact:true}).uncheck();await p.waitForTimeout(1200);return p.locator('pre').textContent();});
 await p.screenshot({path:dir+'/playing.png',fullPage:true});
 await check('ended',async()=>{await p.getByRole('button',{name:'跳至结尾前 2 秒'}).click();await p.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.includes('NO_SIGNAL'),null,{timeout:25000});return status();});
 await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();await p.waitForTimeout(8000);
 await check('destroy-31s',async()=>{await p.getByRole('button',{name:'销毁 / 关机',exact:true}).click();const cutoff=Date.now();await p.waitForTimeout(31000);return {cutoff,end:Date.now(),newMediaRequests:events.filter(e=>e.at>cutoff&&(e.type==='media'||e.path.includes('videoplayback'))),iframeCount:await p.locator('iframe').count()};});
 const d=p.waitForEvent('download');await p.getByRole('button',{name:'导出日志'}).click();await(await d).saveAs(dir+'/events.json');await p.screenshot({path:dir+'/final.png',fullPage:true});
}finally{await fs.writeFile(dir+'/network.json',JSON.stringify(events,null,2));await b.close();}
