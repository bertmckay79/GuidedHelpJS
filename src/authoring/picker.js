import {suggestedTarget} from './draft.js';

// Capturing selection never runs host actions, even when a selected element is a button.
export function createTargetPicker({
  document:doc,
  onSelect=()=>{},
  onHighlight=()=>{},
  onCancel=()=>{},
  isEditorElement=()=>false,
  root
}={}) {
  if(!doc?.addEventListener||!doc?.removeEventListener)
    throw new TypeError('A DOM document is required');
  let enabled=false,hovered=null;
  const isEditor=event=>isEditorElement(event.target);
  const clear=()=>{
    if(hovered)hovered.classList?.remove('ghr-candidate');
    hovered=null;
  };
  const highlight=element=>{
    if(hovered===element)return;
    clear();
    hovered=element;
    hovered?.classList?.add('ghr-candidate');
    onHighlight(hovered);
  };
  const keydown=event=>{
    if(!enabled)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();
      deactivate();onCancel();return;
    }
    if(isEditor(event))return;
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();event.stopImmediatePropagation();
    }
  };
  const pointer=event=>{
    if(!enabled||isEditor(event))return;
    const target=suggestedTarget(event.target,{root});
    // Do not show unknown/unstable targets as recordable.
    let element=event.target;
    if(target){
      while(element&&element!==root){
        if((target.id&&element.id===target.id)||
           (target.feature&&element.getAttribute?.('data-feature')===target.feature))break;
        element=element.parentElement;
      }
    } else element=null;
    highlight(element===root?null:element);
  };
  const swallow=event=>{
    if(!enabled||isEditor(event))return;
    if(event.cancelable)event.preventDefault();
    event.stopImmediatePropagation();
  };
  const select=event=>{
    if(!enabled||isEditor(event))return;
    swallow(event);
    const target=suggestedTarget(event.target,{root});
    if(target)onSelect(target);
    else onHighlight(null,'No stable HTML ID or data-feature on this control');
  };
  const listeners=[
    ['pointerover',pointer,true],
    ['focusin',pointer,true],
    ['pointerdown',swallow,true],
    ['pointerup',swallow,true],
    ['mousedown',swallow,true],
    ['mouseup',swallow,true],
    ['touchstart',swallow,{capture:true,passive:false}],
    ['touchend',swallow,{capture:true,passive:false}],
    ['click',select,true],
    ['keydown',keydown,true]
  ];
  function activate() {
    if(enabled)return;
    enabled=true;
    for(const [type,handler,opts] of listeners)doc.addEventListener(type,handler,opts);
  }
  function deactivate() {
    if(!enabled)return;
    enabled=false;
    for(const [type,handler,opts] of listeners)doc.removeEventListener(type,handler,opts);
    clear();
  }
  return Object.freeze({activate,deactivate,destroy:deactivate,isActive:()=>enabled});
}
