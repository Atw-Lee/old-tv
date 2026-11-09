import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const dir='../docs/evidence/autoplay-final';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const rows=[];
try{for(const provider of ['hls','youtube'])for(const gesture of [false,true])for(const muted of [true,false]){
 const c=await browser.newContext(),p=await c.newPage(),errors=[];
 p.on('requestfailed',r=>errors.push({url:new URL(r.url()).origin+new URL(r.url()).pathname,error:r.failure()}));
 await p.goto(`http://127.0.0.1:5178/?fixture=mux&provider=${provider}&muted=${muted?1:0}&autostart=${gesture?0:1}`);await p.getByRole('heading').waitFor();
 if(gesture)await p.getByRole('button',{name:'加载 / 开机',exact:true}).click();
 await p.waitForTimeout(12000);
 const before=await p.getByRole('status').textContent();
 const key=`${provider}-${gesture?'gesture':'no-gesture'}-${muted?'muted':'sound'}`;
 await p.screenshot({path:`${dir}/${key}.png`});
 const log=await p.locator('pre').textContent();
 let recovery=null;
 if(before.includes('BLOCKED_AUTOPLAY')){await p.getByRole('button',{name:'点击继续收看'}).click();await p.waitForTimeout(1500);recovery=await p.getByRole('status').textContent();}
 rows.push({key,browser:browser.version(),headless:true,at:new Date().toISOString(),provider,gesture,muted,before,recovery,log,errors});
 await fs.writeFile(`${dir}/results.json`,JSON.stringify(rows,null,2));console.log(key,before);await c.close();
}}finally{await browser.close();}
