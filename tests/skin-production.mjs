import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
const result={name:'production-build-smoke',date:'2026-11-03',browser:browser.version(),url:'http://127.0.0.1:5191/',status:'NOT RUN'};
try{
 await page.goto(result.url);await page.getByRole('button',{name:'电视电源',exact:true}).click();await page.getByTestId('demo-signal').waitFor();
 await page.getByRole('button',{name:'选择空白频道'}).click();await page.getByTestId('no-signal').waitFor();
 await page.getByRole('button',{name:'电视电源',exact:true}).click();assert.equal(await page.getByTestId('no-signal').count(),0);
 assert.deepEqual(errors,[]);assert.ok(requests.every(u=>new URL(u).hostname==='127.0.0.1'));result.status='PASS';
}catch(e){result.status='FAIL';result.error=e.message;process.exitCode=1;}
finally{await fs.writeFile('docs/evidence/m2/production-smoke.json',JSON.stringify({...result,errors,requests},null,2));console.log(result);await browser.close();}
