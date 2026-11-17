// Optional Vue 3 adapter. The vanilla package never imports Vue.
import {shallowRef,onMounted,onBeforeUnmount} from 'vue';
import {createGuidedHelp} from './index.js';

export function useGuidedHelp(options={}) {
  const state=shallowRef({id:null,status:'idle',index:0,total:0,step:null,reason:null});
  const original=options.onChange;
  const kit=createGuidedHelp({...options,onChange:s=>{
    state.value=s;
    original?.(s);
  }});
  onMounted(()=>kit.mount());
  onBeforeUnmount(()=>kit.destroy());
  return Object.freeze({...kit,state});
}
