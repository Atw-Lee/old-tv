import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locate} from '../src/clock.mjs';
test('Beijing slot: start inclusive, end exclusive, millisecond precision',()=>{
 assert.equal(locate(Date.parse('2026-11-02T00:59:59Z')).active,false);
 assert.deepEqual(locate(Date.parse('2026-11-02T01:30:00.125Z')),{active:true,offset:1800.125});
 assert.equal(locate(Date.parse('2026-11-02T02:00:00Z')).active,false);
});
test('daily repetition and early media exhaustion',()=>{
 assert.deepEqual(locate(Date.parse('2026-11-03T01:30:00Z')),{active:true,offset:1800});
 assert.equal(locate(Date.parse('2026-11-02T01:30:00Z'),1800).active,false);
});
