import {createSpotlightLayer,resolveSpotlightTarget} from './spotlight.js';
import {normalizeTheme} from './theme.js';
import {targetKey} from './tutorials.js';

// Presentation-only bridge for live DOM anchors. Only observes native user events;
// it never dispatches a click, changes application state or sends API requests.
export function createTutorialPresenter({document:doc,window:win,
  onPosition=()=>{},onAvailability=()=>{},onInteraction=()=>{},theme={}}={}) {
  normalizeTheme(theme);
  let activeTheme=theme;
  let step=null,layer=null,target=null,observer=null,destroyed=false,available=false;
  function notify(value){
    if(available===value)return;
    available=value;onAvailability(value);
  }
  function releaseLayer(){
    layer?.destroy();layer=null;target=null;
  }
  function reconcile(){
    if(destroyed||!step)return;
    const element=resolveSpotlightTarget(doc,step.target);
    if(!element){
      releaseLayer();notify(false);return;
    }
    if(element===target&&layer)return;
    releaseLayer();
    const activeStep=step;
    layer=createSpotlightLayer({document:doc,window:win,theme:activeTheme,
      onPosition:placement=>{if(!destroyed&&step===activeStep)onPosition(placement);},
      onUnavailable:()=>{
        if(step===activeStep){
          releaseLayer();notify(false);
        }
      }
    });
    target=element;
    if(!layer.start(step.target)){releaseLayer();notify(false);return;}
    notify(true);
  }
  function handleObservedEvent(event){
    if(destroyed||!step||!target||!available||event?.isTrusted!==true||
       step.advance!=='observed-user-interaction'||event.type!==step.eventType)return;
    // Only the real clicked/changed control, not a tour control, counts.
    if(!target.isConnected||!target.contains?.(event.target)||
       resolveSpotlightTarget(doc,step.target)!==target)return;
    onInteraction({stepId:step.id,targetId:step.target,event});
  }
  const Observer=win?.MutationObserver;
  if(Observer&&doc?.documentElement) {
    observer=new Observer(()=>reconcile());
    observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,
      attributeFilter:['id','data-feature','hidden','disabled','style','aria-hidden',
        'aria-disabled','inert','open']});
  }
  doc?.addEventListener?.('click',handleObservedEvent);
  doc?.addEventListener?.('change',handleObservedEvent);
  return Object.freeze({
    setStep(next){
      if(destroyed)return false;
      if(next?.id===step?.id&&targetKey(next?.target)===targetKey(step?.target)){
        reconcile();return available;
      }
      releaseLayer();step=next||null;available=false;
      if(step)reconcile();
      return available;
    },
    reposition(){if(step)reconcile();layer?.reposition();},
    targetAvailable(){return available;},
    setTheme(next){
      normalizeTheme(next);
      activeTheme=next;
      layer?.setTheme(next);
    },
    destroy(){
      if(destroyed)return;
      destroyed=true;releaseLayer();step=null;
      observer?.disconnect();observer=null;
      doc?.removeEventListener?.('click',handleObservedEvent);
      doc?.removeEventListener?.('change',handleObservedEvent);
    }
  });
}