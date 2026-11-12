'use strict';
const by=id=>document.getElementById(id),origin=window.location.origin;
const frames={inspect:by('inspect-frame'),delta:by('delta-frame')};
let current=null,pending={inspect:null,delta:null};
const descriptions={inspect:['PAPER SCREENING','InspectX','Locate reporting evidence, check supported numerical statements and inspect controlled wording tests. Signals require review.'],delta:['VERSION TRANSPARENCY','DeltaX','Compare paper versions and inspect the evidence behind result, protocol and authorship changes.'],lab:['CHECKER ASSURANCE','Assurance lab','Known-answer synthetic examples expose false alerts, scope gaps and upgrade regressions. These are not vendor performance estimates.']};
function validDOI(value){return typeof value==='string'&&/^10\.\d{4,9}\/[^\s<>"?#]+$/i.test(value)&&value.length<=300}
function send(tool,message){pending[tool]=message;const frame=frames[tool];if(frame.dataset.ready==='true'){frame.contentWindow.postMessage(message,origin);pending[tool]=null;}}
function show(view){
 if(!['home','inspect','delta','lab'].includes(view))view='home';
 by('home').hidden=view!=='home';by('workspace').hidden=view==='home';
 document.querySelectorAll('nav [data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(view==='home')return;
 const tool=view==='delta'?'delta':'inspect',frame=frames[tool],desc=descriptions[view];
 by('tool-kind').textContent=desc[0];by('tool-title').textContent=desc[1];by('tool-copy').textContent=desc[2];
 frames.inspect.hidden=tool!=='inspect';frames.delta.hidden=tool!=='delta';by('lab-controls').hidden=view!=='lab';by('paper-context').hidden=view==='lab';
 const src=tool==='delta'?'../deltax/?embed=reflex':'workbench.html?embed=reflex';
 if(!frame.getAttribute('src'))frame.src=src;
 by('open-tool').href=tool==='delta'?'../deltax/':'workbench.html'+(view==='inspect'?'?mode=inspect':'?mode=lab');
 if(tool==='inspect')send('inspect',{type:'reflex:mode',mode:view==='lab'?'lab':'inspect',chapter:+by('lab-chapter').value});
}
function setCurrent(message){if(!validDOI(message.doi))return;current={doi:message.doi,title:typeof message.title==='string'?message.title.slice(0,500):''};by('current-paper').textContent=(current.title?current.title+' · ':'')+current.doi;by('to-inspect').disabled=false;by('to-delta').disabled=false;}
window.addEventListener('message',event=>{
 const tool=event.source===frames.inspect.contentWindow?'inspect':event.source===frames.delta.contentWindow?'delta':null;
 if(!tool||event.origin!==origin||!event.data||typeof event.data!=='object')return;
 const message=event.data;
 if(message.type==='reflex:ready'){frames[tool].dataset.ready='true';if(pending[tool])send(tool,pending[tool]);return}
 if(message.type==='reflex:article')setCurrent(message);
 if(message.type==='reflex:height'&&Number.isFinite(message.height))frames[tool].style.height=Math.max(750,Math.min(24000,message.height+24))+'px';
});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{by('handoff-status').textContent='';show(b.dataset.view)});
by('lab-chapter').onchange=()=>send('inspect',{type:'reflex:mode',mode:'lab',chapter:+by('lab-chapter').value});
by('to-inspect').onclick=()=>{if(!current)return;show('inspect');send('inspect',{type:'reflex:doi',doi:current.doi});by('handoff-status').textContent='Published DOI sent to InspectX. The saved heatwave source loads automatically; for other papers, press Retrieve & analyse.';};
by('to-delta').onclick=()=>{if(!current)return;show('delta');send('delta',{type:'reflex:doi',doi:current.doi});by('handoff-status').textContent='DOI sent to DeltaX. A matching saved pair loads when available; otherwise enter the corresponding earlier version.';};
by('start-assurance').onclick=()=>{by('lab-chapter').value='0';by('handoff-status').textContent='Start with equivalent wording, then compare upgrades and tool stacks.';show('lab')};
by('guided-demo').onclick=()=>{show('delta');send('delta',{type:'reflex:heatwave'});by('handoff-status').textContent='Start with the significance-statement change, then use Inspect this paper to carry the published DOI into InspectX.';};
by('suite-home').onclick=event=>{event.preventDefault();show('home')};
show('home');
