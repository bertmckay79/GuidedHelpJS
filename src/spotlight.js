import {targetKey} from './tutorials.js';
// Zero-dependency, offline spotlight geometry. Targets are validated HTML IDs or semantic data-feature attributes,
// never arbitrary selectors or remote expressions.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function resolveSpotlightTarget(doc,target) {
  const key=targetKey(target);
  if(!doc||!key)return null;
  let found=[];
  if(key.startsWith('id:')) {
    const element=doc.getElementById?.(key.slice(3));
    if(element)found=[element];
  } else if(doc.querySelectorAll) {
    const name=key.slice(8);
    found=Array.from(doc.querySelectorAll('[data-feature]')).filter(el=>
      el.getAttribute?.('data-feature')===name);
  }
  for(const el of found) {
    if(!el.isConnected||el.hidden||el.disabled||
       el.getAttribute?.('aria-disabled')==='true'||
       el.getAttribute?.('aria-hidden')==='true'||!el.getClientRects?.().length||
       el.closest?.('[hidden],[inert],[aria-hidden="true"],details:not([open])'))continue;
    const rect=el.getBoundingClientRect?.();
    if(!rect||rect.width<=0||rect.height<=0)continue;
    const style=doc.defaultView?.getComputedStyle?.(el);
    if(style&&(style.display==='none'||style.visibility==='hidden'||
      style.visibility==='collapse'))continue;
    return el;
  }
  return null;
}
export function placeSpotlight(rect,{width,height},panelHeight=240) {
  if(!rect||![rect.left,rect.top,rect.right,rect.bottom,rect.width,rect.height,width,height]
    .every(Number.isFinite)||width<80||height<80) return null;
  const margin=8,gap=12,cardWidth=Math.min(350,Math.max(0,width-margin*2));
  const cardHeight=Math.min(panelHeight,Math.max(0,height-margin*2));
  const inView=rect.right>0&&rect.left<width&&rect.bottom>0&&rect.top<height;
  if(!inView) return {left:Math.round((width-cardWidth)/2),top:Math.max(margin,
    Math.round((height-cardHeight)/2)),width:cardWidth,anchored:false};
  const below=height-rect.bottom,above=rect.top;
  const preferBelow=below>=cardHeight+gap||below>=above;
  const top=preferBelow?rect.bottom+gap:rect.top-cardHeight-gap;
  return {
    left:Math.round(clamp(rect.left,margin,width-cardWidth-margin)),
    top:Math.round(clamp(top,margin,Math.max(margin,height-cardHeight-margin))),
    width:Math.round(cardWidth),anchored:true
  };
}
export function createSpotlightLayer({document:doc,window:win,onPosition=()=>{},
  onUnavailable=()=>{}}={}) {
  let id=null,element=null,disposed=false,raf=0,resizeObserver=null;
  const setElement=next=>{
    if(element===next)return;
    if(element)element.classList?.remove('discovery-spotlight-target');
    resizeObserver?.disconnect();resizeObserver=null;
    element=next;
    if(element){
      element.classList?.add('discovery-spotlight-target');
      if(win?.ResizeObserver){
        resizeObserver=new win.ResizeObserver(()=>schedule());
        resizeObserver.observe(element);
      }
    }
  };
  function recalc() {
    raf=0;if(disposed||!id)return;
    const next=resolveSpotlightTarget(doc,id);
    if(!next){setElement(null);onUnavailable('target-not-visible');return;}
    setElement(next);
    const placement=placeSpotlight(next.getBoundingClientRect(),{
      width:win?.innerWidth||0,height:win?.innerHeight||0
    });
    if(!placement){onUnavailable('invalid-geometry');return;}
    onPosition(placement);
  }
  function schedule() {
    if(disposed||!id||raf)return;
    if(win?.requestAnimationFrame)raf=win.requestAnimationFrame(recalc);
    else recalc();
  }
  const listen=()=>{
    win?.addEventListener?.('scroll',schedule,true);
    win?.addEventListener?.('resize',schedule);
    win?.addEventListener?.('orientationchange',schedule);
    doc?.addEventListener?.('fullscreenchange',schedule);
    win?.visualViewport?.addEventListener?.('resize',schedule);
    win?.visualViewport?.addEventListener?.('scroll',schedule);
  };
  const unlisten=()=>{
    win?.removeEventListener?.('scroll',schedule,true);
    win?.removeEventListener?.('resize',schedule);
    win?.removeEventListener?.('orientationchange',schedule);
    doc?.removeEventListener?.('fullscreenchange',schedule);
    win?.visualViewport?.removeEventListener?.('resize',schedule);
    win?.visualViewport?.removeEventListener?.('scroll',schedule);
  };
  listen();
  return Object.freeze({
    start(targetId) {
      if(disposed||!targetKey(targetId))return false;
      id=targetId;
      recalc();
      return !!element;
    },
    reposition:schedule,
    destroy() {
      if(disposed)return;
      disposed=true;unlisten();
      if(raf&&win?.cancelAnimationFrame)win.cancelAnimationFrame(raf);
      setElement(null);id=null;
    }
  });
}
