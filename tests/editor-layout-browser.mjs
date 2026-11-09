import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';

const browser = await chromium.launch({channel: 'chrome'});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
const results = [];
let test = '导入隔离样例';
try {
  await page.goto('http://127.0.0.1:5190');
  const button = name => page.getByRole('button', {name, exact: true});
  const tab = name => page.getByRole('tab', {name, exact: true}).click();
  await button('打开频道设置').click();
  await page.locator('input[type=file]').setInputFiles('docs/evidence/ui-drawer-v2/import-fixture.json');
  await button('导入到草稿').click();

  test = '频道行拖到表格边缘也不会新增滚动范围';
  const table = page.locator('.table-scroll:visible');
  const measure = () => table.evaluate(el => [el.scrollWidth-el.clientWidth, el.scrollHeight-el.clientHeight]);
  for(const width of [1280,420]){
    await page.setViewportSize({width,height:900});
  const before = await measure();
  const handles = page.locator('.drag-handle');
  await handles.first().click({trial:true});
  const first = await handles.first().boundingBox();
  const second = await handles.last().boundingBox();
  await page.mouse.move(first.x+10, first.y+10);
  await page.mouse.down();
  await page.mouse.move(first.x+10,first.y+20,{steps:3});
  await expect(page.locator('.channel-dragging')).toBeVisible();
  await page.mouse.move(second.x+900, second.y+70, {steps:12});
  await expect(page.locator('.channel-dragging')).toBeVisible();
  assert.deepEqual(await measure(), before);
  await page.mouse.up();
  await expect(handles.first()).toHaveAttribute('aria-label', width===1280?/纪录片/:/动画频道/);
  results.push({test,status:'PASS',width,overflow:before});

  }
  await page.setViewportSize({width:1280,height:900});
  test = '1分钟短节目两侧均可拖动并保留点击精编';
  await tab('排片');
  await page.getByRole('combobox',{name:'排片频道'}).click();
  await page.getByRole('option',{name:/动画频道/}).click();
  const slot = page.getByTestId('slot-ui-short-0');
  await slot.scrollIntoViewIfNeeded();
  const resize = async (side, delta) => {
    const box = await slot.locator('.slot-'+side).boundingBox();
    assert.equal(box.width,1);
    const track = await page.locator('.timeline').boundingBox();
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+delta*track.width/1440,y,{steps:8});await page.mouse.up();
  };
  assert.ok((await slot.boundingBox()).width<=2);
  await resize('start',-10);
  await expect(slot.locator('.slot-move')).toHaveAttribute('title',/10:00–10:11/);
  await resize('end',5);
  await expect(slot.locator('.slot-move')).toHaveAttribute('title',/10:00–10:15/);
  await slot.locator('.slot-move').click();
  await expect(page.getByRole('heading',{name:'编辑排片'})).toBeVisible();
  await button('取消').click();
  await expect(page.locator('.editor-dialog')).toHaveCount(0);
  results.push({test,status:'PASS'});

  test = '三个新增弹窗内容滚动、底栏固定及进出动画';
  await page.evaluate(()=>{
    window.editorAnimations=[];
    document.addEventListener('animationstart', e=>{
      if(e.target.matches('.editor-dialog'))window.editorAnimations.push(e.animationName);
    });
  });
  for(const [section,add] of [['频道','新增频道'],['视频源','新增视频源'],['排片','新增排片']]){
    await page.setViewportSize({width:1000,height:900});await tab(section);await button(add).click();
    const scroll = page.locator('.editor-scroll [data-slot=scroll-area-viewport]');
    if(section==='视频源'){
      const content=await scroll.evaluate(el=>({viewport:el.clientHeight,body:el.querySelector('fieldset').offsetHeight}));
      assert.ok(Math.abs(content.viewport-content.body)<2,JSON.stringify(content));
    }
    await page.setViewportSize({width:900,height:280});
    await expect.poll(()=>scroll.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeGreaterThan(0);
    await scroll.hover({position:{x:6,y:12}});await page.mouse.wheel(0,800);
    await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await expect(button('完成')).toBeInViewport();await button('取消').click();
    await expect(page.locator('.editor-dialog')).toHaveCount(0);
  }
  const animations=await page.evaluate(()=>window.editorAnimations);
  assert.equal(animations.filter(n=>n==='editor-enter').length,3);
  assert.equal(animations.filter(n=>n==='editor-exit').length,3);
  results.push({test,status:'PASS',animations});
} catch(error){results.push({test,status:'FAIL',error:String(error)});process.exitCode=1;}
finally {
  await fs.mkdir('docs/evidence/editor-layout',{recursive:true});
  await fs.writeFile('docs/evidence/editor-layout/results.json', JSON.stringify({date:new Date().toISOString(),os:os.release(),chrome:browser.version(),results},null,2));
  console.log(results);await browser.close();
}
