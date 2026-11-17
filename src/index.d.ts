export type Target = string | {id:string} | {feature:string};
export type ThemeToken = 'accent'|'accentText'|'surface'|'text'|'mutedText'|'border'
  |'buttonBackground'|'buttonText'|'fieldBackground'|'fieldText'|'highlight'
  |'focus'|'selectedBackground'|'statusBackground'|'warningText'|'shadow';
export interface GuidedTheme {
  palette?:Partial<Record<ThemeToken,string>>;
  variables?:Partial<Record<ThemeToken,string>>;
}
export type Advance = 'explicit-next'|'observed-user-interaction'|'read-only-state-reached';
export interface TutorialStep {
  id:string;title:string;body:string;target:Target;advance:Advance;
  page?:string;stage?:string;capability?:string;availability?:string;
  eventType?:'click'|'change';signal?:string;optional?:boolean;
}
export interface Tutorial {
  id:string;title:string;summary:string;category:string;
  page?:string;stage?:string;capability?:string;steps:TutorialStep[];
}
export interface TourState {
  id:string|null;status:string;index:number;total:number;
  step:TutorialStep|null;reason:string|null;
}
export interface Context {
  page?:string;stage?:string;capabilities?:string[];
  visibleTargets?:Target[];signals?:string[];availability?:Record<string,boolean>;
  busy?:boolean;modal?:boolean;authRequired?:boolean;[key:string]:unknown;
}
export interface SessionTutorialSource {
  key?:string;
  storage?:Pick<Storage,'getItem'>|null;
}
export interface GuidedOptions {
  tutorials?:Tutorial[];sessionTutorials?:SessionTutorialSource|null;namespace?:string;
  storage?:{getItem(key:string):string|null;setItem(key:string,value:string):void}|null;
  document?:Document;window?:Window;getContext?:()=>Context;
  onChange?:(state:TourState)=>void;render?:boolean;theme?:GuidedTheme;
}
export interface GuidedHelp {
  tutorials:ReadonlyArray<Tutorial>;progress:unknown;
  mount():boolean;start(id:string,opts?:{resume?:boolean}):TourState;
  snapshot():TourState;refresh():TourState;
  catalogue(query?:string):unknown[];
  reloadSessionTutorials():ReadonlyArray<Tutorial>;
  next():TourState;back():TourState;pause():TourState;resume():TourState;
  skipStep():TourState;skip():TourState;restart():TourState;stop():TourState;
  setTheme(theme:GuidedTheme):void;
  destroy():void;
}
export function createGuidedHelp(options?:GuidedOptions):GuidedHelp;
export const SESSION_TUTORIAL_MAX_BYTES:number;
export const SESSION_TUTORIAL_MAX_ITEMS:number;
export function readTutorialsFromSessionStorage(options:{
  key:string;
  storage:Pick<Storage,'getItem'>;
  maxBytes?:number;
}):ReadonlyArray<Tutorial>;
export const THEME_TOKENS:Readonly<Record<ThemeToken,string>>;
export function normalizeTheme(theme?:GuidedTheme):Readonly<Record<string,string>>;
export function applyTheme(element:HTMLElement|null,theme?:GuidedTheme):()=>void;
export function targetKey(target:Target):string|null;
export function validateTutorial(tutorial:Tutorial):string[];
export function createTutorialRegistry(items:Tutorial[]):ReadonlyArray<Tutorial>;
export function createTutorialEngine(options?:object):unknown;
export function createTutorialProgress(options?:object):unknown;
export function tutorialEligibility(tutorial:Tutorial,context?:Context):string|null;
export function resolveSpotlightTarget(doc:Document,target:Target):Element|null;
export function placeSpotlight(rect:DOMRect,viewport:{width:number;height:number},panelHeight?:number):unknown;
export function createSpotlightLayer(options:object):unknown;
export function createTutorialPresenter(options:object):unknown;
export function searchTutorials(tutorials:Tutorial[],options?:object):unknown[];
export function groupTutorials(entries:unknown[]):unknown[];
