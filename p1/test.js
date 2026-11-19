'use strict';
const tasks=[
 ['suez','Retrouvez l’historique du trafic au canal de Suez. Que mesure le graphique et quelle période voyez-vous ?'],
 ['bulletin','À Suez, quel niveau de sûreté pouvez-vous documenter, à quelle date et avec quelle source ? Que pouvez-vous en conclure pour votre commande ?'],
 ['commande','À partir du site, indiquez une question précise à poser au transporteur avant de promettre une date au client.']
];
const form=document.querySelector('#test'),role=document.querySelector('#role'),questions=document.querySelector('#questions');
let started;
for(const [id,question] of tasks){
 const section=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=question;section.append(legend);
 const select=document.createElement('select'),label=document.createElement('label');select.id='status-'+id;select.required=true;label.htmlFor=select.id;label.textContent='Avez-vous trouvé une réponse ?';
 for(const value of ['', 'Sans aide','Avec aide','Bloqué'])select.add(new Option(value||'Choisir…',value));
 const answer=document.createElement('textarea'),caption=document.createElement('label');answer.id='answer-'+id;answer.required=true;answer.maxLength=650;caption.htmlFor=answer.id;caption.textContent='Votre réponse, ou l’endroit du blocage';
 section.append(label,select,caption,answer);document.querySelector('#tasks').append(section);
}
document.querySelector('#start').onclick=()=>{
 if(!role.reportValidity())return;
 started=new Date();questions.hidden=false;document.querySelector('#start').hidden=true;questions.querySelector('a').focus();
};
form.onsubmit=e=>{
 e.preventDefault();if(!started||!form.reportValidity())return;
 const now=new Date(),result={protocol:'CW-P1-20261119',session:started.toISOString(),finished:now.toISOString(),elapsed_seconds:Math.round((now-started)/1000),role:role.value,consent:document.querySelector('#consent').checked,tasks:tasks.map(([id])=>({id,status:document.getElementById('status-'+id).value,answer:document.getElementById('answer-'+id).value.trim()})),improvement:document.querySelector('#comment').value.trim()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='Chokepoint-test-'+started.toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 document.querySelector('#done').textContent='Fichier prêt. Transmettez-le au groupe si vous souhaitez participer.';
};
