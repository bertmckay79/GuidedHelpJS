// Shared, framework-free semantic colours for runtime and optional recorder.
// No CSS selectors, arbitrary CSS declarations, scripts or URLs in theme input.
export const THEME_TOKENS=Object.freeze({
  accent:'--gh-accent',
  accentText:'--gh-accent-text',
  surface:'--gh-surface',
  text:'--gh-text',
  mutedText:'--gh-muted-text',
  border:'--gh-border',
  buttonBackground:'--gh-button-bg',
  buttonText:'--gh-button-text',
  fieldBackground:'--gh-field-bg',
  fieldText:'--gh-field-text',
  highlight:'--gh-highlight',
  focus:'--gh-focus',
  selectedBackground:'--gh-selected-bg',
  statusBackground:'--gh-status-bg',
  warningText:'--gh-warning-text',
  shadow:'--gh-shadow'
});

const cssVariable=/^--[A-Za-z_][A-Za-z0-9_-]{0,79}$/;
const hexColour=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const namedColour=/^(?:transparent|currentcolor|[a-zA-Z]{3,24})$/;
const colourFunction=/^(?:rgb|rgba|hsl|hsla|oklch|oklab)\([\d.%+,\-\s/]+\)$/i;
const shadowPattern=/^(?:none|(?:[0-9.]+px\s+){2,4}(?:rgba?\([\d.%,\s]+\)|#[0-9a-fA-F]{3,8}))$/;
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
function validColour(value,role) {
  if(typeof value!=='string'||value.length>110||value!==value.trim())return false;
  if(role==='shadow')return shadowPattern.test(value)||value==='none';
  return hexColour.test(value)||namedColour.test(value)||colourFunction.test(value);
}
function entries(value,name) {
  if(value===undefined)return [];
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(name+' must be an object');
  return Object.entries(value);
}
export function normalizeTheme(theme={}) {
  if(!theme||typeof theme!=='object'||Array.isArray(theme))throw new TypeError('Invalid guided theme');
  const names=Object.keys(theme);
  if(names.some(key=>key!=='palette'&&key!=='variables'))throw new TypeError('Unknown guided theme field');
  const overrides=Object.create(null);
  for(const [token,value] of entries(theme.palette,'palette')){
    if(!own(THEME_TOKENS,token)||!validColour(value,token))
      throw new TypeError('Invalid palette colour: '+token);
    overrides[token]=value;
  }
  for(const [token,value] of entries(theme.variables,'variables')){
    if(!own(THEME_TOKENS,token)||typeof value!=='string'||!cssVariable.test(value))
      throw new TypeError('Invalid CSS variable name: '+token);
    if(own(overrides,token))
      throw new TypeError('Set either palette or variable for '+token+', not both');
    overrides[token]='var('+value+')';
  }
  return Object.freeze({...overrides});
}

// Only library-owned custom properties are touched. Previous inline values restored.
export function applyTheme(element,theme={}) {
  const values=normalizeTheme(theme);
  const style=element?.style;
  if(!style?.setProperty||!style.getPropertyValue||!style.removeProperty)
    return ()=>{};
  const saved=[];
  for(const [token,value] of Object.entries(values)){
    const property=THEME_TOKENS[token];
    const previous=style.getPropertyValue(property);
    const priority=style.getPropertyPriority?.(property)||'';
    saved.push([property,previous,priority]);
    style.setProperty(property,value);
  }
  let restored=false;
  return ()=>{
    if(restored)return;
    restored=true;
    for(const [property,previous,priority] of saved){
      if(previous)style.setProperty(property,previous,priority);
      else style.removeProperty(property);
    }
  };
}
