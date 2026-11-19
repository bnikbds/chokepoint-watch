/* Public register. Add a dated edition only after checking its regional table.
   Maps reproduce a source category; they do not estimate incident probabilities. */
(() => {
  'use strict';
  const scale = [
    {key:'LOW', fr:'Faible', color:'#247653'},
    {key:'MODERATE', fr:'Modéré', color:'#aa8010'},
    {key:'SUBSTANTIAL', fr:'Substantiel', color:'#c26423'},
    {key:'SEVERE', fr:'Sévère', color:'#a63d38'},
    {key:'CRITICAL', fr:'Critique', color:'#762d61'}
  ];
  const indexUrl='https://www.ukmto.org/partner-products/jmic-products/jmic-advisories';
  const editions=[
    {number:114,date:'2026-11-15',section:3,page:4,checked:'2026-11-19',
     url:'https://www.ukmto.org/-/media/ukmto/products/update-114_jmic_advisory_15-nov.pdf?rev=be65cfbd755a41c4816feba6cef4401c',
     levels:{suez:'MODERATE',bab:'SUBSTANTIAL',aden:'SUBSTANTIAL'}},
    {number:113,date:'2026-11-12',section:3,page:4,checked:'2026-11-19',
     url:'https://www.ukmto.org/-/media/ukmto/products/jmic_advisory_update_113_12-nov.pdf?rev=7fe7908661f24d2ebb037b750628f240',
     levels:{suez:'MODERATE',bab:'SUBSTANTIAL',aden:'SUBSTANTIAL'}}
  ];
  const regions={suez:'Northern Red Sea / Suez Canal',bab:'Bab el-Mandeb / Southern Red Sea',aden:'Gulf of Aden'};
  function assessment(passage,edition=editions[0],asOf=new Date().toISOString().slice(0,10)){
    const ageDays=(Date.parse(asOf+'T00:00:00Z')-Date.parse(edition.date+'T00:00:00Z'))/86400000;
    const level=scale.find(x=>x.key===edition.levels[passage]);
    const available=Number.isFinite(ageDays)&&ageDays>=0;
    return {level:available?(level||null):null,ageDays,reviewDue:!available||ageDays>2,region:regions[passage]||null};
  }
  const api={scale,editions,regions,assessment,indexUrl};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.CWJMIC=api;
})();
