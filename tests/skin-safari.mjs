import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='docs/evidence/m2/safari';await fs.mkdir(dir,{recursive:true});
const root='http://127.0.0.1:5192';let session;
async function request(method,path,body){const r=await fetch(root+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();if(j.value?.error)throw Error(j.value.error+': '+j.value.message);return j.value;}
const results=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{session=await request('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});}
catch(e){await fs.writeFile(`${dir}/results.json`,JSON.stringify([{name:'safari-session',status:'BLOCKED',error:e.message}],null,2));console.log('Safari session BLOCKED');process.exit(1);}
const base='/session/'+session.sessionId;
const js=(script,...args)=>request('POST',base+'/execute/sync',{script,args});
async function button(label){await js(`document.querySelector('button[aria-label="'+arguments[0]+'"]').click()`,label);await wait(80);}
async function screenshot(name){await fs.writeFile(`${dir}/${name}.png`,Buffer.from(await request('GET',base+'/screenshot'),'base64'));}
async function check(name,fn){try{results.push({name,status:'PASS',data:await fn()});}catch(e){results.push({name,status:'FAIL',error:e.message});}await fs.writeFile(`${dir}/results.json`,JSON.stringify(results,null,2));console.log(name,results.at(-1).status);}
try{
 await request('POST',base+'/window/rect',{width:1440,height:1100});await request('POST',base+'/url',{url:'http://127.0.0.1:5190/'});await wait(1200);
 await fs.writeFile(`${dir}/environment.json`,JSON.stringify({date:'2026-11-03',...session.capabilities,interaction:'Official Safari; DOM clicks / dispatched keyboard events. Not trusted user gesture or native keyboard evidence; Chrome/Edge have separate native automation tests.'},null,2));
 await check('initial-off',async()=>{assert.equal(await js('return document.querySelector("button[aria-label=电视电源]").getAttribute("aria-pressed")'),'false');assert.equal(await js('return document.querySelectorAll("[data-testid=demo-signal]").length'),0);});
 await check('power-on-native-render',async()=>{await button('电视电源');await wait(550);assert.equal(await js('return document.querySelectorAll("[data-testid=demo-signal]").length'),1);const box=await js('const b=document.querySelector("[data-testid=screen]").getBoundingClientRect();return {width:b.width,height:b.height}');assert.ok(Math.abs(box.width/box.height-4/3)<.01);await screenshot('on-desktop');return box;});
 await check('channel-switch-and-no-signal',async()=>{await button('下一频道');assert.match(await js('return document.querySelector("[data-testid=demo-signal] h2").textContent'),/把今天/);await button('下一频道');await wait(550);assert.equal(await js('return document.querySelectorAll("[data-testid=no-signal]").length'),1);await screenshot('no-signal');await button('下一频道');assert.equal(await js('return document.querySelector("[aria-label=频道旋钮]").getAttribute("aria-valuenow")'),'1');});
 await check('volume-dispatched-keyboard',async()=>{await js('const e=document.querySelector("[aria-label=音量旋钮]");e.focus();e.dispatchEvent(new KeyboardEvent("keydown",{key:"End",bubbles:true}));');await wait(100);assert.equal(await js('return document.querySelector("[aria-label=音量旋钮]").getAttribute("aria-valuenow")'),'100');await js('document.querySelector("[aria-label=音量旋钮]").dispatchEvent(new KeyboardEvent("keydown",{key:"Home",bubbles:true}));');await wait(100);assert.equal(await js('return document.querySelector("[aria-label=音量旋钮]").getAttribute("aria-valuenow")'),'0');});
 await check('power-off-unmount',async()=>{await button('电视电源');await wait(550);assert.equal(await js('return document.querySelectorAll("[data-testid=demo-signal],[data-testid=no-signal],video,iframe").length'),0);await screenshot('off-desktop');});
 await fs.writeFile(`${dir}/final-state.json`,JSON.stringify(await js('return {power:document.querySelector("[aria-label=电视电源]").getAttribute("aria-pressed"),status:document.querySelector("[role=status]").textContent,volume:document.querySelector("[aria-label=音量旋钮]").getAttribute("aria-valuenow"),ua:navigator.userAgent}'),null,2));
}finally{await request('DELETE',base);}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
