import {targetKey,validateTutorial} from '../tutorials.js';

const metaFields=new Set(['id','title','category','summary','page','stage','capability']);
const stepFields=new Set([
  'id','title','body','target','advance','eventType','signal','optional',
  'page','stage','capability','availability'
]);
const copy=value=>JSON.parse(JSON.stringify(value));
const idRx=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function createDraft(fields={}) {
  const draft={
    id:'tutorial.new-tour',
    title:'New tutorial',
    category:'Getting started',
    summary:'Describe what this tutorial teaches.',
    steps:[]
  };
  return editDraft(draft,fields);
}

export function editDraft(draft,fields={}) {
  if(!draft||typeof draft!=='object'||Array.isArray(draft))throw new TypeError('Invalid draft');
  if(!fields||typeof fields!=='object'||Array.isArray(fields)||
     Object.keys(fields).some(key=>!metaFields.has(key)))
    throw new TypeError('Unsupported draft field');
  const result=copy(draft);
  for(const key of Object.keys(fields)) {
    if(fields[key]===undefined||fields[key]==='')delete result[key];
    else result[key]=fields[key];
  }
  return result;
}

export function appendStep(draft,target) {
  if(!targetKey(target))throw new TypeError('Choose an HTML ID or data-feature target');
  if(draft.steps.length>=32)throw new RangeError('A tutorial has at most 32 steps');
  const ids=new Set(draft.steps.map(step=>step.id));
  let count=1;
  while(ids.has('step-'+count))count++;
  const step={
    id:'step-'+count,
    title:'Step '+(draft.steps.length+1),
    body:'Explain this control and what to do next.',
    target:copy(target),
    advance:'explicit-next'
  };
  return {...copy(draft),steps:[...copy(draft.steps),step]};
}

export function editStep(draft,index,changes) {
  if(!Number.isInteger(index)||index<0||index>=draft.steps.length)
    throw new RangeError('Unknown step');
  if(!changes||typeof changes!=='object'||Array.isArray(changes)||
     Object.keys(changes).some(key=>!stepFields.has(key)))
    throw new TypeError('Unsupported step field');
  const result=copy(draft);
  const step=result.steps[index];
  for(const [key,value] of Object.entries(changes)) {
    if(value===undefined||value===''||(key==='optional'&&!value))delete step[key];
    else step[key]=value;
  }
  if('advance' in changes) {
    if(step.advance!=='observed-user-interaction')delete step.eventType;
    if(step.advance!=='read-only-state-reached')delete step.signal;
    if(step.advance==='observed-user-interaction')step.eventType||='click';
    if(step.advance==='read-only-state-reached')step.signal||='app.ready';
  }
  return result;
}

export function moveStep(draft,from,to) {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||
     from>=draft.steps.length||to>=draft.steps.length)
    throw new RangeError('Unknown step');
  const result=copy(draft);
  const [step]=result.steps.splice(from,1);
  result.steps.splice(to,0,step);
  return result;
}

export function removeStep(draft,index) {
  if(!Number.isInteger(index)||index<0||index>=draft.steps.length)
    throw new RangeError('Unknown step');
  const result=copy(draft);
  result.steps.splice(index,1);
  return result;
}

export function validateDraft(draft) {
  return validateTutorial(draft);
}

export function importTutorialJSON(content) {
  if(typeof content!=='string'||content.length>131072)
    throw new TypeError('Tutorial JSON must be a string of at most 128 KiB');
  let item;
  try {item=JSON.parse(content);}
  catch(_) {throw new Error('Invalid tutorial JSON');}
  const errors=validateDraft(item);
  if(errors.length)throw new Error('Invalid tutorial: '+errors.join('; '));
  return copy(item);
}

export function exportTutorialJSON(draft) {
  const errors=validateDraft(draft);
  if(errors.length)throw new Error('Cannot export invalid tutorial: '+errors.join('; '));
  // A new JSON object, rather than preserving unknown object prototypes.
  return JSON.stringify(copy(draft),null,2)+'\n';
}

// The authoring UI never reads text/value attributes from target elements.
export function suggestedTarget(element,{root=null}={}) {
  let item=element;
  while(item&&item!==root) {
    if(item.nodeType!==1)break;
    if(item.closest?.('[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],input:not([type="button"]):not([type="submit"]):not([type="reset"]),textarea,select,[data-guided-private]'))
      return null;
    const candidateId={id:item.id};
    if(targetKey(candidateId))return candidateId;
    const feature=item.getAttribute?.('data-feature');
    if(targetKey({feature}))return {feature};
    item=item.parentElement;
  }
  return null;
}
