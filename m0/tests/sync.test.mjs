import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/sync.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {observeClockSync}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
function setup(t){
 let time=0,tick=()=>{},cleared=false;
 t.mock.method(performance,'now',()=>time);
 const original=globalThis.window;
 globalThis.window={setInterval(fn){tick=fn;return 1;},clearInterval(){cleared=true;}};
 t.after(()=>{if(original===undefined)delete globalThis.window;else globalThis.window=original;});
 const v=Object.assign(new EventTarget(),{readyState:4,seeking:false,currentTime:10,duration:100,paused:false});
 return {v,advance(n){time+=n;tick();},get cleared(){return cleared;}};
}
test('buffer completion corrects drift; repeated slow seeks have bounded retries',t=>{
 const f=setup(t),events=[];let target=20;
 const dispose=observeClockSync(f.v,()=>({active:true,offset:target}),(name,data)=>events.push({name,data}),()=>{},()=>{});
 f.v.paused=true;f.v.dispatchEvent(new Event('canplay'));assert.equal(f.v.currentTime,10,'Paused/autoplay-blocked player must not be chased');
 f.v.paused=false;f.v.seeking=true;f.v.dispatchEvent(new Event('canplay'));assert.equal(f.v.currentTime,10);
 f.v.seeking=false;f.v.dispatchEvent(new Event('seeked'));assert.equal(f.v.currentTime,20);
 target=30;f.v.dispatchEvent(new Event('playing'));assert.equal(f.v.currentTime,20,'No immediate repeated seek');
 f.advance(1000);assert.equal(f.v.currentTime,30);
 target=40;f.advance(1000);assert.equal(f.v.currentTime,40);
 target=50;f.advance(1000);assert.equal(f.v.currentTime,40,'Three corrections exhaust the window');
 f.advance(7001);assert.equal(f.v.currentTime,50,'Retries resume after cooldown');
 assert.equal(events.filter(x=>x.name==='sync-correction').length,4);dispose();
});
test('disposed observer cannot resurrect player; media expiry exits without seeking',t=>{
 const f=setup(t);let expired=0;let target=110;
 const dispose=observeClockSync(f.v,()=>({active:true,offset:target}),()=>{},()=>{},()=>{expired++;});
 f.v.dispatchEvent(new Event('canplay'));assert.equal(expired,1);assert.equal(f.v.currentTime,10);
 dispose();assert.equal(f.cleared,true);target=50;f.v.dispatchEvent(new Event('playing'));f.advance(1000);
 assert.equal(f.v.currentTime,10);assert.equal(expired,1);
});
