import type {Program} from '../core/model.js';
export type PlaybackStatus={kind:'LOADING'|'BUFFERING'|'PLAYING'|'BLOCKED'|'ERROR'|'LIMITED';message?:string};
export interface PlaybackOptions {
  program:Program;volume:number;
  target(): {offset:number}|null;
  status(state:PlaybackStatus):void;
  duration(seconds:number):void;
  ended():void;
}
export interface Player {resume():void;sync():void;setVolume(value:number):void;destroy():void}
