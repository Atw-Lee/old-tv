// Isolated Chrome profile and synthetic VOD: no user configuration or remote video needed.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='docs/evidence/slot-loop',tmp=await fs.mkdtemp(os.tmpdir()+'/retro-clip-');
const origin='http://127.0.0.1:5190', source='https://video.example.test/test.m3u8';
const results=[],requests=[];let browser,active='setup';
try{
 await fs.mkdir(dir,{recursive:true});
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x120:rate=24','-t','5','-c:v','libx264','-g','24','-pix_fmt','yuv420p','-hls_time','1','-hls_list_size','0',tmp+'/test.m3u8']);
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();page.setDefaultTimeout(6500);
 await page.route('https://video.example.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1);requests.push(name);await route.fulfill({body:await fs.readFile(tmp+'/'+name),contentType:name.endsWith('.ts')?'video/mp2t':'application/vnd.apple.mpegurl',headers:{'Access-Control-Allow-Origin':'*'}});});
 await page.addInitScript(()=>{const now=Date.now;let delta=0;window.setAir=ms=>{delta=Date.parse('2026-11-08T09:00:00+08:00')+ms-now();};Date.now=()=>now()+delta;});
 await page.goto(origin);const btn=name=>page.getByRole('button',{name,exact:true}),tab=name=>page.getByRole('tab',{name,exact:true});
 const open=()=>btn('打开频道设置').click(),complete=()=>btn('完成').click();
 active='抽屉退场后可再次打开';await open();await page.waitForTimeout(550);
 await page.evaluate(()=>{window.anim=[];document.addEventListener('animationstart',e=>{if(e.target.matches('.manager-drawer'))window.anim.push([e.animationName,e.target.dataset.state]);});});
 await btn('关闭设置').click();await expect(page.locator('.manager-drawer')).toHaveCount(0);await open();const anim=await page.evaluate(()=>window.anim);assert.ok(anim.some(a=>a[1]==='closed'));results.push({name:active,status:'PASS',anim});
 active='读取清单时长且不请求分片';await btn('新增频道').click();await page.getByLabel('频道名称',{exact:true}).fill('测试频道');await complete();await tab('视频源').click();await btn('新增视频源').click();await page.getByLabel('视频源名称',{exact:true}).fill('测试图案');await page.getByLabel('链接或平台 ID').fill(source);await expect(btn('正在读取…')).toBeDisabled();await expect(page.locator('.duration-result .spin')).toBeVisible();await expect(page.locator('.duration-result output').filter({hasText:'0:05'})).toBeVisible();assert.ok(!requests.some(n=>n.endsWith('.ts')));const metadataRequests=[...requests];await btn('播放 HLS 预览').click();await expect.poll(()=>page.locator('.source-preview video').evaluate(v=>v.videoWidth>0&&v.currentTime>0)).toBeTruthy();await complete();await expect(page.locator('.source-preview video')).toHaveCount(0);await expect(page.getByRole('cell',{name:'0:05'})).toBeVisible();results.push({name:active,status:'PASS',metadataRequests,previewDecoded:true});
 active='新排片按分钟进位并支持覆盖';await tab('排片').click();await btn('新增排片').click();await expect(page.getByLabel('结束时间')).toHaveValue('09:01');await page.getByLabel('结束时间').fill('09:02');await page.getByRole('combobox',{name:'播完后'}).click();await page.getByRole('option',{name:'循环'}).click();await complete();await expect(page.getByRole('cell',{name:'循环'})).toBeVisible();await page.screenshot({path:dir+'/schedule.png'});await btn('保存').click();await expect(page.locator('.manager-drawer')).toHaveCount(0);results.push({name:active,status:'PASS'});
 active='真实解码：片尾循环、晚加入及排片边界';await page.evaluate(()=>window.setAir(1600));await page.getByLabel('电视电源',{exact:true}).click();const video=page.locator('video');
 const playing=()=>expect.poll(()=>video.evaluateAll(vs=>vs.some(v=>!v.paused&&v.readyState>=3&&v.videoWidth>0&&v.getVideoPlaybackQuality().totalVideoFrames>0))).toBeTruthy();
 await playing();const first=await video.evaluate(v=>v.currentSrc);
 await expect.poll(()=>video.evaluateAll((vs,src)=>vs.some(v=>v.currentSrc&&v.currentSrc!==src&&!v.paused&&v.videoWidth>0),first),{timeout:8500}).toBeTruthy();await playing();
 const sample=()=>video.evaluate(v=>({time:v.currentTime,expected:(Date.now()-Date.parse('2026-11-08T09:00:00+08:00'))/1000%5,frames:v.getVideoPlaybackQuality().totalVideoFrames}));
 const second=await sample();await page.getByLabel('电视电源',{exact:true}).click();await page.evaluate(()=>window.setAir(71300));await page.getByLabel('电视电源',{exact:true}).click();await playing();await expect.poll(async()=>{const s=await sample();return Math.abs(s.time-s.expected);}).toBeLessThan(0.8);const late=await sample();
 await page.evaluate(()=>window.setAir(120100));await expect(page.getByTestId('no-signal')).toBeVisible();await expect(video).toHaveCount(0);results.push({name:active,status:'PASS',second,late});
}catch(e){results.push({name:active,status:'FAIL',error:String(e)});process.exitCode=1;}
finally{await fs.writeFile(dir+'/results.json',JSON.stringify({date:new Date().toISOString(),browser:browser?.version(),os:os.type()+' '+os.release(),fixture:'5秒自制测试图案，独立浏览器会话内提供清单与分片；北京时间通过测试时钟设定',results},null,2));console.log(results);await browser?.close();await fs.rm(tmp,{recursive:true,force:true});}
