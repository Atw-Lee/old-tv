import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TVController} from '../dist/core/tv-controller.js';
import {configuration,FakeTime} from './helpers.mjs';
test('TV skin observes one controller for power, channel and volume',()=>{
 const time=new FakeTime(),controller=new TVController(configuration(),time,time);let changes=0;
 const stop=controller.subscribe(()=>changes++);
 assert.equal(controller.getSnapshot().powered,false);controller.togglePower();
 assert.equal(controller.getSnapshot().schedule.kind,'AIR');controller.nextChannel(1);
 assert.equal(controller.getSnapshot().channelId,'b');controller.setVolume(.8);assert.equal(controller.getSnapshot().volume,.8);
 controller.togglePower();assert.equal(controller.getSnapshot().powered,false);assert.equal(time.jobs.size,0);assert.ok(changes>=4);
 stop();controller.dispose();
});
test('controller clamps/rounds volume; non-finite values cannot poison state',()=>{
 const controller=new TVController(configuration());controller.setVolume(-1);assert.equal(controller.getSnapshot().volume,0);
 controller.setVolume(2);assert.equal(controller.getSnapshot().volume,1);controller.setVolume(.1234);assert.equal(controller.getSnapshot().volume,.12);
 controller.setVolume(NaN);assert.equal(controller.getSnapshot().volume,.12);controller.dispose();
});
test('snapshot has stable identity until changed and is deeply readonly',()=>{
 const controller=new TVController(configuration()),snapshot=controller.getSnapshot();
 assert.equal(snapshot,controller.getSnapshot());assert.throws(()=>{snapshot.channels[0].name='overwrite';},TypeError);
 assert.throws(()=>{snapshot.volume=.9;},TypeError);controller.setVolume(.5);assert.equal(snapshot,controller.getSnapshot());
 controller.setVolume(.6);assert.notEqual(snapshot,controller.getSnapshot());controller.dispose();
});
test('retune while off selects next channel but cannot power on; next power uses current time',()=>{
 const time=new FakeTime(),controller=new TVController(configuration(),time,time);controller.selectChannel('b');
 assert.equal(controller.getSnapshot().powered,false);assert.equal(time.jobs.size,0);time.sleep(30000);controller.togglePower();
 assert.equal(controller.getSnapshot().schedule.target.offsetSeconds,3630);controller.dispose();controller.dispose();
 assert.equal(time.jobs.size,0);assert.throws(()=>controller.setVolume(.5),/disposed/);
});
