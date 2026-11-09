import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {broadcastDay,evaluateSchedule} from '../dist/core/index.js';
import {configuration,epoch} from './helpers.mjs';

test('Beijing date, milliseconds, start inclusive/end exclusive and gaps',()=>{
  const c=configuration();
  assert.equal(evaluateSchedule(c,'a',epoch('08:59:59.999')).reason,'GAP');
  assert.equal(evaluateSchedule(c,'a',epoch()).target.offsetSeconds,0);
  assert.equal(evaluateSchedule(c,'a',epoch('09:30:00.125')).target.offsetSeconds,1800.125);
  assert.equal(evaluateSchedule(c,'a',epoch('09:59:59.999')).target.schedule.id,'am');
  assert.equal(evaluateSchedule(c,'a',epoch('10:00:00')).target.schedule.id,'next');
  assert.equal(evaluateSchedule(c,'a',epoch('11:00:00')).reason,'GAP');
  assert.equal(evaluateSchedule(c,'a',epoch('11:00:00')).nextBoundaryMs,epoch('09:00:00','2026-11-04'));
  assert.equal(broadcastDay(epoch('00:00:00.125')).elapsedMs,125);
});
test('actual duration <= offset means no signal, never loop or prematurely switch slots',()=>{
  const c=configuration();c.programs[0].durationSeconds=600;
  assert.equal(evaluateSchedule(c,'a',epoch('09:09:59.999')).kind,'AIR');
  assert.equal(evaluateSchedule(c,'a',epoch('09:10:00')).reason,'MEDIA_ENDED');
  assert.equal(evaluateSchedule(c,'a',epoch('09:59:00')).nextBoundaryMs,epoch('10:00:00'));
});
test('24:00 ends once, next day starts new occurrence including year rollover',()=>{
  const c=configuration();c.schedules=[{id:'all',channelId:'a',programId:'p',startMinute:0,endMinute:1440}];
  const a=evaluateSchedule(c,'a',epoch('23:59:59.999','2026-12-31'));
  const b=evaluateSchedule(c,'a',epoch('00:00:00','2027-01-01'));
  assert.equal(a.target.offsetSeconds,86399.999);assert.equal(b.target.offsetSeconds,0);
  assert.notEqual(a.target.occurrence,b.target.occurrence);assert.equal(a.target.endMs,b.target.startMs);
});
test('leap day and daily repetition are date-specific',()=>{
  assert.equal(broadcastDay(epoch('23:59:59','2028-02-29')).date,'2028-02-29');
  const c=configuration();
  assert.notEqual(evaluateSchedule(c,'a',epoch()).target.occurrence,evaluateSchedule(c,'a',epoch('09:00:00','2026-11-04')).target.occurrence);
});
test('missing/disabled channel and channels without slots give explicit no signal',()=>{
  const c=configuration();
  for(const id of ['c','missing',undefined])assert.equal(evaluateSchedule(c,id,epoch()).reason,'NO_CHANNEL');
  c.schedules=[];assert.deepEqual(evaluateSchedule(c,'a',epoch()),{kind:'NO_SIGNAL',reason:'GAP',nextBoundaryMs:null});
});
test('all day minutes obey independent slot oracle',()=>{
  const c=configuration();
  for(let minute=0;minute<1440;minute++){
    const e=evaluateSchedule(c,'a',epoch('00:00:00')+minute*60000+999);
    const expected=minute>=540&&minute<600?'am':minute>=600&&minute<660?'next':null;
    assert.equal(e.kind==='AIR'?e.target.schedule.id:null,expected,`minute ${minute}`);
  }
});
test('host timezone does not affect Beijing schedule or DST dates',()=>{
  const script=`import {broadcastDay} from './dist/core/index.js';console.log(JSON.stringify(broadcastDay(${epoch('09:30:00.125','2026-03-08')})));`;
  const outputs=['UTC','Asia/Shanghai','America/Los_Angeles','Europe/London'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,TZ}}));
  assert.equal(new Set(outputs).size,1);assert.equal(JSON.parse(outputs[0]).elapsedMs,34200125);
});
test('invalid clock is rejected rather than converted to a misleading slot',()=>{
  for(const time of [NaN,Infinity,-Infinity])assert.throws(()=>broadcastDay(time),RangeError);
});
