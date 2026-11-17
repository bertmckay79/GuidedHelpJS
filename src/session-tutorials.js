import {createTutorialRegistry} from './tutorials.js';

export const SESSION_TUTORIAL_MAX_BYTES=262144;
export const SESSION_TUTORIAL_MAX_ITEMS=100;
const KEY=/^[a-z0-9._:-]{8,160}$/;

// Session storage holds *definitions* only. Progress storage is independent.
// Nothing in this module writes to storage or executes content from the payload.
export function readTutorialsFromSessionStorage({
  key,
  storage,
  maxBytes=SESSION_TUTORIAL_MAX_BYTES
}={}) {
  if(typeof key!=='string'||!KEY.test(key))
    throw new TypeError('Invalid session tutorial storage key');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>SESSION_TUTORIAL_MAX_BYTES)
    throw new TypeError('Invalid session tutorial size limit');
  if(!storage||typeof storage.getItem!=='function')
    throw new Error('Session tutorial storage is unavailable');
  let raw;
  try {raw=storage.getItem(key);}
  catch(_) {throw new Error('Session tutorial storage cannot be read');}
  if(raw===null||raw===undefined||raw==='')return Object.freeze([]);
  if(typeof raw!=='string'||raw.length>maxBytes)
    throw new Error('Session tutorial payload exceeds the configured size limit');
  // UTF-8 byte limits matter for browsers storing non-ASCII text.
  if(typeof TextEncoder!=='undefined'&&new TextEncoder().encode(raw).byteLength>maxBytes)
    throw new Error('Session tutorial payload exceeds the configured size limit');
  let value;
  try {value=JSON.parse(raw);}
  catch(_) {throw new Error('Invalid session tutorial JSON');}
  const definitions=Array.isArray(value)?value:[value];
  if(definitions.length>SESSION_TUTORIAL_MAX_ITEMS)
    throw new Error('Too many session tutorials');
  // This rejects unknown fields, duplicate IDs, arbitrary selectors and scripts.
  return createTutorialRegistry(definitions);
}
