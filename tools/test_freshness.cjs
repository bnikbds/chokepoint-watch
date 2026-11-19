const test = require('node:test');
const assert = require('node:assert/strict');
require('../freshness.js');
const {trafficCurrent, weatherCurrent, assess} = globalThis.CWFreshness;
const now = Date.parse('2026-11-19T12:00:00Z');
const t = {latest:'2026-11-05',score:30};
const w = {start:'2026-11-19T00:00Z',end:'2026-11-20T00:00Z',fetched_at:'2026-11-19T00:20Z',score:20};
test('14 whole calendar days inclusive, 15 days and future counts excluded',()=>{
  assert.ok(trafficCurrent(t,now));
  for(const latest of ['2026-11-04','2026-11-20','invalid']) assert.equal(trafficCurrent({latest},now),false);
});
test('wind clock checks start, end, fetch age and future fetch',()=>{
  assert.ok(weatherCurrent(w,now));
  for(const change of [{start:'2026-11-19T13:00Z'},{end:'2026-11-19T12:00Z'},{fetched_at:'2026-11-18T12:00Z'},{fetched_at:'2026-11-19T13:00Z'}]) {
    assert.equal(weatherCurrent({...w,...change},now),false);
  }
});
test('two valid inputs required, a measured zero remains valid',()=>{
  assert.equal(assess({traffic:t,weather:w},now).score,30);
  assert.equal(assess({traffic:{...t,score:0},weather:{...w,score:0}},now).score,0);
  for(const value of [undefined,null,NaN,-1,101]) assert.equal(assess({traffic:{...t,score:value},weather:w},now).score,null);
});
