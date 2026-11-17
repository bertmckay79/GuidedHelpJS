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

document.getElementById('applyPalette').addEventListener('click',()=>{
  author?.setTheme({
    palette:{
      accent:'#7c3aed',
      accentText:'#ffffff',
      surface:'#f5f0ff',
      text:'#311459',
      border:'#baa1e9',
      focus:'#7c3aed',
      highlight:'#7c3aed',
      buttonBackground:'#e5d8ff',
      buttonText:'#311459'
    }
  });
});
document.getElementById('applyVariables').addEventListener('click',()=>{
  author?.setTheme({
    variables:{
      accent:'--demo-brand-primary',
      highlight:'--demo-brand-primary',
      surface:'--demo-brand-surface',
      text:'--demo-brand-text',
      border:'--demo-brand-border'
    }
  });
});
document.getElementById('resetTheme').addEventListener('click',()=>author?.setTheme({}));
