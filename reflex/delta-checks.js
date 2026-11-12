/* RefleX calls the real DeltaX comparison engine against authored controls. */
(function(root){'use strict';
const controls=[
 {id:'D1',title:'Significant → not significant',section:'Results',before:['Males exposed to the heatwave showed significantly greater resistance to starvation than control males.'],after:['Males exposed to the heatwave showed no significant difference in resistance to starvation compared to control males.'],expected:'Flag a change in statistical significance.',check:r=>r.rows.some(x=>x.significanceChange?.before==='significant'&&x.significanceChange?.after==='not significant')},
 {id:'D2',title:'Unchanged finding',section:'Results',before:['Males exposed to the heatwave showed no significant difference in resistance to starvation compared to control males.'],after:['Males exposed to the heatwave showed no significant difference in resistance to starvation compared to control males.'],expected:'No change and no review priority.',check:r=>r.review.score===0&&r.counts.changed===0},
 {id:'D3',title:'Protocol quantity: 12 ml → 60 ml',section:'Methods',before:['Each experimental male was placed individually into a 12-ml vial containing a sexually mature, unmated female.'],after:['Each experimental male was placed individually into a 60-ml vial containing a sexually mature, unmated female.'],expected:'Flag the changed protocol quantity.',check:r=>r.rows.some(x=>x.tags.includes('Protocol quantity wording changed'))},
 {id:'D4',title:'A paragraph split, with identical text',section:'Abstract',before:['When starved of nitrogen, cells enter a quiescent state with smaller nuclei. We used confocal microscopy to study nuclear biology.'],after:['When starved of nitrogen, cells enter a quiescent state with smaller nuclei.','We used confocal microscopy to study nuclear biology.'],expected:'Group the fragments without reporting text added or removed.',check:r=>r.counts.added===0&&r.counts.removed===0&&r.review.score===0}
];
function run(engine){const doc=(parts,section)=>({fullText:true,paragraphs:parts.map((text,i)=>({id:'p'+(i+1),section,text})),warnings:[]});return controls.map(c=>{const result=engine.compare(doc(c.before,c.section),doc(c.after,c.section),'full');return {...c,result,pass:c.check(result)}})}
root.ReflexDeltaChecks={run};
if(typeof module!=='undefined'&&module.exports){module.exports={run};return}
const el=id=>document.getElementById(id),frame=el('delta-frame'),origin=window.location.origin;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
el('run-delta-tests').onclick=()=>{
 const rows=run(root.DeltaCore),passed=rows.filter(x=>x.pass).length;
 el('delta-test-results').innerHTML=`<h3 style="margin-top:25px">${passed} / ${rows.length} controls matched the expected answer</h3>`+rows.map(c=>`<article class="delta-control"><h3>${c.id} · ${escape(c.title)}</h3><span class="pill ${c.pass?'good':'bad'}">${c.pass?'Expected behaviour':'Needs investigation'}</span><div class="pair"><div class="paper"><b>Earlier · ${escape(c.section)}</b><p>${escape(c.before.join(' '))}</p></div><div class="paper"><b>Later · ${escape(c.section)}</b><p>${escape(c.after.join(' '))}</p></div></div><p><b>Expected:</b> ${escape(c.expected)}<br><b>DeltaX returned:</b> ${escape(c.result.rows.flatMap(x=>x.tags).filter((x,i,a)=>a.indexOf(x)===i).join(' · ')||'No change labels')}. ${c.result.counts.added} added, ${c.result.counts.removed} removed, ${c.result.counts.grouped} grouped.</p></article>`).join('');
};
let pending=false;
el('delta-real-example').onclick=()=>{frame.hidden=false;pending=true;if(!frame.getAttribute('src'))frame.src=el('delta-standalone').getAttribute('href')+'?embed=reflex';else if(frame.dataset.ready==='true'){frame.contentWindow.postMessage({type:'reflex:heatwave'},origin);pending=false}el('delta-source-status').textContent='Loading the real comparison below. Its findings are separate from the authored controls above.';};
window.addEventListener('message',event=>{
 if(event.source!==frame.contentWindow||event.origin!==origin||!event.data||typeof event.data!=='object')return;
 if(event.data.type==='reflex:ready'){frame.dataset.ready='true';if(pending){frame.contentWindow.postMessage({type:'reflex:heatwave'},origin);pending=false}}
 if(event.data.type==='reflex:height'&&Number.isFinite(event.data.height))frame.style.height=Math.max(850,Math.min(24000,event.data.height+24))+'px';
});
})(typeof globalThis!=='undefined'?globalThis:this);
