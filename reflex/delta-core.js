/* DeltaX: inspectable text comparison. No scientific validity or causality inference. */
(function(root){'use strict';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function identifier(value){let s=String(value||'').trim().replace(/^doi:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');try{s=decodeURIComponent(s)}catch{}if(!/^10\.\d{4,9}\/[^\s<>"?#]+$/i.test(s)||s.length>300)throw new Error('Enter a valid DOI, with a preprint version suffix if known.');const match=s.match(/^(10\.(?:1101|64898)\/.+?)v(\d+)$/i);return {doi:(match?match[1]:s).toLowerCase(),version:match?+match[2]:null,entered:s};}
function section(s){s=clean(s).toLowerCase().replace(/^\d+[.\s]+/,'');if(/^(?:abstract|summary|structured abstract)$/.test(s))return 'abstract';if(/method|materials|experimental procedures/.test(s))return 'methods';if(/result/.test(s))return 'results';if(/discussion|conclusion/.test(s))return 'discussion';if(/introduction|background/.test(s))return 'introduction';if(/data avail|code avail|software avail/.test(s))return 'availability';return s||'text'}
function tokens(s){return (String(s).toLowerCase().match(/[\p{L}\p{N}_]+/gu)||[])}
function similarity(a,b){const x=new Set(tokens(a)),y=new Set(tokens(b));let common=0;for(const t of x)if(y.has(t))common++;return x.size+y.size?2*common/(x.size+y.size):0}
function numbers(s){return [...String(s).matchAll(/(?:[−-]?\d+(?:[.,]\d+)?(?:\s*[×x]\s*10\s*[−-]?\d+)?(?:\s*%|\s*(?:mg|kg|ml|μl|µl|weeks?|months?|years?))?)/gi)].map(m=>clean(m[0])).sort()}
function cues(s){return [...new Set((String(s).toLowerCase().match(/\b(?:may|might|suggest(?:s|ed)?|demonstrat(?:e|es|ed)|caus(?:e|es|ed|al)|associat(?:ed|ion)|significant(?:ly)?|not significant|no evidence|consistent with|prove[sd]?)\b/g)||[]))].sort()}
function resources(s){return [...new Set(String(s).match(/RRID:\s*[A-Za-z][A-Za-z0-9_:-]+/g)||[])].sort()}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function classify(left,right,kind){const tags=[],facts=[];let priority=0;const a=left?.text||'',b=right?.text||'';
if(kind==='unchanged')return {tags:['Unchanged'],facts:['Extracted text is unchanged after whitespace normalisation.'],priority:-1};
if(kind==='moved'){tags.push('Location changed');facts.push('The extracted text is identical but its section changed.');return {tags,facts,priority:0}}
if(kind==='added'||kind==='removed'){tags.push(kind==='added'?'Text added':'Text removed');facts.push('No sufficiently similar paragraph was aligned on the other side. Paragraph splitting or extraction differences may explain this.');return {tags,facts,priority:1}}
const na=numbers(a),nb=numbers(b);if(!same(na,nb)){tags.push('Numbers changed');facts.push('Numeric strings differ. These may be results, sample sizes, dates, citations or figure labels; inspect their context.');priority+=5}
if(!same(cues(a),cues(b))){tags.push('Claim wording');facts.push('Words expressing certainty, association or significance changed. A human must decide whether the scientific claim changed.');priority+=4}
if(!same(resources(a),resources(b))){tags.push('Resource identifiers');facts.push('Explicit RRID strings differ in this aligned passage. This is not evidence of global resource loss.');priority+=4}
if(section(left?.sectionGroup||left?.section)==='methods'||section(right?.sectionGroup||right?.section)==='methods'){tags.push('Methods passage');facts.push('Text changed in a methods section; this does not establish that an experiment or analysis changed.');priority+=2}
if(section(left?.sectionGroup||left?.section)==='availability'||section(right?.sectionGroup||right?.section)==='availability'){tags.push('Availability statement');facts.push('Data/code availability wording changed; link access and completeness are not verified.');priority+=2}
if(!tags.length){tags.push('Other wording');facts.push('Wording or punctuation changed. Scientific significance has not been inferred.')}
return {tags,facts,priority,numbersBefore:na,numbersAfter:nb,cuesBefore:cues(a),cuesAfter:cues(b)};
}
function selectParagraphs(doc,scope){const paragraphs=doc.paragraphs.filter(p=>scope!=='abstract'||section(p.section)==='abstract');if(!paragraphs.length)throw new Error('No '+scope+' text is available in one of the versions.');if(paragraphs.length>800)throw new Error('More than 800 paragraphs in the selected scope. Compare abstracts or import a smaller, clearly labelled excerpt.');return paragraphs.map((p,i)=>({...p,id:p.id||'p'+(i+1),text:clean(p.text),index:i})).filter(p=>p.text)}
function authorship(left,right){
 const key=s=>clean(s).normalize('NFKC').toLowerCase().replace(/[.,]/g,'');
 if(!left.authorsFormat||left.authorsFormat!==right.authorsFormat||!left.authors?.length||!right.authors?.length)return {available:false,reason:'Author metadata unavailable or not comparable.'};
 const a=left.authors.map(key),b=right.authors.map(key),unique=new Set(a).size===a.length&&new Set(b).size===b.length;
 const added=right.authors.filter((n,i)=>!a.includes(b[i])),removed=left.authors.filter((n,i)=>!b.includes(a[i]));
 const commonA=a.filter(n=>b.includes(n)),commonB=b.filter(n=>a.includes(n));
 const affiliations=[];
 for(const name of commonA){
  const x=left.authorDetails?.find(n=>key(n.name)===name),y=right.authorDetails?.find(n=>key(n.name)===name);
  const known=unique&&!!x?.affiliations?.length&&!!y?.affiliations?.length;
  affiliations.push({name:left.authors[a.indexOf(name)],available:known,before:x?.affiliations||null,after:y?.affiliations||null,changed:known?!same(x.affiliations.map(key).sort(),y.affiliations.map(key).sort()):null});
 }
 return {available:true,added,removed,orderChanged:unique?!same(commonA,commonB):null,affiliations,qualification:'Names are matched by normalised spelling, not verified identity. Unmatched names may reflect spelling or initials. Affiliation wording differences do not establish a change of institution.'};
}
function jatsAuthors(d){
 const tx=n=>clean(n?.textContent),aff=new Map([...d.querySelectorAll('article-meta aff[id]')].map(n=>{const copy=n.cloneNode(true);copy.querySelectorAll('label').forEach(x=>x.remove());return [n.id,tx(copy)]}));
 return [...d.querySelectorAll('article-meta > contrib-group contrib[contrib-type="author"]')].map(n=>{const name=n.querySelector('name'),label=name?clean(tx(name.querySelector('given-names'))+' '+tx(name.querySelector('surname'))):tx(n.querySelector('collab'));const refs=[...n.querySelectorAll('xref[ref-type="aff"]')].flatMap(x=>(x.getAttribute('rid')||'').split(/\s+/));const affiliations=[...new Set([...refs.map(id=>aff.get(id)).filter(Boolean),...[...n.querySelectorAll(':scope > aff')].map(tx)])];return {name:label,affiliations:affiliations.length?affiliations:null}}).filter(n=>n.name);
}
function changeExcerpt(row,side){
 const a=row.left?.text||'',b=row.right?.text||'',diff=wordDiff(a,b),pieces=diff[side];
 let offset=0,found=null;
 for(const piece of pieces){if(piece.type!=='same'&&/[\p{L}\p{N}]/u.test(piece.text)){found=offset;break}offset+=piece.text.length;}
 const text=side==='left'?a:b,start=Math.max(0,(found??0)-65);
 return (start?'…':'')+(text.slice(start,start+220)||'No aligned passage')+(text.length>start+220?'…':'');
}
function significanceChange(a,b){
 const sentences=t=>String(t).split(/(?<=[.!?])\s+(?=[A-Z])/).map(clean).filter(Boolean);
 const status=t=>/\b(?:no|not|non)[ -]+(?:statistically\s+)?significant\b/i.test(t)?'not significant':/\bsignificant(?:ly)?\b/i.test(t)?'significant':null;
 const x=sentences(a),y=sentences(b),best=(text,list)=>list.map((s,i)=>({i,score:similarity(text,s)})).sort((a,b)=>b.score-a.score)[0];
 for(let i=0;i<x.length;i++){const m=best(x[i],y);if(!m||m.score<.45)continue;const back=best(y[m.i],x);if(back?.i!==i)continue;const before=status(x[i]),after=status(y[m.i]);if(before&&after&&before!==after)return {before,after,earlier:x[i],later:y[m.i],similarity:m.score};}
 return null;
}
function protocolChange(a,b){
 const find=t=>[...String(t).matchAll(/(\d+(?:\.\d+)?)\s*[-–]?\s*(ml|mg|µl|μl|cm)\s+(vials?|tubes?|flasks?|dishes?|plates?)/gi)].map(m=>({value:m[1],unit:m[2].toLowerCase(),object:m[3].toLowerCase().replace(/s$/,''),position:m.index}));
 const x=find(a),y=find(b);
 for(const p of x){const q=y.find(q=>q.unit===p.unit&&q.object===p.object&&q.value!==p.value);if(q)return {before:p.value+' '+p.unit+' '+p.object,after:q.value+' '+q.unit+' '+q.object,beforePosition:p.position,afterPosition:q.position,occurrences:x.filter(n=>n.unit===p.unit&&n.object===p.object).length};}return null;
}
function assessChange(rows,scope){
 const group=p=>/conclu|discussion|take.?home|interpretation/i.test(p?.section||'')?'interpretation':section(p?.sectionGroup||p?.section);
 const weights={interpretation:.9,results:.9,methods:.9,abstract:.9,introduction:.2};
 const meaningfulNumbers=t=>numbers(String(t).replace(/\[[^\]]*\]/g,'').replace(/\b(?:Fig(?:ure)?\.?|Table)\s*\d+[A-Za-z]?/gi,'').replace(/\b(?:19|20)\d{2}\b/g,''));
 for(const row of rows){
  row.reviewSection=group(row.right||row.left);
  const weight=Math.max(weights[group(row.left)]??.35,weights[group(row.right)]??.35);
  const numeric=row.kind==='changed'&&!same(meaningfulNumbers(row.left.text),meaningfulNumbers(row.right.text));
  const claim=row.kind==='changed'&&row.tags.includes('Claim wording');
  row.protocolChange=row.kind==='changed'&&group(row.right||row.left)==='methods'?protocolChange(row.left.text,row.right.text):null;
  const reversal=row.kind==='changed'?significanceChange(row.left.text,row.right.text):null;row.significanceChange=reversal;
  if(reversal){row.tags.push('Significance statement changed');row.facts.push('Matched sentences change from '+reversal.before+' to '+reversal.after+'. This flags the reported statement, not a verified reanalysis.');}
  if(numeric&&group(row.right||row.left)==='methods'){row.tags.push('Protocol quantity wording changed');row.facts.push('A numeric detail in Methods differs; check whether this is a correction, clarification or procedure change.');}
  const base=row.kind==='unchanged'||row.kind==='moved'?0:row.kind==='changed'?(reversal?100:row.protocolChange?70+Math.min(8,row.protocolChange.occurrences*2):25+(numeric?30:0)+(claim?35:0)):35;
  row.reviewPoints=Math.round(base*weight);row.reviewNumeric=numeric;row.reviewClaim=claim;
 }
 const ranked=rows.filter(r=>r.reviewPoints>0).sort((a,b)=>b.reviewPoints-a.reviewPoints);
 const highlighted=[];for(const candidate of [ranked.find(r=>r.significanceChange),ranked.find(r=>r.protocolChange)||ranked.find(r=>r.tags.includes('Protocol quantity wording changed')),...ranked]){if(candidate&&!highlighted.includes(candidate))highlighted.push(candidate);if(highlighted.length===3)break;}
 const score=ranked.length?Math.min(100,Math.round(ranked[0].reviewPoints+(ranked[1]?.reviewPoints||0)*.07+(ranked[2]?.reviewPoints||0)*.03)):0;
 const takeaway=ranked.some(r=>['interpretation','abstract'].includes(r.reviewSection)&&r.reviewClaim);
 const core=ranked.some(r=>['results','methods'].includes(r.reviewSection)&&(r.reviewNumeric||r.reviewClaim));
 const unmatched=rows.filter(r=>r.kind==='added'||r.kind==='removed').length;
 const aligned=rows.filter(r=>['changed','unchanged','moved'].includes(r.kind)).length;
 const uncertain=unmatched>aligned||ranked.some(r=>r.reviewPoints>=25&&['added','removed'].includes(r.kind));
 const reversal=ranked.some(r=>r.significanceChange);
 const assessment=reversal?'Reported significance statement changed':takeaway?'Takeaway wording may have changed':core?'Results or methods changes need review':ranked.length?'Wording changes detected; a changed takeaway is not established':'No textual change detected in the compared scope';
 return {schema:'deltax-review-priority/3',score,label:score>=60?'High review priority':score>=25?'Moderate review priority':score>0?'Low review priority':'No text-change signal',assessment,scope,confidence:uncertain?'Limited by unmatched passages':'Heuristic; interpretation unverified',unmatched,topPassages:highlighted.map(r=>({id:r.id,section:r.reviewSection,points:r.reviewPoints,earlierLocator:r.left?.id||null,laterLocator:r.right?.id||null,earlierExcerpt:changeExcerpt(r,'left'),laterExcerpt:changeExcerpt(r,'right'),reason:r.significanceChange?'Reported significance: '+r.significanceChange.before+' → '+r.significanceChange.after:r.protocolChange?'Protocol description: '+r.protocolChange.before+' → '+r.protocolChange.after:r.kind==='added'||r.kind==='removed'?'Unmatched passage; may be extraction or paragraph splitting':r.reviewClaim?(r.reviewNumeric?'Claim cue and numeric content changed':'Claim-wording cue changed'):r.reviewNumeric?'Numeric content changed':'Wording changed'})),method:'Section weights: results, methods, abstract and interpretation (discussion/conclusions) all 0.90; introduction 0.20, other 0.35. Headings alone do not rank conclusions above results. Explicit significance-statement reversal 100 base points; matched unit/container quantity changes 70 plus up to 8 points for repeated mentions. Aligned wording 25 points, numeric difference +30, claim cue +35; unmatched 35, moved/unchanged 0. Highest weighted passage plus 7% and 3% of the next two, capped at 100. Bracketed citations, years and figure/table numbers are ignored for numeric scoring. Not empirically calibrated.',limit:'Review priority, not a probability, integrity score or verdict that the scientific gist changed. A low score does not establish equivalent science. Claims, figures, tables and underlying analyses require expert review.'};
}
function compare(left,right,scope='abstract'){
if(!['abstract','full','excerpt'].includes(scope))throw new Error('Unsupported comparison scope.');
if(scope==='full'&&(!left.fullText||!right.fullText))throw new Error('Both versions must contain full text. Full text is never compared against an abstract.');
const a=selectParagraphs(left,scope),b=selectParagraphs(right,scope),usedA=new Set(),usedB=new Set(),aligned=[];
// Exact matches first, including moved paragraphs and duplicate text occurrences.
const exact=new Map();a.forEach((p,i)=>{const key=clean(p.text);if(!exact.has(key))exact.set(key,[]);exact.get(key).push(i)});
b.forEach((p,j)=>{const queue=exact.get(clean(p.text))||[];let slot=queue.findIndex(i=>!usedA.has(i)&&section(a[i].section)===section(p.section));if(slot<0)slot=queue.findIndex(i=>!usedA.has(i));if(slot>=0){const i=queue[slot];usedA.add(i);usedB.add(j);aligned.push({left:a[i],right:p,kind:section(a[i].section)===section(p.section)?'unchanged':'moved',score:1})}});
// Token index bounds candidate generation before greedy similarity alignment.
const index=new Map();a.forEach((p,i)=>{if(usedA.has(i))return;for(const t of new Set(tokens(p.text))){if(t.length<3)continue;if(!index.has(t))index.set(t,[]);index.get(t).push(i)}});
const options=[];b.forEach((p,j)=>{if(usedB.has(j))return;const votes=new Map();for(const t of new Set(tokens(p.text))){const ids=index.get(t)||[];if(ids.length>80)continue;for(const i of ids){if(section(a[i].section)!==section(p.section))continue;votes.set(i,(votes.get(i)||0)+1)}}for(const [i] of [...votes].sort((x,y)=>y[1]-x[1]||x[0]-y[0]).slice(0,16)){const score=similarity(a[i].text,p.text);if(score>=.42)options.push({i,j,score})}});
options.sort((x,y)=>y.score-x.score||x.i-y.i||x.j-y.j);for(const o of options){if(usedA.has(o.i)||usedB.has(o.j))continue;usedA.add(o.i);usedB.add(o.j);aligned.push({left:a[o.i],right:b[o.j],kind:'changed',score:o.score})}
// Reconcile adjacent split/merged paragraphs before calling anything unmatched.
// Every original fragment keeps its ID/index and may belong to only one pair.
const combine=(p,q)=>{const fragments=[...(p.fragments||[p]),...(q.fragments||[q])].sort((x,y)=>x.index-y.index);return {...fragments[0],id:fragments.map(x=>x.id).join(' + '),text:fragments.map(x=>x.text).join(' '),fragments,sourceIndices:fragments.map(x=>x.index)}};
for(const row of aligned.filter(r=>r.kind==='changed').sort((x,y)=>y.score-x.score)){
 for(let pass=0;pass<6;pass++){
  let best=null;
  for(const [side,source,used,other] of [['left',a,usedA,'right'],['right',b,usedB,'left']]){
   const current=row[side],indices=current.sourceIndices||[current.index];
   for(const index of [Math.min(...indices)-1,Math.max(...indices)+1]){
    const candidate=source[index];if(!candidate||used.has(index)||section(candidate.section)!==section(current.section))continue;
    const merged=combine(current,candidate),score=similarity(merged.text,row[other].text);
    if(score>row.score+.01&&(!best||score>best.score))best={side,used,index,merged,score};
   }
  }
  if(!best)break;row[best.side]=best.merged;row.score=best.score;best.used.add(best.index);row.grouped=true;
 }
 if(row.grouped)row.kind=clean(row.left.text)===clean(row.right.text)?'unchanged':'changed';
}
a.forEach((p,i)=>{if(!usedA.has(i))aligned.push({left:p,right:null,kind:'removed',score:null})});b.forEach((p,j)=>{if(!usedB.has(j))aligned.push({left:null,right:p,kind:'added',score:null})});
const rows=aligned.map((r,i)=>({...r,id:'change-'+(i+1),...classify(r.left,r.right,r.kind)}));
rows.sort((x,y)=>y.priority-x.priority||(x.right?.index??x.left.index)-(y.right?.index??y.left.index));
const counts={before:aligned.filter(r=>r.left).length,after:aligned.filter(r=>r.right).length,beforeFragments:a.length,afterFragments:b.length,grouped:aligned.filter(r=>r.grouped).length,unchanged:rows.filter(r=>r.kind==='unchanged').length,changed:rows.filter(r=>r.kind==='changed').length,moved:rows.filter(r=>r.kind==='moved').length,added:rows.filter(r=>r.kind==='added').length,removed:rows.filter(r=>r.kind==='removed').length,numeric:rows.filter(r=>r.tags.includes('Numbers changed')).length,claim:rows.filter(r=>r.tags.includes('Claim wording')).length};
const review=assessChange(rows,scope);rows.sort((a,b)=>b.reviewPoints-a.reviewPoints||b.priority-a.priority);
const authorsKnown=left.authorsFormat===right.authorsFormat&&!!left.authorsFormat&&Array.isArray(left.authors)&&left.authors.length&&Array.isArray(right.authors)&&right.authors.length;
return {schema:'deltax-comparison/2',scope,created:new Date().toISOString(),method:'Exact paragraph matching, then same-section greedy token similarity (minimum 0.42). Cue-based labels require human interpretation.',counts,rows,review,authorship:authorship(left,right),titleChanged:!!left.title&&!!right.title&&clean(left.title)!==clean(right.title),authorsChanged:authorsKnown?!same(left.authors,right.authors):null,left:{...left,paragraphs:undefined},right:{...right,paragraphs:undefined},limits:'Extracted text only. Adjacent split/merged fragments are grouped when they improve alignment; original locators are retained. Images, supplements and raw data are not analysed. JATS tables/captions/references are excluded where structurally identifiable; PDF text may include layout, caption or table noise. Alignment errors, splitting and extraction differences may resemble additions/deletions. Changes cannot be attributed to peer review from these documents alone.'};
}
function wordDiff(a,b){const parts=s=>String(s).match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)||[];const x=parts(a),y=parts(b);if(x.length*y.length>2000000||Math.max(x.length,y.length)>10000)return {coarse:true,left:[{type:'same',text:a}],right:[{type:'same',text:b}]};const w=y.length+1,table=new Uint16Array((x.length+1)*w);for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)table[i*w+j]=x[i]===y[j]?table[(i+1)*w+j+1]+1:Math.max(table[(i+1)*w+j],table[i*w+j+1]);let i=0,j=0;const l=[],r=[];const push=(arr,type,text)=>{const last=arr[arr.length-1];if(last?.type===type)last.text+=text;else arr.push({type,text})};while(i<x.length||j<y.length){if(i<x.length&&j<y.length&&x[i]===y[j]){push(l,'same',x[i++]);push(r,'same',y[j++])}else if(i<x.length&&(j>=y.length||table[(i+1)*w+j]>=table[i*w+j+1]))push(l,'remove',x[i++]);else push(r,'add',y[j++])}return {coarse:false,left:l,right:r}}
function parsePlain(text,label='Text'){let current=label;const paragraphs=[];for(const block of String(text).replace(/\r\n/g,'\n').split(/\n\s*\n/)){const lines=block.trim().split('\n');if(!lines[0])continue;let remaining=lines;if(/^(abstract|introduction|background|results|discussion|conclusions?|methods|materials and methods|data availability|code availability)$/i.test(lines[0].trim())){current=lines[0].trim();remaining=lines.slice(1)}const value=clean(remaining.join(' '));if(value)paragraphs.push({id:'p'+(paragraphs.length+1),section:current,text:value})}return paragraphs}
function parseJATS(xml,Parser){const d=new Parser().parseFromString(xml,'application/xml');if(d.querySelector('parsererror')||!d.querySelector('article'))throw new Error('Not readable JATS article XML.');const tx=n=>clean(n?.textContent);const paragraphs=[...d.querySelectorAll('abstract p, body p, back notes p, back sec p')].filter(p=>!p.closest('ref-list, ref, table-wrap, fig')).map((p,i)=>({id:p.id||'p'+(i+1),section:p.closest('abstract')?'Abstract':tx(p.closest('sec, notes')?.querySelector('title'))||'Text',text:tx(p),part:p.closest('abstract')?'abstract':p.closest('body')?'body':'back',sectionGroup:(()=>{if(p.closest('abstract'))return 'abstract';for(let n=p.parentElement;n;n=n.parentElement){if(n.tagName==='sec'){const title=tx(n.querySelector(':scope > title')),kind=section(title);if(['methods','results','discussion','introduction'].includes(kind))return kind;}}return null})()})).filter(p=>p.text);if(!paragraphs.length)throw new Error('No paragraphs extracted.');const license=d.querySelector('permissions license');const authorDetails=jatsAuthors(d);return {title:tx(d.querySelector('article-title')),doi:tx(d.querySelector('article-meta > article-id[pub-id-type="doi"]')),date:[...d.querySelectorAll('article-meta > pub-date')].map(n=>tx(n)).join(' / ')||'Date not extracted',version:[...d.querySelectorAll('article-version')].map(tx).find(v=>/^v?\d+$/i.test(v))||null,authors:authorDetails.map(n=>n.name),authorDetails,license:tx(license)||'Licence not extracted',authorsFormat:'jats-name',fullText:paragraphs.some(p=>p.part==='body'),paragraphs};}
const api={significanceChange,assessChange,authorship,identifier,section,similarity,numbers,cues,classify,compare,wordDiff,parsePlain,parseJATS};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DeltaCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
