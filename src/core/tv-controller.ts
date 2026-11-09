import {Scheduler, type State, type Timer} from './scheduler.js';
import {parseConfiguration, enabledChannels, type Channel} from './model.js';
import type {Clock} from './clock.js';
import {bindBrowserLifecycle} from './lifecycle.js';
export interface TVSnapshot {
  readonly powered: boolean;
  readonly channelId: string | undefined;
  readonly channels: readonly Readonly<Channel>[];
  readonly volume: number;
  readonly schedule: Readonly<State>;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
/** The skin owns no second copy of power/channel/volume state. No media player in M2. */
export class TVController {
  private scheduler: Scheduler;
  private snapshot: TVSnapshot;
  private listeners = new Set<() => void>();
  private cleanups = new Set<() => void>();
  private unsubscribe: () => void;
  private disposed = false;
  constructor(config: unknown, clock?: Clock, timer?: Timer) {
    const validated = parseConfiguration(config);
    this.scheduler = new Scheduler(validated, clock, timer);
    this.snapshot = freeze({powered:false,channelId:this.scheduler.channelId,channels:enabledChannels(validated.channels),volume:validated.settings.volume,schedule:this.scheduler.getState()});
    this.unsubscribe = this.scheduler.subscribe(update => {
      this.publish({...this.snapshot,powered:update.state.kind!=='OFF',channelId:this.scheduler.channelId,schedule:update.state});
    });
  }
  getSnapshot = (): TVSnapshot => this.snapshot;
  subscribe = (callback: () => void): (() => void) => {
    this.assertLive(); this.listeners.add(callback); return () => { this.listeners.delete(callback); };
  };
  private assertLive(): void { if(this.disposed) throw Error('TVController disposed'); }
  private publish(snapshot: TVSnapshot): void { this.snapshot=freeze(snapshot); for(const listener of [...this.listeners])listener(); }
  togglePower = (): void => { this.assertLive(); if(this.snapshot.powered)this.scheduler.powerOff();else this.scheduler.powerOn(); };
  nextChannel = (direction: 1 | -1): void => { this.assertLive(); this.scheduler.nextChannel(direction); };
  selectChannel = (id: string): void => { this.assertLive(); this.scheduler.selectChannel(id); };
  setVolume = (value: number): void => {
    this.assertLive(); if(!Number.isFinite(value))return;
    const volume=Math.round(Math.max(0,Math.min(1,value))*100)/100;
    if(volume!==this.snapshot.volume)this.publish({...this.snapshot,volume});
  };
  replaceConfiguration(config: unknown): void {
    this.assertLive(); const validated=parseConfiguration(config);
    this.snapshot=freeze({...this.snapshot,channels:enabledChannels(validated.channels),volume:validated.settings.volume});
    this.scheduler.replaceConfiguration(validated);
  }
  mediaDuration = (token:number,seconds:number): void => {this.scheduler.mediaDuration(token,seconds);};
  mediaEnded = (token:number): void => {this.scheduler.mediaEnded(token);};
  refresh = (): void => {if(!this.disposed)this.scheduler.refresh('resume');};
  connectBrowser(page: Document, network: Window): () => void {
    this.assertLive(); const cleanup=bindBrowserLifecycle(this.scheduler,page,network);this.cleanups.add(cleanup);
    return () => {cleanup();this.cleanups.delete(cleanup);};
  }
  dispose(): void {
    if(this.disposed)return;
    for(const cleanup of this.cleanups)cleanup();this.cleanups.clear();
    this.scheduler.dispose();this.unsubscribe();this.listeners.clear();this.disposed=true;
  }
}
