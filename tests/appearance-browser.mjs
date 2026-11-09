import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const directory='docs/evidence/m4/painted-room';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5190');
  for(const [width,height,layout] of [[1440,900,'side'],[980,1100,'stacked'],[390,844,'stacked'],[800,500,'side'],[2560,1080,'side'],[1024,1366,'stacked']]){
    await page.setViewportSize({width,height});
    const set=page.getByTestId('television');
    await expect(set).toHaveAttribute('data-layout',layout);
    await set.evaluate(async node=>{
      const image=new Image();
      image.src=getComputedStyle(node.querySelector(".scene-painting")).borderImageSource.slice(5,-2);
      await image.decode();
    });
    await expect.poll(async()=>{
      const scene=await set.boundingBox();
      if(scene.x!==0 || scene.y!==0 || scene.width!==width || scene.height!==height)return false;
      const parts=set.locator('[data-testid="screen"],.painted-dial,.painted-settings,.painted-power,.wall-clock');
      return parts.evaluateAll(nodes=>nodes.every(node=>{
        const r=node.getBoundingClientRect();
        return r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
      }));
    }).toBe(true);
    assert.deepEqual(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[width,height]);
    const power=page.getByRole('button',{name:'电视电源'});
    if(await power.getAttribute('aria-pressed')==='true') await power.click();
    await power.click();
    await expect(page.getByTestId('no-signal')).toBeVisible();
    const volume=page.getByRole('slider',{name:'音量旋钮'});
    await volume.focus();
    await page.keyboard.press('End');
    await expect(volume).toHaveAttribute('aria-valuenow','100');
    await page.keyboard.press('ArrowDown');
    await expect(volume).toHaveAttribute('aria-valuenow','95');
    await power.click();
    await expect(page.getByTestId('no-signal')).toHaveCount(0);
    const settings=page.getByRole('button',{name:'打开频道设置'});
    const lever=page.locator('.painted-settings');
    const offset=()=>lever.evaluate(node=>new DOMMatrix(getComputedStyle(node,'::after').transform).m41);
    await settings.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(offset).toBeGreaterThan(15);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(offset).toBe(0);
    await settings.evaluate(node=>node.blur());
    if(width===1440 || width===390) await page.screenshot({path:`${directory}/${width}x${height}.png`});
    console.log(`PASS ${width}×${height} ${layout}`);
  }
  await page.clock.install({time:new Date('2026-11-09T18:24:30Z')});
  await page.reload();
  const clock=page.locator('.wall-clock');
  await expect(clock).toHaveAttribute('aria-label','北京时间 2时24分');
  const hand=clock.locator('.second-hand');
  const before=await hand.getAttribute('style');
  await page.clock.runFor(1000);
  await expect(hand).not.toHaveAttribute('style',before);
  assert.deepEqual(errors,[]);
  console.log('Chrome',browser.version());
} finally {await browser.close();}
