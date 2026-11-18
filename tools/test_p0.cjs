const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ctx={console,Date};ctx.window=ctx;vm.createContext(ctx);
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('application/json')&&(m[2].includes('C.quote=function')||m[2].includes('Pure functions')))vm.runInContext(m[2],ctx);
const C=ctx.CWCore,I=JSON.parse(html.match(/id="embedded-intel"[^>]*>([\s\S]*?)<\/script>/)[1]);
const q=JSON.parse(fs.readFileSync(path.join(root,'p0/exemple-budget.json')));
let n=0;function test(name,f){f();console.log('PASS '+name);n++;}
test('Budget pédagogique : 2 conteneurs, 1 B/L = 4860 EUR',()=>assert.equal(C.quote(q,I).total,4860));
test('Émissions Chine incluses : pas de double comptage',()=>{let v=structuredClone(q);v.lines.emissions.status='add';assert.equal(C.quote(v,I).total,4860);assert.equal(C.emissionsTariff(I,q.route,q.carrier,q.equipment,q.currency,q.departure).amount,148)});
test('Cotation expirée : total bloqué',()=>{let v=structuredClone(q);v.validTo='2026-11-20';assert.equal(C.quote(v,I).total,null)});
test('Poste absent : pas de faux zéro',()=>{let v=structuredClone(q);delete v.lines.destination;assert.equal(C.quote(v,I).total,null)});
test('Tarif 2027 hors validité T4',()=>assert.equal(C.emissionsTariff(I,q.route,q.carrier,q.equipment,q.currency,'2027-01-01').available,false));
test('Détour hypothétique : +8,44 jours, +1000 EUR, +2,4 tCO2',()=>{let v=C.transitScenario({speed:16,distanceBase:18000,distanceAlt:24000,waitBase:0,waitAlt:0,quoteBase:2430,quoteAlt:2930,quantity:2,quoteRef:'HYPOTHÈSE',factor:20,mass:10,factorRef:'HYPOTHÈSE, non calibrée'});assert.ok(Math.abs(v.deltaDays-8.437365)<.001);assert.equal(v.deltaCost,1000);assert.equal(v.deltaCo2,2.4)});
const data=JSON.parse(fs.readFileSync(path.join(root,'p0/snapshot.json')));
const rows=[...data.passages.suez.traffic.rows,...data.passages.panama.traffic.rows];
test('Données : dates, doublons et comptages validés',()=>{const recognized=rows.filter(r=>C.PORTS[r.portid]);assert.equal(C.validateRows(recognized,'2026-11-18').length,recognized.length)});
for(const id of ['chokepoint1','chokepoint2'])test(id+' : douze mois complets novembre 2025 à octobre 2026',()=>{let r=rows.filter(x=>x.portid===id&&x.date>='2025-11-01'&&x.date<='2026-10-31');assert.equal(r.length,365);assert.equal(new Set(r.map(x=>x.date)).size,365)});
test('Briefing public, méthode et CSV accessibles dans le paquet',()=>{for(const p of ['p0/index.html','p0/briefing.html','p0/methode.html','p0/observations.csv'])assert.ok(fs.statSync(path.join(root,p)).size>100)});
console.log(n+' tests P0 réussis.');
