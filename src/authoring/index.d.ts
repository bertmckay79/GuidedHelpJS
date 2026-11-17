import type {Context,Tutorial,Target, TourState} from '../index.js';
export interface RecorderOptions {
  document?:Document;window?:Window;
  getContext?:()=>Context;
  initialTutorial?:Tutorial|null;
  onChange?:(state:{mode:'edit'|'record'|'preview';draft:Tutorial;errors:string[]})=>void;
}
export interface TutorialRecorder {
  mount():boolean;
  destroy():void;
  setMode(mode:'edit'|'record'|'preview'):boolean;
  getMode():'edit'|'record'|'preview';
  getDraft():Tutorial;
  getErrors():string[];
  getPreviewState():TourState|null;
  addTarget(target:Target):Tutorial;
  editTutorial(changes:Partial<Tutorial>):Tutorial;
  updateStep(index:number,changes:Partial<Tutorial['steps'][number]>):Tutorial;
  moveStep(from:number,to:number):Tutorial;
  removeStep(index:number):Tutorial;
  importJSON(json:string):boolean;
  exportJSON():string;
  downloadJSON():string|undefined;
}
export function createTutorialRecorder(options?:RecorderOptions):TutorialRecorder;
