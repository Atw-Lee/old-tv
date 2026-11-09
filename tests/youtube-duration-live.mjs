// Public YouTube IFrame API sample; no API mock, no API key, disposable browser profile.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
const result={date:new Date().toISOString(),os:os.release(),browser:browser.version(),id:'M7lc1UVf-VE',status:'NOT RUN',network:[]};
page.on('requestfailed',r=>{if(r.url().includes('youtube'))result.network.push({host:new URL(r.url()).host,error:r.failure()?.errorText});});
try{
 await page.goto('http://127.0.0.1:5190');await page.getByRole('button',{name:'打开频道设置'}).click();await page.getByRole('tab',{name:'视频源',exact:true}).click();await page.getByRole('button',{name:'新增视频源'}).click();await page.getByRole('combobox',{name:'来源类型'}).click();await page.getByRole('option',{name:'YouTube',exact:true}).click();await page.getByLabel('链接或平台 ID').fill(result.id);
 await page.waitForFunction(()=>document.querySelector('.duration-result output')?.textContent!=='未知'||/超时|无法|不可用/.test(document.querySelector('.duration-field [role=status]')?.textContent??''),null,{timeout:38000});
 result.duration=await page.locator('.duration-result output').innerText();result.message=await page.locator('.duration-field [role=status]').allTextContents();
 result.status=result.duration!=='未知'?'PASS':'BLOCKED';result.remainingFrames=await page.locator('.duration-preview iframe').count();
}catch(e){result.status='FAIL';result.error=String(e);}finally{console.log(result);await fs.mkdir('docs/evidence/manual-settings', {recursive:true});await fs.writeFile('docs/evidence/manual-settings/youtube-live.json',JSON.stringify(result,null,2));await browser.close();}
