import {tutorialEligibility} from './tutorials.js';

// Host-independent catalogue: entries belong to the adopting app, not Studio.
export function searchTutorials(tutorials=[],{query='',context={},progress}={}) {
  const term=String(query||'').trim().toLocaleLowerCase();
  return tutorials.filter(t=>(t.title+' '+t.summary+' '+t.category)
    .toLocaleLowerCase().includes(term))
    .map(t=>({...t,reason:tutorialEligibility(t,context),
      progress:progress?.get(t.id)||null}));
}
export function groupTutorials(entries=[]) {
  const result=[];
  for(const entry of entries){
    let group=result.find(x=>x.category===entry.category);
    if(!group){group={category:entry.category,entries:[]};result.push(group);}
    group.entries.push(entry);
  }
  return result;
}
