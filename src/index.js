// Framework-agnostic entry point. UI text is always written through textContent.
// Adapted from the Sprite Rig Studio walkthrough presenter and engine.
import {createTutorialRegistry,createTutorialEngine,createTutorialProgress,
  tutorialEligibility} from './tutorials.js';
import {createTutorialPresenter} from './tutorial-presenter.js';
import {resolveSpotlightTarget} from './spotlight.js';
import {searchTutorials,groupTutorials} from './catalogue.js';

const namespaceOk=name=>typeof name==='string'&&/^[a-z][a-z0-9._-]{2,80}$/.test(name);
const active=s=>s.status==='running'||s.status==='blocked';

export {targetKey,validateTutorial,createTutorialRegistry,createTutorialEngine,
  createTutorialProgress,tutorialEligibility} from './tutorials.js';
export {resolveSpotlightTarget,placeSpotlight,createSpotlightLayer} from './spotlight.js';
export {createTutorialPresenter} from './tutorial-presenter.js';
export {searchTutorials,groupTutorials} from './catalogue.js';

export function createGuidedHelp({
  tutorials=[],namespace='guided.help',storage,
  document:providedDocument,window:providedWindow,
  getContext=()=>({}),onChange=()=>{},render=true
}={}) {
  if(!namespaceOk(namespace))throw new Error('Invalid guided help namespace');
  if(typeof getContext!=='function'||typeof onChange!=='function')
    throw new TypeError('getContext and onChange must be functions');
  const registry=createTutorialRegistry(tutorials);
  const doc=providedDocument??(typeof document==='undefined'?null:document);
  const win=providedWindow??doc?.defaultView??(typeof window==='undefined'?null:window);
  let backingStorage=storage;
  if(backingStorage===undefined) {
    try {backingStorage=win?.localStorage??null;} catch(_) {backingStorage=null;}
  }
  const progress=createTutorialProgress({
    storage:backingStorage,key:namespace+':tutorials:v1'
  });
  let panel=null,presenter=null,disposed=false,placement=null,engine;
  function context() {
    let host;
    try {
      host=getContext();
      if(!host||typeof host!=='object'||Array.isArray(host))return {busy:true};
    } catch(_) {return {busy:true};}
    const step=engine?.snapshot().step;
    const visible=Array.isArray(host.visibleTargets)?host.visibleTargets:[];
    const ownTarget=step&&resolveSpotlightTarget(doc,step.target)?[step.target]:[];
    return {...host,visibleTargets:[...visible,...ownTarget]};
  }
  function button(text,action) {
    const el=doc.createElement('button');
    el.type='button';el.textContent=text;el.addEventListener('click',action);
    return el;
  }
  function label(text,cls) {
    const el=doc.createElement('p');el.className=cls;el.textContent=text;
    return el;
  }
  function paint(state) {
    if(!panel)return;
    panel.replaceChildren();
    if(!state.id||state.status==='idle'||state.status==='skipped'||state.status==='paused'){
      panel.hidden=true;return;
    }
    panel.hidden=false;
    const tutorial=registry.find(t=>t.id===state.id);
    panel.append(label(tutorial?.title||'Guided help','gh-eyebrow'));
    if(state.status==='completed') {
      panel.append(label('Tutorial complete','gh-title'));
      const actions=doc.createElement('div');actions.className='gh-actions';
      actions.append(button('Restart',()=>engine.restart()),button('Close',()=>engine.stop()));
      panel.append(actions);return;
    }
    const step=state.step;
    panel.append(label('Step '+(state.index+1)+' of '+state.total,'gh-counter'));
    panel.append(label(step.title,'gh-title'),label(step.body,'gh-body'));
    if(state.status==='blocked')panel.append(label(
      'Waiting: '+String(state.reason||'step unavailable').replaceAll('-',' '),'gh-unavailable'));
    const actions=doc.createElement('div');actions.className='gh-actions';
    if(state.index>0)actions.append(button('Back',()=>engine.back()));
    if(step.advance==='explicit-next'&&state.status==='running')
      actions.append(button('Next',()=>engine.next()));
    if(step.optional)actions.append(button('Skip step',()=>engine.skipStep()));
    actions.append(button('Pause',()=>engine.pause()),button('End',()=>engine.skip()));
    panel.append(actions);
    if(placement&&state.status==='running'){
      panel.style.left=placement.left+'px';panel.style.top=placement.top+'px';
      panel.style.width=placement.width+'px';
    }else {
      panel.style.left='12px';panel.style.top='12px';panel.style.width='min(350px, calc(100vw - 24px))';
    }
  }
  function changed(state) {
    if(disposed)return;
    if(presenter)presenter.setStep(active(state)?state.step:null);
    paint(state);
    onChange(state);
  }
  engine=createTutorialEngine({tutorials:registry,progress,getContext:context,onChange:changed});
  function mount() {
    if(disposed||!doc?.body)return false;
    if(presenter)return true;
    if(render) {
      panel=doc.createElement('section');
      panel.className='guided-help-panel';panel.hidden=true;
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-modal','false');
      panel.setAttribute('aria-label','Guided tutorial');
      panel.setAttribute('aria-live','polite');
      panel.setAttribute('tabindex','-1');
      doc.body.append(panel);
    }
    presenter=createTutorialPresenter({
      document:doc,window:win,
      onPosition:position=>{placement=position;paint(engine.snapshot());},
      onAvailability:()=>engine.refresh(),
      onInteraction:payload=>engine.observe(payload)
    });
    changed(engine.snapshot());
    return true;
  }
  function start(id,options={}) {
    if(disposed)return engine.snapshot();
    mount();
    return engine.start(id,options);
  }
  const refresh=()=>engine.refresh();
  const api={
    tutorials:registry,progress,mount,start,refresh,
    snapshot:()=>engine.snapshot(),
    catalogue:(query='')=>groupTutorials(searchTutorials(registry,{
      query,context:context(),progress
    })),
    next:()=>engine.next(),back:()=>engine.back(),
    pause:()=>engine.pause(),resume:()=>engine.resume(),
    skipStep:()=>engine.skipStep(),skip:()=>engine.skip(),
    restart:()=>engine.restart(),stop:()=>engine.stop(),
    destroy() {
      if(disposed)return;
      disposed=true;presenter?.destroy();presenter=null;engine.destroy();
      panel?.remove();panel=null;
    }
  };
  return Object.freeze(api);
}
