/* Same-origin suite navigation. No article text or credentials are transferred. */
(function(){'use strict';
const params=new URLSearchParams(window.location.search),embedded=params.get('embed')==='reflex',origin=window.location.origin;
const post=message=>{if(embedded&&window.parent!==window)window.parent.postMessage(message,origin)};
const style=document.createElement('style');style.textContent='body.suite-embed aside,body.suite-embed main>header,body.suite-embed main>.eyebrow,body.suite-embed main>footer,body.suite-embed main>.ownership{display:none}body.suite-embed main{margin-left:0;max-width:none;padding:20px 28px}body.suite-embed main>h1{font-size:34px}body.suite-embed main>.lead{font-size:16px}';document.head.append(style);
if(embedded)document.body.classList.add('suite-embed');
function mode(value,chapter){go(value==='lab'?Math.max(0,Math.min(3,Number.isInteger(chapter)?chapter:0)):4)}
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==origin||!event.data||typeof event.data!=='object')return;
 const m=event.data;
 if(m.type==='reflex:mode')mode(m.mode,m.chapter);
 if(m.type==='reflex:doi'){try{const doi=ReflexArticle.normaliseDOI(m.doi);mode('inspect');document.getElementById('article-doi').value=doi;document.getElementById('doi-status').textContent='DOI received from DeltaX. Press Retrieve & analyse to inspect this paper.';if(globalThis.ReflexSavedArticles?.doi===doi)document.getElementById('article-sample').click();}catch{}}
});
if(embedded||params.get('mode')==='inspect')mode('inspect');else if(params.get('mode')==='lab')mode('lab',0);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>post({type:'reflex:height',height:document.querySelector('main').getBoundingClientRect().height+48})).observe(document.querySelector('main'));
post({type:'reflex:ready'});
})();
