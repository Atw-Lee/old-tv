import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
const channel=process.argv[2]??'chrome',folder=`docs/evidence/m3/${process.env.M3_RUN??channel}`;
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({channel,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
const page=await context.newPage(),results=[],errors=[],requests=[];
page.setDefaultTimeout(6000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
page.on('dialog',d=>d.accept());
const test=async(name,fn)=>{try{const data=await fn();results.push({name,status:'PASS',...(data?{data}:{})});console.log(name,'PASS');}catch(e){results.push({name,status:'FAIL',error:e.stack});console.log(name,'FAIL',e.message);await page.screenshot({path:`${folder}/failure-${results.length}.png`});throw e;}};
const read=()=>page.evaluate(async()=>{const {Repository}=await import('/src/storage/repository.ts');const r=new Repository();try{return await r.load();}finally{r.db.close();}});
const settle=()=>expect(page.getByText('正在保存…',{exact:false})).toHaveCount(0);
const tab=async(name)=>{await page.getByRole('button',{name,exact:true}).click();};
const open=async()=>{await page.getByRole('button',{name:'打开频道设置',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'关闭设置'})).toBeFocused();};
const close=()=>page.getByRole('button',{name:'关闭设置',exact:true}).click();
const addChannel=async(name,number)=>{await page.getByLabel('频道名称',{exact:true}).fill(name);await page.getByLabel('频道编号',{exact:true}).fill(String(number));await page.getByRole('button',{name:'保存频道',exact:true}).click();await settle();};
const addSlot=async(start,end)=>{await page.getByLabel('开始时间',{exact:true}).fill(start);await page.getByLabel('结束时间',{exact:true}).fill(end);await page.getByRole('button',{name:'保存排片',exact:true}).click();await settle();};
let backup;
try{
 await page.goto('http://127.0.0.1:5190/');await expect(page.getByText('正在读取本机配置…')).toHaveCount(0);
 await test('single-tv-empty-state-and-modal-keyboard',async()=>{
  assert.equal(await page.locator('.site-header,.channel-section,footer').count(),0);await page.getByRole('button',{name:'电视电源',exact:true}).click();await expect(page.getByTestId('no-signal')).toBeVisible();await page.screenshot({path:`${folder}/television-empty.png`,fullPage:true});await open();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'打开频道设置'})).toBeFocused();await open();
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true);
 });
 await test('channel-create-edit-reorder-disable-and-duplicate',async()=>{
  await addChannel('动画',1);await addChannel('纪录片',2);assert.equal((await read()).config.channels.length,2);
  await page.getByRole('button',{name:'上移纪录片',exact:true}).click();await settle();assert.equal((await read()).config.channels.find(c=>c.name==='纪录片').sortOrder,0);
  await page.getByRole('button',{name:'停用 动画',exact:true}).click();await settle();assert.equal((await read()).config.channels.find(c=>c.name==='动画').enabled,false);
  await page.getByRole('button',{name:'启用 动画',exact:true}).click();await settle();
  await page.getByRole('button',{name:'编辑动画',exact:false}).count();
  await page.getByRole('button',{name:'编辑 动画',exact:true}).click();await page.getByLabel('频道名称',{exact:true}).fill('经典动画');await page.getByRole('button',{name:'保存频道',exact:true}).click();await settle();
  await addChannel('重复编号',2);await expect(page.getByRole('alert')).toContainText('重复');assert.equal((await read()).config.channels.length,2);
 });
 await test('program-create-platform-policy-edit',async()=>{
  await tab('节目资源');await page.getByLabel('节目标题',{exact:true}).fill('测试点播');await page.getByLabel('链接或平台ID',{exact:true}).fill('https://example.com/authorized-vod.m3u8');await page.getByRole('button',{name:'保存节目',exact:true}).click();await settle();
  await page.getByLabel('视频来源',{exact:true}).selectOption('bilibili');await expect(page.locator('.capability')).toContainText('不支持外部音量');await page.getByLabel('节目标题',{exact:true}).fill('B站受限');await page.getByLabel('链接或平台ID',{exact:true}).fill('BV1B7411m7LV');await page.getByRole('button',{name:'保存节目',exact:true}).click();await settle();assert.equal((await read()).config.programs[1].sourceId,'BV1B7411m7LV');
  await page.getByRole('button',{name:'编辑 测试点播',exact:true}).click();await page.getByLabel('节目标题',{exact:true}).fill('每日电影');await page.getByRole('button',{name:'保存节目',exact:true}).click();await settle();
 });
 await test('schedule-minute-input-overlap-midnight-and-shared-program',async()=>{
  await tab('每日排片');await page.getByLabel('排片频道',{exact:true}).selectOption({label:'1 · 经典动画'});await addSlot('09:00','10:00');assert.equal((await read()).config.schedules.length,1);
  await addSlot('09:30','10:30');await expect(page.getByRole('alert')).toContainText('重叠');assert.equal((await read()).config.schedules.length,1);
  await addSlot('23:00','01:00');await expect(page.getByRole('alert')).toContainText('跨午夜');
  await addSlot('23:01','24:00');assert.equal((await read()).config.schedules[1].startMinute,1381);
  await page.getByLabel('排片频道',{exact:true}).selectOption({label:'2 · 纪录片'});await addSlot('00:00','24:00');assert.equal((await read()).config.schedules.length,3);await page.getByLabel('排片频道',{exact:true}).selectOption({label:'1 · 经典动画'});
 });
 await test('timeline-native-drag-move-resize-and-conflict-rollback',async()=>{
  const before=(await read()).config.schedules[0];const track=await page.locator('.timeline').boundingBox();
  const drag=async(locator,minutes)=>{const b=await locator.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+track.width*minutes/1440,b.y+b.height/2,{steps:12});await page.mouse.up();await settle();};
  await drag(page.getByTestId(`slot-${before.id}`).locator('.slot-move'),30);assert.equal((await read()).config.schedules[0].startMinute,570);
  await drag(page.getByTestId(`slot-${before.id}`).locator('.slot-end'),30);assert.equal((await read()).config.schedules[0].endMinute,660);
  await drag(page.getByTestId(`slot-${before.id}`).locator('.slot-end'),780);await expect(page.getByRole('alert')).toContainText('重叠');assert.equal((await read()).config.schedules[0].endMinute,660);
  await page.screenshot({path:`${folder}/timeline.png`,fullPage:true});
 });
 await test('live-update-and-refresh-persistence-preferences',async()=>{
  await close();await page.getByRole('slider',{name:'频道旋钮'}).press('Home');await expect(page.locator('.pending-signal')).toContainText('每日电影');await page.getByRole('slider',{name:'音量旋钮'}).press('End');await page.waitForTimeout(400);await expect.poll(async()=>(await read()).config.settings.volume).toBe(1);
  await page.reload();await expect(page.getByRole('slider',{name:'音量旋钮'})).toHaveAttribute('aria-valuenow','100');await expect(page.getByTestId('television')).toHaveAttribute('data-powered','false');await page.getByRole('button',{name:'电视电源',exact:true}).click();await expect(page.locator('.pending-signal')).toContainText('每日电影');await page.screenshot({path:`${folder}/television.png`,fullPage:true});await open();
 });
 await test('export-backup-and-invalid-import-no-mutation',async()=>{
  await tab('备份与恢复');const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'导出 JSON 备份',exact:true}).click();const download=await downloading;await download.saveAs(`${folder}/backup.json`);backup=JSON.parse(await fs.readFile(`${folder}/backup.json`,'utf8'));assert.equal(backup.schemaVersion,1);assert.equal(backup.schedules.length,3);const revision=(await read()).revision;
  await page.getByLabel('选择 JSON 备份',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":999}')});await expect(page.getByRole('alert')).toContainText('导入校验失败');assert.equal((await read()).revision,revision);
  await page.getByLabel('选择 JSON 备份',{exact:true}).setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(page.locator('.import-preview')).toContainText('2个频道');assert.equal((await read()).revision,revision);await page.getByRole('button',{name:'取消导入',exact:true}).click();assert.equal((await read()).revision,revision);
 });
 await test('delete-channel-program-cascades-and-import-roundtrip',async()=>{
  await tab('频道');await page.getByRole('button',{name:'删除 经典动画',exact:true}).click();await settle();assert.equal((await read()).config.schedules.length,1);
  await tab('节目资源');await page.getByRole('button',{name:'删除 每日电影',exact:true}).click();await settle();assert.equal((await read()).config.schedules.length,0);
  await tab('备份与恢复');await page.getByLabel('选择 JSON 备份',{exact:true}).setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.getByRole('button',{name:'确认覆盖并导入',exact:true}).click();await settle();const {schemaVersion,...expected}=backup;assert.equal(schemaVersion,1);assert.deepEqual((await read()).config,expected);
 });
 await test('indexeddb-write-failure-retains-saved-data-and-retry',async()=>{
  await tab('频道');const before=await read();await page.evaluate(()=>{window.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Injected quota failure','QuotaExceededError');};});await addChannel('写入失败测试',3);await expect(page.getByRole('alert').first()).toContainText('失败');assert.deepEqual(await read(),before);
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__originalPut;delete window.__originalPut;});await page.getByRole('button',{name:'保存频道',exact:true}).click();await settle();assert.equal((await read()).config.channels.length,3);
 });
 await test('cross-tab-conflict-prevents-lost-update',async()=>{
  const other=await context.newPage();await other.goto('http://127.0.0.1:5190/');await other.evaluate(async()=>{const {Repository}=await import('/src/storage/repository.ts');const r=new Repository();try{const {config,revision}=await r.load();config.channels[0].name='另一个标签页修改';await r.save(config,revision);}finally{r.db.close();}});await other.close();
  await addChannel('冲突测试',4);await expect(page.getByRole('alert').first()).toContainText('另一个标签页');assert.equal((await read()).config.channels.length,3);await close();await page.getByRole('button',{name:'重新载入',exact:true}).click();await open();await expect(page.locator('.records')).toContainText('另一个标签页修改');
 });
 await test('mobile-dialog-layout-and-media-network-boundary',async()=>{
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${folder}/mobile-manager.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await close();await page.screenshot({path:`${folder}/mobile-tv.png`,fullPage:true});assert.equal(await page.locator('video,audio,iframe').count(),0);assert.deepEqual(requests.filter(u=>!['127.0.0.1'].includes(new URL(u).hostname)),[]);assert.deepEqual(errors,[]);
 });
 await test('knob-native-drag-wheel-power-and-reduced-motion',async()=>{
  await page.setViewportSize({width:1440,height:1100});const knob=page.getByRole('slider',{name:'音量旋钮'});await knob.press('Home');const b=await knob.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2-40,{steps:8});await page.mouse.up();await expect(knob).toHaveAttribute('aria-valuenow','50');await knob.hover();await page.mouse.wheel(0,-100);await expect(knob).toHaveAttribute('aria-valuenow','55');await page.getByRole('button',{name:'电视电源',exact:true}).click();await expect(page.getByTestId('television')).toHaveAttribute('data-powered','false');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await knob.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 });
 await test('indexeddb-read-failure-blocks-editing-and-recovers',async()=>{
  const broken=await context.newPage();await broken.addInitScript(()=>{if(!sessionStorage.getItem('recover'))IDBFactory.prototype.open=function(){throw new DOMException('Injected read denial','SecurityError');};});await broken.goto('http://127.0.0.1:5190/');await expect(broken.getByRole('alert')).toContainText('读取失败');await broken.getByRole('button',{name:'打开频道设置'}).click();await expect(broken.getByRole('button',{name:'保存频道',exact:true})).toBeDisabled();await broken.evaluate(()=>sessionStorage.setItem('recover','1'));await broken.reload();await expect(broken.getByRole('alert')).toHaveCount(0);await broken.getByRole('button',{name:'打开频道设置'}).click();await expect(broken.locator('.records')).toContainText('另一个标签页修改');await broken.close();
 });
}catch{process.exitCode=1;}
finally{
 await fs.writeFile(`${folder}/results.json`,JSON.stringify(results,null,2));await fs.writeFile(`${folder}/environment.json`,JSON.stringify({date:new Date().toISOString(),os:os.release(),browser:channel,version:browser.version(),headless:true,source:'local configuration only; example.com URL stored, never fetched'},null,2));await fs.writeFile(`${folder}/errors.json`,JSON.stringify(errors,null,2));await fs.writeFile(`${folder}/requests.json`,JSON.stringify(requests,null,2));await browser.close();
}
