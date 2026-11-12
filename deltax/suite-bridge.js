/* Optional same-origin RefleX suite connection. Public DOI/title only. */
(function(){'use strict';
const embedded=new URLSearchParams(window.location.search).get('embed')==='reflex';if(!embedded||window.parent===window)return;
const origin=window.location.origin,post=message=>window.parent.postMessage(message,origin);
document.body.classList.add('suite-embed');
const style=document.createElement('style');style.textContent='body.suite-embed main>header,body.suite-embed .hero,body.suite-embed .intro,body.suite-embed main>footer{display:none}body.suite-embed main{padding:12px 22px;max-width:none}body.suite-embed .panel{margin-top:8px}';document.head.append(style);
document.getElementById('compare').addEventListener('click',()=>{if(loaded.right?.doi)post({type:'reflex:article',doi:loaded.right.doi,title:loaded.right.title||''})});
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==origin||!event.data||typeof event.data!=='object')return;
 const m=event.data;
 if(m.type==='reflex:heatwave')document.getElementById('heatwave-example').click();
 if(m.type==='reflex:doi'){
  try{
   const doi=DeltaCore.identifier(m.doi).doi,index=checkedExamples.findIndex(e=>e.right.doi===doi);
   if(index>=0){document.getElementById('verified-select').value=String(index);document.getElementById('load-verified').click();if(!checkedExamples[index].liveOnly)document.getElementById('compare').click();}
   else{reset();document.getElementById('right-doi').value=doi;document.getElementById('left-doi').value='';document.getElementById('load-status').textContent='Published DOI received from InspectX. Enter the corresponding preprint or earlier version, then retrieve both texts.';}
  }catch{}
 }
});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>post({type:'reflex:height',height:document.querySelector('main').getBoundingClientRect().height+24})).observe(document.querySelector('main'));
post({type:'reflex:ready'});
})();
