import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
const result={name:'production-build-persistence-smoke',status:'NOT RUN',browser:browser.version(),date:new Date().toISOString(),url:'http://127.0.0.1:5191/'};
try{await page.goto(result.url);await page.getByRole('button',{name:'打开频道设置'}).click();await page.getByLabel('频道名称',{exact:true}).fill('构建验证');await page.getByRole('button',{name:'保存频道',exact:true}).click();await expect(page.locator('.records')).toContainText('构建验证');await page.reload();await page.getByRole('button',{name:'打开频道设置'}).click();await expect(page.locator('.records')).toContainText('构建验证');assert.deepEqual(errors,[]);assert.ok(requests.every(u=>new URL(u).hostname==='127.0.0.1'));result.status='PASS';}catch(e){result.status='FAIL';result.error=e.message;process.exitCode=1;}finally{await fs.mkdir('docs/evidence/m3', {recursive:true});await fs.writeFile('docs/evidence/m3/production-smoke.json',JSON.stringify({...result,errors,requests},null,2));console.log(result);await browser.close();}
