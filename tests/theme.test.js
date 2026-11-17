import test from 'node:test';
import assert from 'node:assert/strict';
import {THEME_TOKENS,normalizeTheme,applyTheme} from '../src/theme.js';

function fakeElement() {
  const declarations=new Map();
  const style={
    setProperty(name,value,priority=''){declarations.set(name,[value,priority]);},
    getPropertyValue:name=>declarations.get(name)?.[0]||'',
    getPropertyPriority:name=>declarations.get(name)?.[1]||'',
    removeProperty:name=>declarations.delete(name)
  };
  return {style,declarations};
}

test('semantic tokens support a palette and host CSS custom property names',()=>{
  const theme=normalizeTheme({
    palette:{surface:'#fffafa',text:'#101820',focus:'rgb(17 102 221)'},
    variables:{accent:'--brand-primary',highlight:'--design-focus-ring'}
  });
  assert.equal(theme.accent,'var(--brand-primary)');
  assert.equal(theme.surface,'#fffafa');
  assert.equal(theme.highlight,'var(--design-focus-ring)');
  assert.equal(THEME_TOKENS.highlight,'--gh-highlight');
  assert.equal(Object.isFrozen(theme),true);
});

test('theme rejects unknown properties, injected CSS and ambiguous overrides',()=>{
  for(const value of [
    {palette:{accent:'url(javascript:alert(1))'}},
    {palette:{accent:'#f00; color: red'}},
    {palette:{outline:'red'}},
    {variables:{accent:'red'}},
    {variables:{accent:'--theme);background:red'}},
    {palette:{accent:'#123'},variables:{accent:'--brand'}},
    {anything:'ignored'}
  ]) assert.throws(()=>normalizeTheme(value),TypeError);
});

test('applies only scoped --gh-* properties and restores previous inline styles',()=>{
  const element=fakeElement();
  element.style.setProperty('--gh-accent','#000','important');
  element.style.setProperty('background','hotpink');
  const restore=applyTheme(element,{
    palette:{accent:'#fff',text:'#112233'},
    variables:{highlight:'--app-brand'}
  });
  assert.equal(element.style.getPropertyValue('--gh-accent'),'#fff');
  assert.equal(element.style.getPropertyValue('--gh-highlight'),'var(--app-brand)');
  assert.equal(element.style.getPropertyValue('background'),'hotpink');
  restore();
  restore();
  assert.equal(element.style.getPropertyValue('--gh-accent'),'#000');
  assert.equal(element.style.getPropertyPriority('--gh-accent'),'important');
  assert.equal(element.style.getPropertyValue('--gh-text'),'');
  assert.equal(element.style.getPropertyValue('--gh-highlight'),'');
  assert.equal(element.style.getPropertyValue('background'),'hotpink');
});

test('null DOM target is safe after validating theme',()=>{
  assert.doesNotThrow(()=>applyTheme(null,{variables:{surface:'--app-surface'}})());
  assert.throws(()=>applyTheme(null,{palette:{focus:'var(--evil)'}}),TypeError);
});
