/* RefleX: transparent demonstration rules, not commercial vendor models. */
(function(root){
'use strict';
const cases=[
{id:'R1',pair:'randomisation',criterion:'randomisation',title:'Conventional wording',text:'Participants were randomised to the two study groups.',issue:false,reason:'Random allocation is explicitly reported.'},
{id:'R2',pair:'randomisation',criterion:'randomisation',title:'Same method, different words',text:'Participants were allocated to the two study groups by chance.',issue:false,reason:'Allocation by chance expresses random allocation; equivalent to R1.'},
{id:'R3',criterion:'randomisation',title:'A keyword inside a negation',text:'Participants were not randomized to the two study groups.',issue:true,reason:'The text explicitly states that allocation was not random.'},
{id:'R4',criterion:'randomisation',title:'Predictable allocation',text:'Participants were assigned to study groups according to date of birth.',issue:true,reason:'Date of birth is a predictable allocation rule, not random allocation.'},
{id:'B1',pair:'blinding',criterion:'blinding',title:'Conventional wording',text:'Outcome assessors were blinded to treatment allocation.',issue:false,reason:'Assessor blinding is explicitly reported.'},
{id:'B2',pair:'blinding',criterion:'blinding',title:'Same protection, different words',text:'Outcome assessors were kept unaware of treatment allocation.',issue:false,reason:'Kept unaware expresses assessor blinding; equivalent to B1.'},
{id:'B3',criterion:'blinding',title:'Absence explicitly stated',text:'No blinding was used when the outcomes were assessed.',issue:true,reason:'Outcome assessment was explicitly unblinded.'},
{id:'B4',criterion:'blinding',title:'Open-label does not tell the whole story',text:'The study was open-label for participants, but outcome assessors were blinded to treatment allocation.',issue:false,reason:'The test concerns outcome assessors. Their blinding is reported, even though participants knew their allocation.'},
{id:'B5',criterion:'blinding',title:'A longer negative phrase',text:'No assessor blinding was used in this study.',issue:true,reason:'The statement explicitly rules out assessor blinding.'},
{id:'B6',pair:'blinding',criterion:'blinding',title:'Another equivalent expression',text:'Outcome evaluation was masked to treatment allocation.',issue:false,reason:'Masked outcome evaluation expresses assessor blinding; equivalent to B1.'},
{id:'N1',criterion:'counts',title:'Participant totals reconcile',text:'Total enrolled: 120. Treatment group: 60. Control group: 60.',issue:false,reason:'60 + 60 = 120.'},
{id:'N2',criterion:'counts',title:'Ten unexplained participants',text:'Total enrolled: 120. Treatment group: 68. Control group: 62.',issue:true,reason:'68 + 62 = 130, not the stated total of 120. The synthetic example defines two exhaustive groups with no overlap.'},
{id:'N3',criterion:'counts',title:'Another consistent total',text:'Total enrolled: 90. Treatment group: 45. Control group: 45.',issue:false,reason:'45 + 45 = 90.'},
{id:'N4',criterion:'counts',title:'Ten participants unaccounted for',text:'Total enrolled: 100. Treatment group: 50. Control group: 40.',issue:true,reason:'50 + 40 = 90, not 100. The synthetic example defines two exhaustive groups with no exclusions.'},
{id:'T1',criterion:'timing',title:'Primary endpoint shifts',text:'Primary outcome: 6 weeks. Figure caption, primary outcome: 12 weeks.',issue:true,reason:'The same primary endpoint is assigned two different times: 6 and 12 weeks.'},
{id:'T2',criterion:'timing',title:'Endpoint timing reconciles',text:'Primary outcome: 6 weeks. Figure caption, primary outcome: 6 weeks.',issue:false,reason:'Both descriptions specify 6 weeks.'}
];
function checkA(c,version){
const t=c.text.toLowerCase();
if(!['randomisation','blinding'].includes(c.criterion))return {flag:null,why:'Outside Checker A’s reporting scope.'};
if(c.criterion==='randomisation'){
if(version===1){const found=/randomi[sz]/.test(t);return {flag:!found,why:found?'v1 found a randomisation keyword; negation is not interpreted.':'v1 did not find its randomisation keyword.'};}
const negative=/not randomi[sz]|date of birth/.test(t);const found=/randomi[sz]|by chance/.test(t);
return {flag:negative||!found,why:negative?'v2 matched an explicit non-random allocation rule.':found?'v2 recognised random allocation wording.':'v2 did not recognise random allocation.'};
}
if(version===1){const found=/blind/.test(t);return {flag:!found,why:found?'v1 found “blind”; it does not interpret negation or assessor roles.':'v1 did not find “blind”.'};}
if(/open-label/.test(t))return {flag:true,why:'v2 flags “open-label” before checking whose blinding is described. This deliberately introduced rule causes a regression.'};
if(/no (?:assessor )?blinding/.test(t))return {flag:true,why:'v2 recognised explicitly absent blinding.'};
const found=/blind|unaware|masked/.test(t);return {flag:!found,why:found?'v2 recognised blinding, unaware or masked wording.':'v2 did not recognise assessor blinding.'};
}
function checkB(c){
const t=c.text.toLowerCase();
if(c.criterion==='randomisation')return {flag:/not randomi[sz]|date of birth/.test(t),why:'Checker B searches for explicit non-random allocation, overlapping with A v2.'};
if(c.criterion==='counts'){
const total=t.match(/total enrolled:\s*(\d+)/),a=t.match(/treatment group:\s*(\d+)/),b=t.match(/control group:\s*(\d+)/);
if(!total||!a||!b)return {flag:null,why:'Required counts could not be parsed.'};
return {flag:+a[1]+ +b[1]!==+total[1],why:`Parsed group counts: ${a[1]} + ${b[1]} = ${+a[1]+ +b[1]}; stated total: ${total[1]}.`};
}
if(c.criterion==='timing'){
const m=[...t.matchAll(/primary outcome:\s*(\d+) weeks/g)];if(m.length!==2)return {flag:null,why:'Two endpoint times could not be parsed.'};
return {flag:m[0][1]!==m[1][1],why:`Compared primary endpoint times: ${m[0][1]} versus ${m[1][1]} weeks.`};
}
return {flag:null,why:'Outside Checker B’s scope.'};
}
function evaluate(version=1,stack=false,corpus=cases){
const rows=corpus.map(c=>{const a=checkA(c,version),b=stack?checkB(c):{flag:null,why:'Checker B is not enabled.'};const flags=[a.flag,b.flag];const flag=flags.includes(true)?true:flags.includes(false)?false:null;return {...c,a,b,flag,verdict:flag===null?'unassessed':flag===c.issue?(flag?'caught':'clear'):(flag?'false-alert':'missed')};});
const n=k=>rows.filter(r=>r.verdict===k).length;
const alerts=rows.reduce((s,r)=>s+Number(r.a.flag===true)+Number(r.b.flag===true),0);
const unique=rows.filter(r=>r.flag===true).length;
return {version,stack,rows,total:rows.length,knownIssues:rows.filter(r=>r.issue).length,caught:n('caught'),missed:n('missed'),falseAlerts:n('false-alert'),clear:n('clear'),unassessed:n('unassessed'),unassessedIssues:rows.filter(r=>r.issue&&r.flag===null).length,alerts,unique,duplicates:alerts-unique};
}
function workload({volume,prevalence,sensitivity,specificity,minutes}){
const affected=volume*prevalence/100;const caught=affected*sensitivity/100;const falseAlerts=(volume-affected)*(1-specificity/100);return {caught,falseAlerts,cases:caught+falseAlerts,hours:(caught+falseAlerts)*minutes/60};
}
function evaluateReport(report){
if(!report||report.schema!=='reflex-results/1'||!Array.isArray(report.results))throw new Error('Expected schema reflex-results/1 and a results array.');
const known=new Map(cases.map(c=>[c.id,c]));const seen=new Set();
for(const row of report.results){if(!known.has(row.id))throw new Error('Unknown case ID: '+row.id);if(seen.has(row.id))throw new Error('Duplicate case ID: '+row.id);if(row.flag!==true&&row.flag!==false&&row.flag!==null)throw new Error('flag must be true, false or null: '+row.id);seen.add(row.id)}
const values=new Map(report.results.map(r=>[r.id,r.flag]));const rows=cases.map(c=>{const flag=values.has(c.id)?values.get(c.id):null;return {id:c.id,expectedIssue:c.issue,flag,verdict:flag===null?'unassessed':flag===c.issue?(flag?'caught':'clear'):(flag?'false-alert':'missed')}});
return {checker:typeof report.checker==='string'?report.checker.slice(0,100):'User-supplied checker',total:cases.length,caught:rows.filter(r=>r.verdict==='caught').length,falseAlerts:rows.filter(r=>r.verdict==='false-alert').length,missed:rows.filter(r=>r.verdict==='missed').length,unassessed:rows.filter(r=>r.verdict==='unassessed').length,rows};
}
const api={cases,checkA,checkB,evaluate,workload,evaluateReport};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.Reflex=api;
})(typeof globalThis!=='undefined'?globalThis:this);
