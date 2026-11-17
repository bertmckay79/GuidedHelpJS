export type Target = string | {id:string} | {feature:string};
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
export interface GuidedOptions {
  tutorials:Tutorial[];namespace?:string;
  storage?:{getItem(key:string):string|null;setItem(key:string,value:string):void}|null;
  document?:Document;window?:Window;getContext?:()=>Context;
  onChange?:(state:TourState)=>void;render?:boolean;
}
export interface GuidedHelp {
  tutorials:ReadonlyArray<Tutorial>;progress:unknown;
  mount():boolean;start(id:string,opts?:{resume?:boolean}):TourState;
  snapshot():TourState;refresh():TourState;
  catalogue(query?:string):unknown[];
  next():TourState;back():TourState;pause():TourState;resume():TourState;
  skipStep():TourState;skip():TourState;restart():TourState;stop():TourState;
  destroy():void;
}
export function createGuidedHelp(options?:GuidedOptions):GuidedHelp;
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
