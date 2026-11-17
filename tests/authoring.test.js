import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDraft,editDraft,appendStep,editStep,removeStep,moveStep,
  validateDraft,importTutorialJSON,exportTutorialJSON,suggestedTarget
} from '../src/authoring/draft.js';
import {createTargetPicker} from '../src/authoring/picker.js';
import {createTutorialRegistry} from '../src/tutorials.js';

function recorded() {
  let draft=createDraft({
    id:'test.tour',title:'Recorder trial',category:'Basics',
    summary:'Three real controls',page:'demo'
  });
  draft=appendStep(draft,{id:'CreateProject'});
  draft=appendStep(draft,{feature:'app.settings'});
  draft=appendStep(draft,{id:'PreviewButton'});
  return draft;
}

test('recorder draft builds exportable schema-valid steps with stable targets',()=>{
  const draft=recorded();
  assert.deepEqual(validateDraft(draft),[]);
  assert.deepEqual(draft.steps.map(s=>s.id),['step-1','step-2','step-3']);
  assert.deepEqual(draft.steps[0].target,{id:'CreateProject'});
  assert.deepEqual(draft.steps[1].target,{feature:'app.settings'});
  assert.ok(exportTutorialJSON(draft).includes('CreateProject'));
  assert.equal(createTutorialRegistry([draft]).length,1);
});

test('editing, ordering and round-tripping preserve fields without executing anything',()=>{
  let draft=recorded();
  draft=editStep(draft,1,{advance:'observed-user-interaction'});
  assert.equal(draft.steps[1].eventType,'click');
  draft=editStep(draft,2,{advance:'read-only-state-reached',signal:'demo.ready'});
  draft=editStep(draft,0,{page:'demo',stage:'first',optional:true,
    body:'Inspect this real button without activating it.'});
  draft=moveStep(draft,2,0);
  assert.deepEqual(draft.steps.map(s=>s.id),['step-3','step-1','step-2']);
  const output=exportTutorialJSON(draft);
  const copy=importTutorialJSON(output);
  assert.deepEqual(copy,draft);
  draft=editStep(draft,0,{advance:'explicit-next'});
  assert.equal(draft.steps[0].signal,undefined);
  assert.deepEqual(validateDraft(draft),[]);
  assert.equal(removeStep(draft,1).steps.length,2);
});

test('invalid targets, unknown fields, malicious import and limits are rejected',()=>{
  assert.throws(()=>appendStep(createDraft(),{selector:'body button'}),/Choose an HTML ID/);
  assert.throws(()=>editDraft(createDraft(),{onClick:'alert(1)'}),/Unsupported/);
  assert.throws(()=>editStep(recorded(),0,{script:'go()'}),/Unsupported/);
  assert.throws(()=>importTutorialJSON('{not-json'),/Invalid tutorial JSON/);
  assert.throws(()=>importTutorialJSON(JSON.stringify({
    ...recorded(),steps:[{...recorded().steps[0],body:'<img onerror=alert(1)>'}]
  })),/invalid copy/);
  assert.throws(()=>importTutorialJSON('a'.repeat(140000)),/at most 128 KiB/);
  let draft=createDraft();
  for(let i=0;i<32;i++)draft=appendStep(draft,{id:'control'+i});
  assert.throws(()=>appendStep(draft,{id:'overflow'}),/at most 32/);
  assert.equal(validateDraft({...recorded(),steps:[
    {...recorded().steps[0]},
    {...recorded().steps[0]}
  ]}).some(x=>x.includes('duplicate step ID')),true);
});

const element=(id='',feature=null,parent=null,sensitive=false)=>{
  const classes=new Set();
  return {
    nodeType:1,id,parentElement:parent,isConnected:true,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
    getAttribute:name=>name==='data-feature'?feature:null,
    closest:()=>sensitive?{}:null
  };
};
test('target suggestions read no form values or text and prefer nearest stable ID',()=>{
  const ancestor=element('outer');
  const inner=element('inner',null,ancestor);
  Object.defineProperty(inner,'value',{get(){throw new Error('value should not be read');}});
  Object.defineProperty(inner,'textContent',{get(){throw new Error('text should not be read');}});
  assert.deepEqual(suggestedTarget(inner),{id:'inner'});
  assert.deepEqual(suggestedTarget(element('', 'app.control',ancestor)),{feature:'app.control'});
  assert.equal(suggestedTarget(element('password',null,ancestor,true)),null);
});

function fixture() {
  const registrations=new Map();
  const doc={
    addEventListener(type,handler){if(!registrations.has(type))registrations.set(type,new Set());registrations.get(type).add(handler);},
    removeEventListener(type,handler){registrations.get(type)?.delete(handler);},
    emit(type,target,{trusted=true,key}={}){
      const event={
        type,target,key,isTrusted:trusted,cancelable:true,prevented:false,stopped:false,
        preventDefault(){this.prevented=true;},
        stopImmediatePropagation(){this.stopped=true;}
      };
      for(const callback of registrations.get(type)||[])callback(event);
      return event;
    }
  };
  return {doc,registrations};
}
test('target picker prevents host clicks, records trusted controls, respects editor and Escape',()=>{
  const {doc,registrations}=fixture();
  const body=element();
  const host=element('saveButton',null,body);
  const panel=element('authorPanel',null,body);
  let count=0,cancelled=false;
  const picker=createTargetPicker({
    document:doc,root:body,
    isEditorElement:e=>e===panel,
    onSelect:target=>{assert.deepEqual(target,{id:'saveButton'});count++;},
    onCancel:()=>{cancelled=true;}
  });
  picker.activate();
  assert.equal(doc.emit('pointerover',host).stopped,false);
  assert.equal(host.classList.contains('ghr-candidate'),true);
  const untrusted=doc.emit('click',host,{trusted:false});
  assert.equal(untrusted.prevented,true);
  assert.equal(count,0);
  const selected=doc.emit('click',host);
  assert.equal(selected.prevented,true);
  assert.equal(selected.stopped,true);
  assert.equal(count,1);
  assert.equal(doc.emit('click',panel).prevented,false);
  assert.equal(count,1);
  assert.equal(doc.emit('keydown',host,{key:'Enter'}).prevented,true);
  assert.equal(count,2);
  doc.emit('keydown',host,{key:'Escape'});
  assert.equal(cancelled,true);
  assert.equal(picker.isActive(),false);
  assert.equal(host.classList.contains('ghr-candidate'),false);
  assert.equal([...registrations.values()].every(set=>set.size===0),true);
  picker.destroy();
});
