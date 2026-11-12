/* Public-only PDF preparation; documents never leave this browser. */
'use strict';
document.getElementById('prepare-yeast').onclick=async()=>{
 const status=document.getElementById('yeast-status'),button=document.getElementById('prepare-yeast');
 button.disabled=true;status.textContent='Reading your PDFs locally. The first use loads PDF.js…';
 try{
  const docs={};
  for(const [stage,label,doi] of [['preprint','Preprint v2','10.1101/2020.01.11.899559'],['accepted','Accepted manuscript','10.1242/jcs.263654'],['record','Version of record','10.1242/jcs.263654']]){
   const file=document.getElementById('yeast-file-'+stage).files[0];if(!file)throw new Error('Choose all three PDF files first.');
   const parsed=await DeltaPDF.extract(await file.arrayBuffer(),{expectedDOI:doi,title:'Macromolecular and cytological changes in fission yeast G0 nuclei'});
   const text=parsed.paragraphs.map(p=>p.text).join(' ');
   if(stage==='accepted'&&!/Accepted manuscript/i.test(text))throw new Error('The accepted-manuscript label was not found in that PDF.');
   if(stage==='record'&&(!/RESEARCH ARTICLE/i.test(text)||/Accepted manuscript/i.test(text)))throw new Error('The typeset article label was not found, or this is an accepted manuscript.');
   if(stage==='preprint'&&!/April\s+10,?\s+2024/i.test(text))throw new Error('The 10 April 2024 preprint-v2 date was not found.');
   // Rejoin short layout fragments within a page/section. Keep source locators.
   const paragraphs=[];
   for(const p of parsed.paragraphs){const last=paragraphs[paragraphs.length-1];if(last&&last.section===p.section&&last.id.split('-line-')[0]===p.id.split('-line-')[0]&&last.text.length<4500){last.text+=' '+p.text;last.sourceIds.push(p.id)}else paragraphs.push({...p,sourceIds:[p.id]});}
   docs[stage]={...parsed,paragraphs,doi,stage,stageLabel:label+' · imported PDF',version:label+' · user-imported PDF',versionNumber:stage==='preprint'?2:null,authors:null,authorsFormat:null,authorDetails:null,origin:'User-imported PDF; stage checked against visible text markers',sourceURL:'https://doi.org/'+doi,retrieved:new Date().toISOString(),snapshot:true};
  }
  globalThis.DeltaYeast=docs;
  document.getElementById('yeast-preprint').disabled=false;document.getElementById('yeast-record').disabled=false;
  status.textContent='Three PDFs prepared locally. Choose a comparison above. Imported PDF authors and affiliations are not automatically extracted.';
 }catch(error){globalThis.DeltaYeast=null;document.getElementById('yeast-preprint').disabled=true;document.getElementById('yeast-record').disabled=true;status.textContent='Not prepared: '+error.message;}
 finally{button.disabled=false;}
};
