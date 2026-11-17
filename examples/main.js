import {createGuidedHelp} from '../src/index.js';

const output=document.getElementById('result');
try {
  // Same-origin JSON only; start a local static server from the repository root.
  const response=await fetch('./tour.json');
  if(!response.ok)throw new Error('Tutorial JSON was unavailable');
  const tutorial=await response.json();
  const help=createGuidedHelp({
    tutorials:[tutorial],
    namespace:'guidedhelpjs.demo',
    getContext:()=>({page:'demo'}),
    onChange:s=>{output.textContent='Tutorial status: '+s.status;}
  });
  document.getElementById('startTour').addEventListener('click',()=>help.start(tutorial.id));
  document.getElementById('realButton').addEventListener('click',()=>{
    output.textContent='Real button clicked';
  });
} catch(error) {
  output.textContent='Load the demo through a local HTTP server: '+error.message;
}
