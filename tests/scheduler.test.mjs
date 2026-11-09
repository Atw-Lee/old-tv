import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scheduler,bindBrowserLifecycle} from '../dist/core/index.js';
import {configuration,epoch,FakeTime} from './helpers.mjs';
function setup(t,config=configuration()){
  const time=new FakeTime(), scheduler=new Scheduler(config,time,time), updates=[];
  scheduler.subscribe(u=>updates.push(u));
  t.after(()=>scheduler.dispose());
  return {scheduler,time,updates};
}
test('off does not schedule timers; off/on follows current wall time',t=>{
  const {scheduler:s,time}=setup(t);assert.equal(time.jobs.size,0);
  const first=s.powerOn();assert.equal(first.commands[0].type,'start');
  const off=s.powerOff();assert.deepEqual(off.commands,[{type:'stop',token:first.state.token}]);
  assert.equal(time.jobs.size,0);time.sleep(20*60000);
  const on=s.powerOn();assert.equal(on.state.target.offsetSeconds,1200);assert.notEqual(on.state.token,first.state.token);
});
test('slot boundary destroys old before starting next, even for reused program',t=>{
  const c=configuration();c.schedules[1].programId='p';
  const {scheduler:s,time,updates}=setup(t,c);time.time=epoch('09:59:59.900');s.powerOn();time.advance(100);
  const u=updates.at(-1);assert.equal(u.at,epoch('10:00:00'));
  assert.deepEqual(u.commands.map(x=>x.type),['stop','start']);assert.equal(u.state.target.offsetSeconds,0);
  time.time=epoch('10:59:59.900');s.refresh();time.advance(100);
  assert.equal(s.getState().reason,'GAP');assert.equal(updates.at(-1).commands[0].type,'stop');
});
test('midnight switches occurrence and does not keep yesterday token',t=>{
  const c=configuration();c.schedules=[{id:'all',channelId:'a',programId:'p',startMinute:0,endMinute:1440}];
  const {scheduler:s,time,updates}=setup(t,c);time.time=epoch('23:59:59.999');const old=s.powerOn().state.token;
  time.advance(1);assert.equal(s.getState().target.offsetSeconds,0);assert.notEqual(s.getState().token,old);
  assert.deepEqual(updates.at(-1).commands.map(x=>x.type),['stop','start']);
});
test('ended remains no signal across off/on and retune, but starts next day',t=>{
  const {scheduler:s,time}=setup(t);const token=s.powerOn().state.token;
  assert.equal(s.mediaEnded(token).state.reason,'MEDIA_ENDED');s.powerOff();s.powerOn();assert.equal(s.getState().reason,'MEDIA_ENDED');
  s.selectChannel('b');s.selectChannel('a');assert.equal(s.getState().reason,'MEDIA_ENDED');
  time.time=epoch('09:00:00','2026-11-04');assert.equal(s.refresh().state.kind,'AIR');
});
test('metadata duration handles buffering expiry immediately and honors actual longer duration',t=>{
  const {scheduler:s,time}=setup(t);const token=s.powerOn().state.token;time.sleep(5000);
  const end=s.mediaDuration(token,4);assert.equal(end.state.reason,'MEDIA_ENDED');assert.equal(end.commands[0].type,'stop');
  const c=configuration();c.programs[0].durationSeconds=10;s.replaceConfiguration(c);
  const current=s.getState().token;s.mediaDuration(current,30);time.sleep(10000);
  assert.equal(s.refresh().state.kind,'AIR');time.sleep(16000);assert.equal(s.refresh().state.reason,'MEDIA_ENDED');
});
test('ready after slow load computes latest offset; ready after boundary starts next',t=>{
  const {scheduler:s,time}=setup(t);const token=s.powerOn().state.token;
  time.sleep(3200);const u=s.ready(token);assert.equal(u.commands[0].type,'resync');assert.equal(u.commands[0].target.offsetSeconds,3.2);
  time.time=epoch('10:00:00');const next=s.ready(token);assert.deepEqual(next.commands.map(x=>x.type),['stop','start']);
  assert.equal(s.ready(token),null);
});
test('stale ended/duration/ready after retune or shutdown cannot resurrect player',t=>{
  const {scheduler:s}=setup(t);const token=s.powerOn().state.token;s.selectChannel('b');
  assert.equal(s.mediaEnded(token),null);assert.equal(s.mediaDuration(token,1),null);assert.equal(s.ready(token),null);
  const current=s.getState().token;s.powerOff();assert.equal(s.ready(current),null);assert.equal(s.mediaEnded(current),null);
  assert.equal(s.getState().kind,'OFF');
});
test('suspended timer catches skipped slots using current time rather than accumulated ticks',t=>{
  const {scheduler:s,time,updates}=setup(t);s.powerOn();time.sleep(70*60000);time.fireOne();
  assert.equal(s.getState().target.schedule.id,'next');assert.equal(s.getState().target.offsetSeconds,600);
  assert.deepEqual(updates.at(-1).commands.map(x=>x.type),['stop','start']);
});
test('same-slot timer suspension and backwards clock jump request recalibration',t=>{
  const {scheduler:s,time,updates}=setup(t);s.powerOn();time.sleep(5000);time.fireOne();
  assert.equal(updates.at(-1).commands[0].type,'resync');assert.equal(s.getState().target.offsetSeconds,5);
  time.time=epoch('09:00:01');assert.equal(s.refresh().commands[0].target.offsetSeconds,1);
});
test('same-slot ticks update target without requesting a seek every tick',t=>{
  const {scheduler:s,time,updates}=setup(t);s.powerOn();time.advance(1000);
  assert.equal(updates.at(-1).state.target.offsetSeconds,1);assert.deepEqual(updates.at(-1).commands,[]);
});
test('channel disabled/deleted falls back; empty configuration stops active playback',t=>{
  const {scheduler:s}=setup(t);s.powerOn();const c=configuration();c.channels[0].enabled=false;
  assert.deepEqual(s.replaceConfiguration(c).commands.map(x=>x.type),['stop','start']);assert.equal(s.channelId,'b');
  c.channels=[];c.programs=[];c.schedules=[];delete c.settings.lastChannelId;
  assert.equal(s.replaceConfiguration(c).state.reason,'NO_CHANNEL');assert.equal(s.nextChannel().state.reason,'NO_CHANNEL');
});
test('invalid configuration replacement is atomic; removing active slot stops',t=>{
  const {scheduler:s}=setup(t);const token=s.powerOn().state.token;const c=configuration();c.schedules[0].programId='missing';
  assert.throws(()=>s.replaceConfiguration(c));assert.equal(s.getState().token,token);
  c.schedules.shift();const u=s.replaceConfiguration(c);assert.equal(u.state.reason,'GAP');assert.equal(u.commands[0].type,'stop');
});
test('unrelated config edit cannot restart an ended occurrence; changing program can',t=>{
  const {scheduler:s}=setup(t);s.mediaEnded(s.powerOn().state.token);const c=configuration();c.settings.volume=0.2;
  assert.equal(s.replaceConfiguration(c).state.reason,'MEDIA_ENDED');
  c.programs[0].sourceUrl='https://example.com/replacement.m3u8';assert.equal(s.replaceConfiguration(c).state.kind,'AIR');
});
test('output and input mutation cannot change owned configuration or active state',t=>{
  const c=configuration(),{scheduler:s}=setup(t,c);c.programs[0].sourceUrl='https://evil.example/';
  const result=s.powerOn();result.state.target.program.sourceUrl='bad';result.commands[0].target.offsetSeconds=99;
  assert.equal(s.getState().target.program.sourceUrl,'https://example.com/vod.m3u8');assert.equal(s.getState().target.offsetSeconds,0);
});
test('timer callback already queued before off is ignored; dispose stops once',t=>{
  const {scheduler:s,time,updates}=setup(t);s.powerOn();const queued=[...time.jobs.values()][0].fn;
  s.powerOff();const count=updates.length;queued();assert.equal(updates.length,count);assert.equal(time.jobs.size,0);
  s.powerOn();s.dispose();const n=updates.length;s.dispose();assert.equal(updates.length,n);assert.equal(time.jobs.size,0);
  assert.equal(s.mediaEnded(1),null);assert.throws(()=>s.powerOn(),/disposed/);
});
test('visibility/online/pageshow restore latest time; cleanup removes all hooks',t=>{
  const {scheduler:s,time,updates}=setup(t);const page=Object.assign(new EventTarget(),{visibilityState:'hidden'}),network=new EventTarget();
  const unbind=bindBrowserLifecycle(s,page,network);s.powerOn();time.sleep(3000);
  page.dispatchEvent(new Event('visibilitychange'));assert.equal(s.getState().target.offsetSeconds,0);
  page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(updates.at(-1).reason,'visible');assert.equal(updates.at(-1).commands[0].target.offsetSeconds,3);
  time.sleep(1000);network.dispatchEvent(new Event('online'));assert.equal(updates.at(-1).reason,'online');
  network.dispatchEvent(new Event('pageshow'));assert.equal(updates.at(-1).reason,'resume');
  unbind();const n=updates.length;page.dispatchEvent(new Event('visibilitychange'));network.dispatchEvent(new Event('online'));network.dispatchEvent(new Event('pageshow'));assert.equal(updates.length,n);
});
test('lifecycle while off cannot start playback and unsubscribe stops notifications',t=>{
  const {scheduler:s,time}=setup(t);let count=0;const unsub=s.subscribe(()=>count++);
  assert.equal(s.refresh('visible').state.kind,'OFF');assert.equal(time.jobs.size,0);unsub();s.refresh('online');assert.equal(count,1);
});
test('loop follows Beijing time through late tuning, repeated ends, sleep and slot boundary',t=>{
  const c=configuration();c.schedules[0].endBehavior='loop';c.schedules[0].endMinute=552;
  const {scheduler:s,time}=setup(t,c);time.time=epoch('09:09:59.900');
  const old=s.powerOn().state.token;s.mediaDuration(old,600);
  assert.equal(s.mediaEnded(old).state.kind,'AIR');
  time.advance(100);const next=s.getState();
  assert.notEqual(next.token,old);assert.equal(next.target.offsetSeconds,0);
  assert.equal(s.mediaEnded(old),null);s.powerOff();time.sleep(60000);assert.equal(s.powerOn().state.target.offsetSeconds,60);
  time.sleep(60000);assert.equal(s.refresh('visible').state.reason,'GAP');
});
