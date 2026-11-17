import {createGuidedHelp} from '../src/index.js';

const key='guidedhelpjs.demo:catalogue:v1';
const output=document.getElementById('sessionStatus');
const build=(id,title)=>({
  id,title,summary:'Read this tutorial from this tab\'s sessionStorage.',
  category:'Session tutorials',page:'demo',steps:[{
    id:'welcome',title:'A stored step',body:'This definition was loaded from session storage.',
    target:{id:'sessionTarget'},advance:'explicit-next'
  }]
});

const help=createGuidedHelp({
  namespace:'guidedhelpjs.session-example',
  sessionTutorials:{key},
  getContext:()=>({page:'demo'})
});
function show(){
  output.textContent='Loaded tutorials: '+help.tutorials.map(t=>t.id).join(', ');
  if(!help.tutorials.length)output.textContent='Loaded tutorials: 0';
}
function reload() {
  try {help.reloadSessionTutorials();show();}
  catch(error){output.textContent='Cannot load tutorial definitions: '+error.message;}
}

document.getElementById('storeTutorial').addEventListener('click',()=>{
  sessionStorage.setItem(key,JSON.stringify([build('demo.session-one','First session tutorial')]));
  reload();
});
document.getElementById('replaceTutorial').addEventListener('click',()=>{
  sessionStorage.setItem(key,JSON.stringify([build('demo.session-two','Updated session tutorial')]));
  reload();
});
document.getElementById('clearTutorial').addEventListener('click',()=>{
  sessionStorage.removeItem(key);reload();
});
document.getElementById('startTutorial').addEventListener('click',()=>{
  const tutorial=help.tutorials[0];
  if(tutorial)help.start(tutorial.id);
  else output.textContent='Store a session tutorial first.';
});
show();
