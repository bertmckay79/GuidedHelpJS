import test from 'node:test';
import assert from 'node:assert/strict';
import {targetKey,validateTutorial,createTutorialRegistry,createTutorialEngine,
  createTutorialProgress} from '../src/tutorials.js';
import {resolveSpotlightTarget,placeSpotlight} from '../src/spotlight.js';
import {createGuidedHelp} from '../src/index.js';

const tour={
  id:'app.getting-started',title:'Getting Started',
  category:'Basics',summary:'Walk through the home screen.',
  page:'home',
  steps:[
    {id:'intro',title:'Welcome',body:'This is your toolbar.',
      target:{id:'toolbarButton'},advance:'explicit-next'},
    {id:'choose',title:'Open projects',body:'Choose projects yourself.',
      target:'app.projects',advance:'observed-user-interaction',eventType:'click',optional:true}
  ]
};

test('explicit HTML ID targets and existing data-feature strings coexist',()=>{
  assert.equal(targetKey({id:'toolbarButton'}),'id:toolbarButton');
  assert.equal(targetKey({feature:'app.projects'}),'feature:app.projects');
  assert.equal(targetKey('app.projects'),'feature:app.projects');
  assert.equal(targetKey({selector:'#toolbar'}),null);
  assert.equal(targetKey({id:'a',feature:'b'}),null);
  assert.equal(targetKey({id:'x] [onclick'}),null);
  assert.deepEqual(validateTutorial(tour),[]);
});

test('registry rejects unreviewed properties, unsupported actions and duplicate IDs',()=>{
  assert.equal(validateTutorial({...tour,steps:[{...tour.steps[0],target:{selector:'.delete'}}]})
    .some(issue=>issue.includes('invalid semantic target')),true);
  assert.throws(()=>createTutorialRegistry([tour,tour]),/duplicate tutorial ID/);
  assert.throws(()=>createTutorialRegistry([{...tour,steps:[{...tour.steps[0],
    eventType:'click'}]}]),/eventType is only valid/);
});

test('safe step progression requires Next or a trusted native event',()=>{
  const context={page:'home',visibleTargets:[{id:'toolbarButton'},'app.projects']};
  const engine=createTutorialEngine({tutorials:[tour],getContext:()=>context});
  assert.equal(engine.start(tour.id).step.id,'intro');
  assert.equal(engine.observe({
    stepId:'intro',targetId:{id:'toolbarButton'},event:{type:'click',isTrusted:true}
  }).step.id,'intro');
  assert.equal(engine.next().step.id,'choose');
  assert.equal(engine.next().step.id,'choose');
  assert.equal(engine.observe({
    stepId:'choose',targetId:'app.projects',event:{type:'click',isTrusted:false}
  }).step.id,'choose');
  assert.equal(engine.observe({
    stepId:'choose',targetId:{id:'unrelated'},event:{type:'click',isTrusted:true}
  }).step.id,'choose');
  assert.equal(engine.observe({
    stepId:'choose',targetId:{feature:'app.projects'},event:{type:'click',isTrusted:true}
  }).status,'completed');
});

test('page guards and missing targets block without moving forward',()=>{
  let state={page:'other',visibleTargets:[]};
  const engine=createTutorialEngine({tutorials:[tour],getContext:()=>state});
  assert.equal(engine.start(tour.id).reason,'page-unavailable');
  assert.equal(engine.next().index,0);
  state={page:'home',visibleTargets:[]};
  assert.equal(engine.refresh().reason,'target-unavailable');
  state={page:'home',visibleTargets:[{id:'toolbarButton'}]};
  assert.equal(engine.refresh().status,'running');
  assert.equal(engine.next().reason,'target-unavailable');
  assert.equal(engine.snapshot().index,1);
});

test('progress persistence is explicitly scoped and resumable',()=>{
  const values=new Map();
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const progress=createTutorialProgress({storage,key:'test.guided:tutorials:v1'});
  assert.equal(progress.snapshot().enabled,false);
  progress.optIn();
  assert.equal(progress.record(tour.id,'choose','paused'),true);
  const reread=createTutorialProgress({storage,key:'test.guided:tutorials:v1'});
  assert.deepEqual(reread.get(tour.id),{step:'choose',status:'paused'});
  const engine=createTutorialEngine({
    tutorials:[tour],progress:reread,
    getContext:()=>({page:'home',visibleTargets:[{id:'toolbarButton'},'app.projects']})
  });
  assert.equal(engine.start(tour.id,{resume:true}).step.id,'choose');
});

function fakeElement() {
  return {
    isConnected:true,hidden:false,disabled:false,
    getAttribute:()=>null,
    getClientRects:()=>[{}],
    getBoundingClientRect:()=>({left:5,top:5,right:105,bottom:45,width:100,height:40}),
    closest:()=>null
  };
}
test('HTML IDs resolve without selector interpolation; hidden targets are rejected',()=>{
  const element=fakeElement();
  const doc={
    getElementById:id=>id==='toolbarButton'?element:null,
    defaultView:{getComputedStyle:()=>({display:'block',visibility:'visible'})},
    querySelectorAll:()=>[]
  };
  assert.equal(resolveSpotlightTarget(doc,{id:'toolbarButton'}),element);
  element.hidden=true;
  assert.equal(resolveSpotlightTarget(doc,{id:'toolbarButton'}),null);
  assert.equal(resolveSpotlightTarget(doc,{selector:'#toolbarButton'}),null);
  assert.equal(placeSpotlight({
    left:5,top:5,right:105,bottom:45,width:100,height:40
  },{width:360,height:720}).anchored,true);
});

test('standalone core initializes without DOM or Vue',()=>{
  const help=createGuidedHelp({namespace:'tests.guided',tutorials:[tour],render:false});
  assert.equal(help.snapshot().status,'idle');
  assert.equal(help.start(tour.id).status,'blocked');
  help.destroy();
});
