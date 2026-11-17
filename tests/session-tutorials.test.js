import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGuidedHelp,readTutorialsFromSessionStorage,
  SESSION_TUTORIAL_MAX_BYTES,SESSION_TUTORIAL_MAX_ITEMS
} from '../src/index.js';

const key='test.app:catalogue:v1';
const tutorial=(id,target='btn')=>({
  id,title:'Sample tutorial',summary:'Safely show a real control.',
  category:'Basic',steps:[
    {id:'start',title:'Start',body:'Press Next to advance.',
      target:{id:target},advance:'explicit-next'}
  ]
});
function fakeStorage() {
  const values=new Map();
  const counters={gets:0,sets:0};
  return {values,counters,
    getItem(k){counters.gets++;return values.get(k)??null;},
    setItem(k,v){counters.sets++;values.set(k,v);}
  };
}

test('reads single and array JSON entries without writing back',()=>{
  const storage=fakeStorage();
  assert.deepEqual(readTutorialsFromSessionStorage({key,storage}),[]);
  storage.values.set(key,JSON.stringify(tutorial('session.one')));
  assert.equal(readTutorialsFromSessionStorage({key,storage})[0].id,'session.one');
  storage.values.set(key,JSON.stringify([tutorial('session.one'),tutorial('session.two')]));
  assert.deepEqual(readTutorialsFromSessionStorage({key,storage}).map(x=>x.id),
    ['session.one','session.two']);
  assert.equal(storage.counters.sets,0);
});

test('rejects malformed, over-size, invalid or duplicate session definitions',()=>{
  const storage=fakeStorage();
  assert.throws(()=>readTutorialsFromSessionStorage({key:'bad',storage}),/key/);
  assert.throws(()=>readTutorialsFromSessionStorage({key,storage:null}),/unavailable/);
  const invalid=[
    '{broken-json',
    JSON.stringify({foo:'bar'}),
    JSON.stringify([{...tutorial('one'),steps:[{
      id:'start',title:'Invalid',body:'Unsafe',
      target:{selector:'.delete'},advance:'explicit-next'
    }]}]),
    JSON.stringify([tutorial('duplicate'),tutorial('duplicate')]),
    JSON.stringify(Array.from({length:SESSION_TUTORIAL_MAX_ITEMS+1},
      (_,i)=>tutorial('too-many.'+i))),
    ' '.repeat(SESSION_TUTORIAL_MAX_BYTES+1)
  ];
  for(const entry of invalid){
    storage.values.set(key,entry);
    assert.throws(()=>readTutorialsFromSessionStorage({key,storage}));
  }
  storage.values.set(key,JSON.stringify([tutorial('nonascii')]));
  assert.throws(()=>readTutorialsFromSessionStorage({key,storage,maxBytes:10}),/size limit/);
  assert.throws(()=>readTutorialsFromSessionStorage({key,storage,maxBytes:0}),/limit/);
  const denied={getItem(){throw new Error('blocked');}};
  assert.throws(()=>readTutorialsFromSessionStorage({key,storage:denied}),/cannot be read/);
});

test('initialization combines static tutorials with session definitions and keeps progress separate',()=>{
  const session=fakeStorage(),progress=fakeStorage();
  session.values.set(key,JSON.stringify([tutorial('session.one')]));
  const help=createGuidedHelp({
    tutorials:[tutorial('built.in')],
    sessionTutorials:{key,storage:session},
    storage:progress,render:false,
    namespace:'test.guided'
  });
  assert.deepEqual(help.tutorials.map(t=>t.id),['built.in','session.one']);
  assert.equal(session.counters.sets,0);
  assert.equal(help.start('session.one').status,'blocked'); // no DOM target in Node
  assert.equal(progress.counters.sets>0,true); // progress uses its own storage
  help.destroy();
});

test('reload atomically replaces session catalogue and resets an active tour',()=>{
  const session=fakeStorage();
  session.values.set(key,JSON.stringify([tutorial('session.one')]));
  const help=createGuidedHelp({
    tutorials:[tutorial('built.in')],
    sessionTutorials:{key,storage:session},storage:null,render:false
  });
  help.start('session.one');
  assert.equal(help.snapshot().id,'session.one');
  const previous=help.tutorials;
  session.values.set(key,'{invalid');
  assert.throws(()=>help.reloadSessionTutorials(),/Invalid session tutorial JSON/);
  assert.equal(help.tutorials,previous);
  assert.equal(help.snapshot().id,'session.one');
  session.values.set(key,JSON.stringify([tutorial('session.two')]));
  assert.deepEqual(help.reloadSessionTutorials().map(t=>t.id),['built.in','session.two']);
  assert.equal(help.snapshot().status,'idle');
  assert.equal(help.start('session.one').status,'idle');
  assert.equal(help.start('session.two').id,'session.two');
  help.destroy();
  assert.throws(()=>help.reloadSessionTutorials(),/destroyed/);
});

test('duplicate IDs across static and session sources reject safely',()=>{
  const session=fakeStorage();
  session.values.set(key,JSON.stringify([tutorial('built.in')]));
  assert.throws(()=>createGuidedHelp({
    tutorials:[tutorial('built.in')],
    sessionTutorials:{key,storage:session}
  }),/duplicate tutorial ID/);
});

test('session storage is opt-in; inaccessible browser storage is reported',()=>{
  const ordinary=createGuidedHelp({tutorials:[tutorial('builtin')],render:false,storage:null});
  assert.equal(ordinary.tutorials.length,1);
  assert.equal(ordinary.reloadSessionTutorials().length,1);
  ordinary.destroy();
  assert.throws(()=>createGuidedHelp({sessionTutorials:{key},storage:null,
    window:{get sessionStorage(){throw new Error('permission denied');}}
  }),/unavailable/);
});
