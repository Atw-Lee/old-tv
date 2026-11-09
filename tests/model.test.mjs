import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseConfiguration, ConfigurationError, adjacentChannel, enabledChannels} from '../dist/core/index.js';
import {configuration} from './helpers.mjs';

test('valid configuration is copied and keeps shared program references as IDs',()=>{
  const input=configuration(), out=parseConfiguration(input);
  input.channels[0].name='mutated';assert.equal(out.channels[0].name,'动画');
  assert.equal(out.schedules[0].programId,out.schedules[2].programId);
});
const invalid = [
  ['duplicate ID', c=>{c.channels[1].id='a';}],
  ['duplicate number', c=>{c.channels[1].number=1;}],
  ['missing channel', c=>{c.schedules[0].channelId='missing';}],
  ['missing program', c=>{c.schedules[0].programId='missing';}],
  ['same-channel overlap', c=>{c.schedules[1].startMinute=599;}],
  ['nested overlap', c=>{c.schedules[1].startMinute=550;c.schedules[1].endMinute=560;}],
  ['midnight crossing', c=>{c.schedules[0].startMinute=1380;c.schedules[0].endMinute=60;}],
  ['zero length', c=>{c.schedules[0].endMinute=540;}],
  ['fractional minute', c=>{c.schedules[0].startMinute=540.5;}],
  ['24:00 cannot start', c=>{c.schedules[0].startMinute=1440;}],
  ['negative duration', c=>{c.programs[0].durationSeconds=-1;}],
  ['NaN duration', c=>{c.programs[0].durationSeconds=NaN;}],
  ['infinite duration', c=>{c.programs[0].durationSeconds=Infinity;}],
  ['zero duration', c=>{c.programs[0].durationSeconds=0;}],
  ['unsafe URL', c=>{c.programs[0].sourceUrl='javascript:alert(1)';}],
  ['URL credentials', c=>{c.programs[0].sourceUrl='https://user:secret@example.com/v.m3u8';}],
  ['unknown source', c=>{c.programs[0].sourceType='live';}],
  ['bad settings schema', c=>{c.settings.schemaVersion=2;}],
  ['volume range', c=>{c.settings.volume=1.1;}],
  ['invalid remembered channel', c=>{c.settings.lastChannelId='missing';}],
  ['wrong enabled type', c=>{c.channels[0].enabled='false';}],
];
for (const [name,edit] of invalid) test(`reject ${name}`,()=>{
  const c=configuration();edit(c);assert.throws(()=>parseConfiguration(c),ConfigurationError);
});
test('reject non-object and malformed arrays with useful paths',()=>{
  for(const x of [null,[],{},'config'])assert.throws(()=>parseConfiguration(x),ConfigurationError);
  const c=configuration();c.schedules={};assert.throws(()=>parseConfiguration(c),/schedules/);
});
test('adjacent slots, cross-channel overlap, 24:00 ending and unknown duration allowed',()=>{
  const c=configuration();c.schedules[1].endMinute=1440;
  assert.equal(parseConfiguration(c).schedules[1].endMinute,1440);
});
test('channel navigation follows sort order, skips disabled, wraps and preserves IDs',()=>{
  const c=configuration();c.channels[0].sortOrder=9;
  assert.deepEqual(enabledChannels(c.channels).map(x=>x.id),['b','a']);
  assert.equal(adjacentChannel(c.channels,'a',1),'b');
  assert.equal(adjacentChannel(c.channels,'b',-1),'a');
  assert.equal(adjacentChannel(c.channels,undefined,1),'b');
  assert.equal(adjacentChannel(c.channels,undefined,-1),'a');
  assert.equal(adjacentChannel([],undefined,1),undefined);
  assert.equal(c.channels[0].id,'a');
});

test('M0 Bilibili restrictions remain explicit, unlike runtime-controllable HLS/YouTube',async()=>{
  const {sourcePolicy}=await import('../dist/core/index.js');
  assert.deepEqual(sourcePolicy('bilibili'),{seek:'initial-only',externalVolume:false,externalStatus:false,endedNotification:false,controls:'platform-limited'});
  assert.equal(sourcePolicy('hls-vod').seek,'runtime');assert.equal(sourcePolicy('youtube').controls,'platform-limited');
  const policy=sourcePolicy('bilibili');policy.externalVolume=true;assert.equal(sourcePolicy('bilibili').externalVolume,false);
});
