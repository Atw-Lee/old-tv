import {broadcastDay, systemClock, type Clock} from './clock.js';
import {adjacentChannel, enabledChannels, parseConfiguration, type Configuration} from './model.js';
import {evaluateSchedule, type AirTarget, type Evaluation} from './schedule.js';

export type RefreshReason = 'tick' | 'power' | 'channel' | 'configuration' | 'visible' | 'online' | 'resume' | 'media';
export type State = {kind: 'OFF'} | Exclude<Evaluation, {kind: 'AIR'}> | {kind: 'AIR'; target: AirTarget; token: number; nextBoundaryMs: number};
/** AIR is desired schedule state, not a claim that video is already playing. */
export type Command = {type: 'stop'; token: number}
  | {type: 'start' | 'resync'; token: number; target: AirTarget};
export interface Update {at: number; reason: RefreshReason; state: State; commands: Command[]}
export interface Timer {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}
const browserTimer: Timer = {
  set: (fn, ms) => globalThis.setTimeout(fn, ms),
  clear: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Scheduler {
  private config: Configuration;
  private selected: string | undefined;
  private powered = false;
  private disposed = false;
  private state: State = {kind: 'OFF'};
  private generation = 0;
  private handle: unknown;
  private armed = false;
  private timerGeneration = 0;
  private lastTime: number | undefined;
  private ended = new Set<string>();
  private observedDurations = new Map<string, number>();
  private day = '';
  private listeners = new Set<(update: Update) => void>();

  constructor(config: unknown, private readonly clock: Clock = systemClock, private readonly timer: Timer = browserTimer) {
    this.config = parseConfiguration(config);
    this.selected = this.chooseChannel(this.config.settings.lastChannelId);
  }
  private chooseChannel(id: string | undefined): string | undefined {
    return this.config.channels.find(c => c.id === id && c.enabled)?.id ?? enabledChannels(this.config.channels)[0]?.id;
  }
  getState(): State { return structuredClone(this.state); }
  get channelId(): string | undefined { return this.selected; }
  subscribe(listener: (update: Update) => void): () => void {
    this.assertLive(); this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private assertLive(): void { if (this.disposed) throw new Error('Scheduler has been disposed'); }
  powerOn(): Update { this.assertLive(); this.powered = true; return this.refresh('power'); }
  powerOff(): Update { this.assertLive(); this.powered = false; return this.refresh('power'); }
  selectChannel(id: string): Update {
    this.assertLive();
    if (!this.config.channels.some(c => c.id === id && c.enabled)) throw new RangeError('Channel is missing or disabled');
    this.selected = id; return this.refresh('channel');
  }
  nextChannel(direction: 1 | -1 = 1): Update {
    this.assertLive(); this.selected = adjacentChannel(this.config.channels, this.selected, direction);
    return this.refresh('channel');
  }
  replaceConfiguration(config: unknown): Update {
    this.assertLive();
    // Validate before changing any state; failed edits leave playback intact.
    const next = parseConfiguration(config);
    const unchanged = (occurrence: string): boolean => {
      const scheduleId: string = JSON.parse(occurrence)[2];
      const before = this.config.schedules.find(s => s.id === scheduleId);
      const after = next.schedules.find(s => s.id === scheduleId);
      return before !== undefined && after !== undefined && JSON.stringify(before) === JSON.stringify(after)
        && JSON.stringify(this.config.programs.find(p => p.id === before.programId)) === JSON.stringify(next.programs.find(p => p.id === after.programId));
    };
    this.ended = new Set([...this.ended].filter(unchanged));
    this.observedDurations = new Map([...this.observedDurations].filter(([key]) => unchanged(key)));
    this.config = next; this.selected = this.chooseChannel(this.selected);
    return this.refresh('configuration');
  }
  /** Accept only events from the currently active playback generation. */
  mediaEnded(token: number): Update | null {
    if (this.disposed || this.state.kind !== 'AIR' || this.state.token !== token) return null;
    if(this.state.target.schedule.endBehavior==='loop'&&this.state.target.durationSeconds!==undefined)return this.refresh('media');
    this.ended.add(this.state.target.occurrence); return this.refresh('media');
  }
  mediaDuration(token: number, durationSeconds: number): Update | null {
    if (this.disposed || this.state.kind !== 'AIR' || this.state.token !== token) return null;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new RangeError('Expected positive finite VOD duration');
    this.observedDurations.set(this.state.target.occurrence, durationSeconds);
    return this.refresh('media');
  }
  /** Load completion must use the current clock, never its original captured offset. */
  ready(token: number): Update | null {
    if (this.disposed || this.state.kind !== 'AIR' || this.state.token !== token) return null;
    return this.refresh('resume');
  }
  refresh(reason: RefreshReason = 'tick'): Update {
    this.assertLive();
    const at = this.clock.now();
    const currentDay = broadcastDay(at).date;
    if (this.day !== currentDay) { this.ended.clear(); this.observedDurations.clear(); this.day = currentDay; }
    const previous = this.state;
    const late = this.lastTime !== undefined && (at - this.lastTime > 1000 || at < this.lastTime);
    this.lastTime = at;
    let next: State = {kind: 'OFF'};
    if (this.powered) {
      const evaluated = evaluateSchedule(this.config, this.selected, at, occurrence => this.observedDurations.get(occurrence));
      if (evaluated.kind === 'NO_SIGNAL') next = evaluated;
      else {
        const {target} = evaluated, actualDuration = this.observedDurations.get(target.occurrence);
        if (this.ended.has(target.occurrence) || (actualDuration !== undefined && target.offsetSeconds >= actualDuration)) {
          next = {kind: 'NO_SIGNAL', reason: 'MEDIA_ENDED', nextBoundaryMs: target.endMs};
        } else {
          const retain = previous.kind === 'AIR' && previous.target.occurrence === target.occurrence && previous.target.cycle === target.cycle && reason !== 'configuration';
          next = {kind: 'AIR', target, token: retain ? previous.token : ++this.generation,
            nextBoundaryMs: evaluated.nextBoundaryMs};
        }
      }
    }
    const commands: Command[] = [];
    if (previous.kind === 'AIR' && (next.kind !== 'AIR' || next.token !== previous.token)) commands.push({type: 'stop', token: previous.token});
    if (next.kind === 'AIR') {
      if (previous.kind !== 'AIR' || next.token !== previous.token) commands.push({type: 'start', token: next.token, target: next.target});
      else if (late || ['visible', 'online', 'resume', 'power', 'channel'].includes(reason)) commands.push({type: 'resync', token: next.token, target: next.target});
    }
    this.state = next;
    this.arm(at);
    const update: Update = {at, reason, state: structuredClone(next), commands: structuredClone(commands)};
    // A listener cannot mutate internal state or another listener's payload.
    for (const listener of [...this.listeners]) listener(structuredClone(update));
    return update;
  }
  private cancel(): void {
    this.timerGeneration++;
    if (this.armed) this.timer.clear(this.handle);
    this.armed = false;
  }
  private arm(at: number): void {
    this.cancel();
    if (!this.powered) return;
    const boundary = this.state.kind === 'OFF' ? null : this.state.nextBoundaryMs;
    const delay = boundary === null ? 250 : Math.max(1, Math.min(250, boundary - at));
    const generation = this.timerGeneration;
    this.armed = true;
    this.handle = this.timer.set(() => {
      if (this.disposed || generation !== this.timerGeneration) return;
      this.armed = false; this.refresh('tick');
    }, delay);
  }
  dispose(): void {
    if (this.disposed) return;
    try { this.powerOff(); }
    finally { this.disposed = true; this.cancel(); this.listeners.clear(); }
  }
}
