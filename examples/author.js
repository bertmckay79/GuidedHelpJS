import {createTutorialRecorder} from '../src/authoring/index.js';

const output=document.getElementById('hostResult');
let hostActions=0;
for(const id of ['createProjectButton','openFiles']) {
  document.getElementById(id).addEventListener('click',()=>{
    hostActions++;output.textContent='Host actions: '+hostActions;
  });
}
document.querySelector('[data-feature="demo.settings"]').addEventListener('click',()=>{
  hostActions++;output.textContent='Host actions: '+hostActions;
});
let author=null;
document.getElementById('openAuthor').addEventListener('click',()=>{
  if(author)author.destroy();
  author=createTutorialRecorder({getContext:()=>({page:'demo'})});
  author.mount();
  author.editTutorial({
    id:'demo.recorded-tour',
    title:'My recorded tutorial',
    summary:'A tour authored against the real demo controls.',
    category:'Getting started',
    page:'demo'
  });
});
