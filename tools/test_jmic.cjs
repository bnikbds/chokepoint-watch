const {test}=require('node:test');
const assert=require('node:assert/strict');
const J=require('../jmic.js');
const last=J.editions[0],before=J.editions[1];
test('All five source categories remain distinct and ordered',()=>{
 assert.deepEqual(J.scale.map(l=>l.key),['LOW','MODERATE','SUBSTANTIAL','SEVERE','CRITICAL']);
 assert.equal(new Set(J.scale.map(l=>l.color)).size,5);
});
test('15 November: three regional rows transcribed from section 3',()=>{
 assert.deepEqual(last.levels,{suez:'MODERATE',bab:'SUBSTANTIAL',aden:'SUBSTANTIAL'});
 assert.equal(last.number,114);assert.equal(last.date,'2026-11-15');assert.equal(last.page,4);
});
test('12 November: separate source, date and supported rows',()=>{
 assert.equal(before.number,113);assert.equal(before.date,'2026-11-12');assert.notEqual(before.url,last.url);
 assert.deepEqual(before.levels,last.levels);
});
test('No unsupported JMIC level for the six other passages',()=>{
 for(const id of ['panama','singapore','malacca','sicily','gibraltar','dover'])assert.equal(J.assessment(id,last,'2026-11-19').level,null);
});
test('A review-due bulletin keeps its documented category',()=>{
 const result=J.assessment('suez',last,'2026-11-19');assert.equal(result.level.key,'MODERATE');assert.equal(result.ageDays,4);assert.equal(result.reviewDue,true);
});
test('Two-calendar-day review boundary',()=>{
 assert.equal(J.assessment('suez',last,'2026-11-17').reviewDue,false);
 assert.equal(J.assessment('suez',last,'2026-11-18').reviewDue,true);
});
test('Future edition and invalid clock never yield a level',()=>{
 for(const day of ['2026-11-14','invalid'])assert.equal(J.assessment('suez',last,day).level,null);
});
