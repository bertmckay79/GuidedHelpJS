// Adapted from BM3D-Media/Unity-Sprite-Rigging's reviewed tutorial engine.
// Framework-independent: validation, local state/progress and guarded progression.
// Reviewed, local-only tutorial contracts. The engine is deliberately DOM/transport free.
// Feature announcements and tutorial progress use different IDs and storage keys.
export const TUTORIAL_PROGRESS_KEY='guided.help:tutorials:v1';
export const TUTORIAL_TRIGGERS=Object.freeze([
  'explicit-next','observed-user-interaction','read-only-state-reached'
]);
const ID=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const HTML_ID=/^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const htmlId=value=>typeof value==='string'&&value.length<=120&&HTML_ID.test(value);
const STATUS=new Set(['running','blocked','paused','skipped','completed']);
const EVENT_TYPES=new Set(['click','change']);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\x00-\x1f]/.test(v);
const id=v=>typeof v==='string'&&v.length<=120&&ID.test(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// String targets preserve existing data-feature identifiers; objects support HTML IDs.
export function targetKey(target) {
  if(typeof target==='string')return id(target)?'feature:'+target:null;
  if(!target||typeof target!=='object'||Array.isArray(target)||
     Object.keys(target).length!==1)return null;
  if(own(target,'id'))return htmlId(target.id)?'id:'+target.id:null;
  if(own(target,'feature'))return id(target.feature)?'feature:'+target.feature:null;
  return null;
}
function fields(obj,allowed) {
  return Object.keys(obj).filter(k=>!allowed.includes(k)).map(k=>'unsupported field '+k);
}
export function validateTutorial(item,{anchors,pages}={}) {
  const errors=[];
  if(!item||typeof item!=='object'||Array.isArray(item))return ['invalid tutorial'];
  errors.push(...fields(item,['id','title','summary','category','steps','page','stage','capability']));
  if(!id(item.id))errors.push('invalid tutorial ID');
  for(const k of ['title','summary','category'])
    if(!text(item[k],k==='summary'?260:100))errors.push('invalid '+k);
  if(item.page!==undefined&&!(pages===undefined?id(item.page):
    Array.isArray(pages)&&pages.includes(item.page)&&id(item.page)))errors.push('invalid page');
  if(item.stage!==undefined&&!id(item.stage))errors.push('invalid stage');
  if(item.capability!==undefined&&!id(item.capability))errors.push('invalid capability');
  if(!Array.isArray(item.steps)||!item.steps.length||item.steps.length>32){
    errors.push('steps must contain 1–32 entries');return errors;
  }
  const seen=new Set();
  for(const [i,s] of item.steps.entries()) {
    const prefix=item.id+' / step '+(s?.id||i)+': ';
    if(!s||typeof s!=='object'||Array.isArray(s)) {
      errors.push(prefix+'invalid step');continue;
    }
    errors.push(...fields(s,['id','title','body','target','page','stage','availability',
      'capability','advance','eventType','signal','optional']).map(e=>prefix+e));
    if(!id(s.id)||seen.has(s.id))errors.push(prefix+'invalid or duplicate step ID');
    seen.add(s.id);
    if(!text(s.title,100)||!text(s.body,600))errors.push(prefix+'invalid copy');
    if(!targetKey(s.target))errors.push(prefix+'invalid semantic target');
    if(anchors&&!anchors.has(targetKey(s.target))&&!anchors.has(s.target))
      errors.push(prefix+'missing semantic anchor '+targetKey(s.target));
    if(s.page!==undefined&&!(pages===undefined?id(s.page):
      Array.isArray(pages)&&pages.includes(s.page)&&id(s.page)))errors.push(prefix+'invalid page');
    if(s.stage!==undefined&&!id(s.stage))errors.push(prefix+'invalid stage');
    if(s.capability!==undefined&&!id(s.capability))errors.push(prefix+'invalid capability');
    if(s.availability!==undefined&&!id(s.availability))
      errors.push(prefix+'unknown availability');
    if(!TUTORIAL_TRIGGERS.includes(s.advance))errors.push(prefix+'invalid advance trigger');
    if(s.advance==='observed-user-interaction'&&!EVENT_TYPES.has(s.eventType))
      errors.push(prefix+'invalid user event type');
    if(s.eventType!==undefined&&s.advance!=='observed-user-interaction')
      errors.push(prefix+'eventType is only valid for user interactions');
    if(s.advance==='read-only-state-reached'&&!id(s.signal))
      errors.push(prefix+'invalid read-only signal');
    if(s.signal!==undefined&&s.advance!=='read-only-state-reached')
      errors.push(prefix+'signal is only valid for state completion');
    if(s.optional!==undefined&&typeof s.optional!=='boolean')
      errors.push(prefix+'optional must be boolean');
  }
  return errors;
}
export function createTutorialRegistry(items,opts={}) {
  if(!Array.isArray(items))throw new Error('Invalid tutorial registry');
  const errors=[],ids=new Set();
  for(const item of items){
    const issues=validateTutorial(item,opts);
    if(item?.id&&ids.has(item.id))issues.push('duplicate tutorial ID '+item.id);
    if(item?.id)ids.add(item.id);
    errors.push(...issues.map(e=>(item?.id||'unknown')+': '+e));
  }
  if(errors.length)throw new Error('Invalid tutorial registry: '+errors.join('; '));
  return Object.freeze(items.map(t=>Object.freeze({...t,
    steps:Object.freeze(t.steps.map(s=>Object.freeze({...s})))})));
}
const cleanRecord=(v)=>v&&id(v.step)&&STATUS.has(v.status)?
  {step:v.step,status:v.status}:null;
export function createTutorialProgress({storage,key=TUTORIAL_PROGRESS_KEY}={}) {
  if(typeof key!=='string'||!/^[a-z0-9._:-]{8,160}$/.test(key))
    throw new Error('Invalid tutorial storage namespace');
  let records=Object.create(null),available=true,enabled=false;
  try {
    const value=storage?.getItem(key);
    if(value){
      const parsed=JSON.parse(value);
      if(parsed?.schema===1&&parsed.records&&typeof parsed.records==='object'&&
          !Array.isArray(parsed.records)&&parsed.enabled===true){
        enabled=true;
        for(const [key,v] of Object.entries(parsed.records).slice(0,100))
          if(id(key)&&cleanRecord(v))records[key]=cleanRecord(v);
      }
    }
  } catch(_) {available=false;}
  const save=()=>{
    if(!storage||!available||!enabled)return;
    try{storage.setItem(key,JSON.stringify({
      schema:1,enabled:true,records
    }));}catch(_){available=false;}
  };
  return Object.freeze({
    optIn(){enabled=true;save();},
    get(key){return id(key)&&own(records,key)?{...records[key]}:null;},
    record(key,step,status){
      if(!enabled||!id(key)||!id(step)||!STATUS.has(status))return false;
      records[key]={step,status};save();return true;
    },
    reset(key){if(!id(key))return false;delete records[key];save();return true;},
    snapshot(){return {enabled,storageAvailable:available,
      records:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,{...v}]))};}
  });
}
export function tutorialEligibility(tutorial,context={}) {
  const capabilities=context.capabilities||[];
  if(tutorial.page&&context.page!==tutorial.page)return 'page-unavailable';
  if(tutorial.stage&&context.stage!==tutorial.stage)return 'stage-unavailable';
  if(tutorial.capability&&!capabilities.includes(tutorial.capability))return 'capability-unavailable';
  if(context.authRequired||context.authChecking||context.sessionExpired)return 'authentication-required';
  return null;
}
export function createTutorialEngine({tutorials=[],progress=null,getContext=()=>({}),
  onChange=()=>{},registryOptions={}}={}) {
  const registry=createTutorialRegistry(tutorials,registryOptions),byId=new Map(registry.map(t=>[t.id,t]));
  let active=null,index=0,status='idle',reason=null,destroyed=false;
  const snapshot=()=>Object.freeze({id:active?.id||null,status,
    index,total:active?.steps.length||0,step:active?.steps[index]||null,reason});
  function emit(){const state=snapshot();try{onChange(state);}catch(_){}return state;}
  function persist(){if(active&&status!=='idle')
    progress?.record(active.id,active.steps[index].id,status);}
  function stepIssue(step,c) {
    if(c.authRequired||c.authChecking||c.authBusy||c.sessionExpired)return 'authentication-required';
    if(c.modal||c.busy||c.uploading||c.fullscreenTransition||c.interactionActive||
       c.windowHidden)return 'host-busy';
    if(step.page&&c.page!==step.page)return 'page-unavailable';
    if(step.stage&&c.stage!==step.stage)return 'stage-unavailable';
    if(step.capability&&!(c.capabilities||[]).includes(step.capability))
      return 'capability-unavailable';
    if(step.availability&&step.availability!=='always'&&
      c.availability?.[step.availability]!==true&&c[step.availability]!==true)
      return 'step-unavailable';
    if(!(c.visibleTargets||[]).some(target=>
      targetKey(target)===targetKey(step.target)))return 'target-unavailable';
    return null;
  }
  function advance(){
    if(index===active.steps.length-1){status='completed';reason=null;}
    else {index++;status='running';reason=null;}
    persist();return refresh();
  }
  function refresh(context) {
    if(destroyed||!active||['idle','skipped','completed','paused'].includes(status))
      return emit();
    const c=context||getContext(),step=active.steps[index];
    const problem=stepIssue(step,c);
    const reached=step.advance==='read-only-state-reached'&&
      (c.signals||[]).includes(step.signal);
    // A successful user action may disable/remove its control before Vue
    // refreshes the tour. The observed state may complete that step, but must
    // not bypass authentication, stage, modal or other safety guards.
    if(reached&&(!problem||problem==='target-unavailable'))return advance();
    status=problem?'blocked':'running';reason=problem;
    persist();return emit();
  }
  function start(tutorialId,{resume=false}={}) {
    if(destroyed||!byId.has(tutorialId))return snapshot();
    active=byId.get(tutorialId);index=0;reason=null;status='running';
    if(resume){
      const saved=progress?.get(tutorialId),at=active.steps.findIndex(s=>s.id===saved?.step);
      if(at>=0&&saved?.status!=='completed'&&saved?.status!=='skipped')index=at;
    }
    progress?.optIn();
    return refresh();
  }
  function pause() {
    if(active&&['running','blocked'].includes(status)){
      status='paused';reason=null;persist();
    }
    return emit();
  }
  function resume() {
    if(status==='paused'){status='running';return refresh();}
    return snapshot();
  }
  function mayAdvance() {
    const problem=stepIssue(active.steps[index],getContext());
    if(problem){status='blocked';reason=problem;persist();emit();return false;}
    return true;
  }
  function next(){
    if(!active||status!=='running'||active.steps[index].advance!=='explicit-next')
      return snapshot();
    if(!mayAdvance())return snapshot();
    return advance();
  }
  function observe({stepId,targetId,event}={}) {
    // A real click may end a gesture before Vue refreshes a blocked step.
    if(status==='blocked')refresh();
    const step=active?.steps[index];
    if(status!=='running'||!step||step.advance!=='observed-user-interaction'||
      step.id!==stepId||targetKey(step.target)!==targetKey(targetId)||
      !event||event.isTrusted!==true||event.type!==step.eventType)return snapshot();
    if(!mayAdvance())return snapshot();
    return advance();
  }
  function back(){
    if(active&&index>0&&!['completed','skipped','idle'].includes(status)){
      index--;status='running';reason=null;return refresh();
    }
    return snapshot();
  }
  function skipStep(){
    if(active&&active.steps[index].optional===true&&
       ['running','blocked','paused'].includes(status))return advance();
    return snapshot();
  }
  function skip(){
    if(active&&['running','blocked','paused'].includes(status)){
      status='skipped';reason=null;persist();
    }
    return emit();
  }
  function restart(){return active?start(active.id):snapshot();}
  function stop(){active=null;status='idle';reason=null;index=0;return emit();}
  function destroy(){destroyed=true;active=null;status='idle';reason=null;index=0;}
  return Object.freeze({snapshot,start,refresh,next,observe,back,pause,resume,
    skipStep,skip,restart,stop,destroy});
}