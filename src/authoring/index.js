import {createGuidedHelp} from '../index.js';
import {
  createDraft,editDraft,appendStep,editStep,removeStep,moveStep,
  importTutorialJSON,exportTutorialJSON,validateDraft
} from './draft.js';
import {createTargetPicker} from './picker.js';
import {applyTheme,normalizeTheme,THEME_TOKENS} from '../theme.js';

// Optional developer-only UI. Never imported from the production entry point.
const modes=new Set(['edit','record','preview','appearance']);
const copy=value=>JSON.parse(JSON.stringify(value));

export function createTutorialRecorder({
  document:doc=globalThis.document,
  window:win=doc?.defaultView,
  getContext=()=>({}),
  initialTutorial=null,
  theme={},
  onChange=()=>{}
}={}) {
  if(!doc?.body||!doc.createElement)throw new TypeError('A browser document is required');
  if(typeof getContext!=='function'||typeof onChange!=='function')
    throw new TypeError('Invalid recorder callbacks');
  normalizeTheme(theme);
  let activeTheme=theme,clearRecorderTheme=()=>{};
  let draft=initialTutorial?
    importTutorialJSON(JSON.stringify(initialTutorial)):createDraft();
  let root=null,picker=null,previewKit=null;
  let mode='edit',selected=0,message='',importOpen=false,disposed=false,previewStatus='';

  const el=(tag,cls='',text)=>{
    const node=doc.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function action(text,handler,cls='') {
    const node=el('button',cls,text);node.type='button';
    node.addEventListener('click',handler);
    return node;
  }
  function notify(){
    onChange({mode,draft:copy(draft),errors:validateDraft(draft)});
  }
  function flash(text) {
    message=text;
    if(root) {
      const status=root.querySelector?.('.ghr-status');
      if(status)status.textContent=text;
    }
  }
  function apply(next){
    draft=next;
    if(selected>=draft.steps.length)selected=Math.max(0,draft.steps.length-1);
    render();notify();
  }
  function changeMeta(key,value) {
    try {apply(editDraft(draft,{[key]:value}));}
    catch(error){flash(error.message);}
  }
  function changeStep(key,value) {
    try {apply(editStep(draft,selected,{[key]:value}));}
    catch(error){flash(error.message);}
  }
  function row(labelText,input){
    const wrapper=el('label','ghr-field');
    wrapper.append(el('span','',labelText),input);
    return wrapper;
  }
  function textField(value,update,{multiline=false,maxLength=100,placeholder=''}={}) {
    const node=el(multiline?'textarea':'input');
    if(!multiline)node.type='text';
    node.maxLength=maxLength;node.value=value??'';node.placeholder=placeholder;
    node.addEventListener('change',()=>update(node.value));
    return node;
  }
  function selectField(value,items,update) {
    const node=el('select');
    for(const [val,label] of items) {
      const option=el('option','',label);
      option.value=val;node.append(option);
    }
    node.value=value;
    node.addEventListener('change',()=>update(node.value));
    return node;
  }
  function renderMetadata(container) {
    container.append(el('h3','','Tutorial details'));
    const grid=el('div','ghr-grid');
    for(const [key,label,max] of [
      ['id','Tutorial ID',120],['title','Title',100],['category','Category',100],
      ['summary','Summary',260],['page','Page guard (optional)',120],
      ['stage','Stage guard (optional)',120],['capability','Capability (optional)',120]
    ]) {
      grid.append(row(label,textField(draft[key]||'',v=>changeMeta(key,v),
        {multiline:key==='summary',maxLength:max})));
    }
    container.append(grid);
  }
  function reorder(from,to) {
    try {apply(moveStep(draft,from,to));selected=to;render();}
    catch(error){flash(error.message);}
  }
  function renderSteps(container) {
    container.append(el('h3','','Steps ('+draft.steps.length+'/32)'));
    if(!draft.steps.length)container.append(el('p','ghr-help','Use Record to select controls. You can edit the text afterwards.'));
    const list=el('ol','ghr-steps');
    for(const [index,step] of draft.steps.entries()) {
      const item=el('li',index===selected?'ghr-selected':'');
      const caption=action((index+1)+'. '+step.title,()=>{
        selected=index;render();
      });
      caption.setAttribute('aria-pressed',String(index===selected));
      item.append(caption);
      item.append(action('↑',()=>reorder(index,index-1),'ghr-small'));
      item.append(action('↓',()=>reorder(index,index+1),'ghr-small'));
      item.append(action('Remove',()=>{
        apply(removeStep(draft,index));
      },'ghr-small'));
      list.append(item);
    }
    container.append(list);
    const step=draft.steps[selected];
    if(!step)return;
    container.append(el('h3','','Edit step '+(selected+1)));
    const fields=el('div','ghr-grid');
    fields.append(row('Step ID',textField(step.id||'',v=>changeStep('id',v),{maxLength:120})));
    fields.append(row('Title',textField(step.title||'',v=>changeStep('title',v))));
    fields.append(row('Description',textField(step.body||'',v=>changeStep('body',v),{multiline:true,maxLength:600})));
    fields.append(row('Target type',selectField(
      typeof step.target==='string'?'feature':Object.keys(step.target)[0],
      [['id','HTML ID'],['feature','data-feature']],
      type=>changeStep('target',{[type]:typeof step.target==='string'?
        step.target:Object.values(step.target)[0]})
    )));
    fields.append(row('Target value',textField(
      typeof step.target==='string'?step.target:Object.values(step.target)[0],
      value=>changeStep('target',{
        [typeof step.target==='string'?'feature':Object.keys(step.target)[0]]:value
      }),{maxLength:120}
    )));
    fields.append(row('Advance when',selectField(step.advance,[
      ['explicit-next','Next button'],
      ['observed-user-interaction','User clicks/changes real control'],
      ['read-only-state-reached','Host read-only signal']
    ],value=>changeStep('advance',value))));
    if(step.advance==='observed-user-interaction')
      fields.append(row('Native interaction',selectField(step.eventType||'click',
        [['click','Click'],['change','Change']],v=>changeStep('eventType',v))));
    if(step.advance==='read-only-state-reached')
      fields.append(row('Host signal',textField(step.signal||'',v=>changeStep('signal',v),{maxLength:120})));
    for(const [key,label] of [
      ['page','Step page (optional)'],['stage','Step stage (optional)'],
      ['capability','Step capability (optional)'],
      ['availability','Availability flag (optional)']
    ]) fields.append(row(label,textField(step[key]||'',v=>changeStep(key,v),{maxLength:120})));
    const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=!!step.optional;
    checkbox.addEventListener('change',()=>changeStep('optional',checkbox.checked));
    fields.append(row('Optional step / allow skip',checkbox));
    container.append(fields);
  }
  function download() {
    let content;
    try {content=exportTutorialJSON(draft);}
    catch(error){flash(error.message);return;}
    if(!win?.Blob||!win?.URL?.createObjectURL){
      message='JSON validated; download is unavailable in this browser.';
      render();return content;
    }
    const blob=new win.Blob([content],{type:'application/json'});
    const url=win.URL.createObjectURL(blob);
    try {
      const link=doc.createElement('a');
      link.href=url;link.download=draft.id+'.json';
      link.hidden=true;root.append(link);link.click();link.remove();
      flash('Validated JSON downloaded.');
    } finally {
      // Revoking asynchronously allows download navigation to begin.
      win.setTimeout?.(()=>win.URL.revokeObjectURL(url),0);
    }
    return content;
  }
  function load(json) {
    try {
      const parsed=importTutorialJSON(json);
      stopPreview();
      picker?.deactivate();mode='edit';selected=0;importOpen=false;
      message='Tutorial imported and validated.';
      apply(parsed);
      return true;
    } catch(error) {
      flash(error.message);return false;
    }
  }
  function renderImport(container) {
    container.append(action(importOpen?'Hide import':'Import JSON',()=>{
      importOpen=!importOpen;render();
    }));
    if(!importOpen)return;
    const box=el('div','ghr-import');
    const area=textField('',()=>{},{multiline:true,maxLength:131072,placeholder:'Paste an exported tutorial JSON object'});
    area.setAttribute('aria-label','Paste tutorial JSON');
    box.append(area,action('Validate and import',()=>load(area.value)));
    container.append(box);
  }
  function renderAuthor(container) {
    if(mode==='record') {
      container.append(el('p','ghr-help',
        'Selection mode: hover and click controls. The selected control will NOT be activated. No values or input events are recorded. Press Escape to stop recording.'));
      container.append(action('Stop selecting',()=>setMode('edit')));
    } else {
      renderMetadata(container);
      renderSteps(container);
      const errors=validateDraft(draft);
      const status=el('div','ghr-validation');
      status.setAttribute('aria-live','polite');
      status.textContent=errors.length?errors.length+' validation issue(s): '+errors.join('; '):
        'Ready to preview or export.';
      container.append(status);
      const tools=el('div','ghr-toolbar');
      tools.append(action('Download JSON',download));
      renderImport(tools);
      container.append(tools);
    }
  }
  function updateTheme(next) {
    normalizeTheme(next);
    activeTheme=copy(next);
    clearRecorderTheme();clearRecorderTheme=applyTheme(root,activeTheme);
    picker?.setTheme(activeTheme);
    previewKit?.setTheme(activeTheme);
    render();
    notify();
  }
  function updateRole(role,type,value) {
    const next=copy(activeTheme);
    next.palette||={};next.variables||={};
    delete next.palette[role];delete next.variables[role];
    if(type==='palette')next.palette[role]=value||'#0d9488';
    if(type==='variables')next.variables[role]=value||'--app-primary';
    try {updateTheme(next);}
    catch(error){flash(error.message);}
  }
  function renderAppearance(container) {
    container.append(el('h3','','Appearance and colours'));
    container.append(el('p','ghr-help',
      'Choose a colour or an existing application CSS variable for each token. These settings affect the recorder and preview, not the exported tutorial JSON.'));
    const grid=el('div','ghr-grid');
    const labelByRole={
      accent:'Accent',accentText:'Accent text',surface:'Panel surface',
      text:'Panel text',mutedText:'Muted text',border:'Border',
      buttonBackground:'Button background',buttonText:'Button text',
      fieldBackground:'Field background',fieldText:'Field text',
      highlight:'Target highlight',focus:'Keyboard focus',
      selectedBackground:'Selected step',statusBackground:'Status background',
      warningText:'Warning text'
    };
    for(const role of Object.keys(THEME_TOKENS).filter(k=>k!=='shadow')) {
      const type=activeTheme.palette?.[role]?'palette':
        activeTheme.variables?.[role]?'variables':'default';
      const field=el('div','ghr-theme-row');
      field.append(row(labelByRole[role],selectField(type,[
        ['default','Use CSS/default'],['palette','Fixed colour'],['variables','App CSS variable']
      ],value=>updateRole(role,value))));
      if(type!=='default') {
        field.append(row(type==='variables'?'CSS variable name':'CSS colour',
          textField(type==='variables'?activeTheme.variables[role]:activeTheme.palette[role],
            value=>updateRole(role,type,value),{
              placeholder:type==='variables'?'--app-primary':'#0d9488',maxLength:110
            })));
      }
      grid.append(field);
    }
    container.append(grid);
    container.append(el('p','ghr-help',
      'You can also define --gh-* variables in application CSS without passing a theme option.'));
    const config=el('textarea','ghr-theme-json');
    config.readOnly=true;config.value=JSON.stringify(activeTheme,null,2);
    config.setAttribute('aria-label','Theme configuration JSON');
    container.append(row('Copy this theme configuration into your application',config));
  }
  function renderPreview(container) {
    container.append(el('p','ghr-help',
      'Live preview uses the production tutorial presenter. Only real user interactions advance interaction steps.'));
    container.append(el('p','',previewStatus));
    container.append(action('Stop preview',()=>setMode('edit')));
  }
  function render() {
    if(!root||disposed)return;
    root.replaceChildren();
    root.append(el('h2','','GuidedHelpJS · Author'));
    const nav=el('div','ghr-toolbar');
    for(const [name,label] of [
      ['edit','Edit'],['record','Record'],['appearance','Appearance'],['preview','Preview']
    ]){
      const tab=action(label,()=>setMode(name));
      tab.setAttribute('aria-pressed',String(mode===name));
      nav.append(tab);
    }
    root.append(nav);
    const info=el('p','ghr-status',message);
    info.setAttribute('role','status');
    root.append(info);
    const content=el('div','ghr-content');
    if(mode==='preview')renderPreview(content);
    else if(mode==='appearance')renderAppearance(content);
    else renderAuthor(content);
    root.append(content);
    root.append(action('New tutorial',()=>{
      if(draft.steps.length&&win?.confirm&&
         !win.confirm('Discard the current unsaved tutorial draft?'))return;
      stopPreview();picker?.deactivate();mode='edit';selected=0;
      message='New draft created.';apply(createDraft());
    },'ghr-secondary'));
  }
  function stopPreview() {
    if(previewKit){previewKit.destroy();previewKit=null;}
    previewStatus='';
  }
  function setMode(next) {
    if(disposed||!modes.has(next))return false;
    if(next===mode)return true;
    if(next==='preview'){
      const errors=validateDraft(draft);
      if(errors.length){
        flash('Fix validation issues before preview: '+errors.join('; '));return false;
      }
      picker?.deactivate();mode='preview';message='';
      try {
        previewKit=createGuidedHelp({
          document:doc,window:win,
          namespace:'guidedhelpjs.author-preview',storage:null,
          tutorials:[draft],getContext,theme:activeTheme,
          onChange:state=>{
            previewStatus='Step '+(state.index+1)+'/'+state.total+
              ' · '+state.status+(state.reason?' ('+state.reason+')':'');
            if(mode==='preview')render();
          }
        });
        render();
        previewKit.start(draft.id);
        notify();
        return true;
      } catch(error){
        stopPreview();mode='edit';flash(error.message);render();return false;
      }
    }
    stopPreview();picker?.deactivate();mode=next;message='';
    if(next==='record')picker?.activate();
    render();notify();return true;
  }
  function mount() {
    if(disposed)return false;
    if(root)return true;
    root=el('aside','ghr-panel');
    root.setAttribute('aria-label','Guided tutorial authoring');
    root.setAttribute('data-guided-private','');
    doc.body.append(root);
    clearRecorderTheme=applyTheme(root,activeTheme);
    picker=createTargetPicker({
      document:doc,root:doc.body,theme:activeTheme,
      isEditorElement:target=>root?.contains(target),
      onHighlight:(_,reason)=>{if(reason)flash(reason);},
      onSelect:target=>{
        try {
          apply(appendStep(draft,target));
          selected=draft.steps.length-1;
          message='Recorded '+JSON.stringify(target)+' (no application action triggered).';
          render();
        } catch(error){flash(error.message);}
      },
      onCancel:()=>{mode='edit';render();notify();}
    });
    render();notify();return true;
  }
  function destroy() {
    if(disposed)return;
    stopPreview();picker?.destroy();picker=null;
    clearRecorderTheme();root?.remove();root=null;disposed=true;
  }
  return Object.freeze({
    mount,destroy,setMode,
    setTheme:updateTheme,
    getTheme:()=>copy(activeTheme),
    getDraft:()=>copy(draft),
    getMode:()=>mode,
    getErrors:()=>validateDraft(draft),
    getPreviewState:()=>previewKit?.snapshot()||null,
    addTarget:target=>{
      if(disposed)throw new Error('Recorder destroyed');
      apply(appendStep(draft,target));return copy(draft);
    },
    editTutorial:changes=>{apply(editDraft(draft,changes));return copy(draft);},
    updateStep:(index,changes)=>{apply(editStep(draft,index,changes));return copy(draft);},
    moveStep:(from,to)=>{apply(moveStep(draft,from,to));return copy(draft);},
    removeStep:index=>{apply(removeStep(draft,index));return copy(draft);},
    importJSON:load,
    exportJSON:()=>exportTutorialJSON(draft),
    downloadJSON:download
  });
}
