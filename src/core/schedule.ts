import {broadcastDay} from './clock.js';
import type {Configuration, Program, Schedule} from './model.js';
export interface AirTarget {
  occurrence: string;
  date: string;
  channelId: string;
  schedule: Schedule;
  program: Program;
  startMs: number;
  endMs: number;
  offsetSeconds: number;
  cycle: number;
  durationSeconds?: number;
}
export type Evaluation =
  | {kind: 'NO_SIGNAL'; reason: 'NO_CHANNEL' | 'GAP' | 'MEDIA_ENDED'; nextBoundaryMs: number | null}
  | {kind: 'AIR'; target: AirTarget; nextBoundaryMs: number};

/** Requires a validated configuration. The engine owns a defensive validated copy. */
export function evaluateSchedule(config: Configuration, channelId: string | undefined, epochMs: number, observedDuration?: (occurrence: string) => number | undefined): Evaluation {
  const day = broadcastDay(epochMs);
  const channel = config.channels.find(c => c.id === channelId && c.enabled);
  if (!channel) return {kind: 'NO_SIGNAL', reason: 'NO_CHANNEL', nextBoundaryMs: null};
  const slots = config.schedules.filter(s => s.channelId === channel.id).sort((a, b) => a.startMinute - b.startMinute);
  const slot = slots.find(s => day.elapsedMs >= s.startMinute * 60000 && day.elapsedMs < s.endMinute * 60000);
  if (!slot) {
    const next = slots.find(s => s.startMinute * 60000 > day.elapsedMs);
    return {kind: 'NO_SIGNAL', reason: 'GAP', nextBoundaryMs: next
      ? day.startMs + next.startMinute * 60000
      : slots.length ? day.startMs + 86400000 + slots[0]!.startMinute * 60000 : null};
  }
  const program = config.programs.find(p => p.id === slot.programId);
  if (!program) throw new Error('Invalid configuration: missing program');
  const startMs = day.startMs + slot.startMinute * 60000, endMs = day.startMs + slot.endMinute * 60000;
  const elapsedSeconds = (epochMs - startMs) / 1000;
  const occurrence = JSON.stringify([day.date, channel.id, slot.id]);
  const duration = observedDuration?.(occurrence) ?? program.durationSeconds;
  const looping=slot.endBehavior==='loop'&&duration!==undefined;
  const cycle=looping?Math.floor(elapsedSeconds/duration):0;
  const offsetSeconds=looping?elapsedSeconds%duration:elapsedSeconds;
  if (!looping && duration !== undefined && offsetSeconds >= duration) {
    return {kind: 'NO_SIGNAL', reason: 'MEDIA_ENDED', nextBoundaryMs: endMs};
  }
  return {kind: 'AIR', target: {occurrence, date: day.date,
    channelId: channel.id, schedule: {...slot}, program: {...program}, startMs, endMs, offsetSeconds, cycle, ...(duration!==undefined?{durationSeconds:duration}:{})},
  nextBoundaryMs: Math.min(endMs, duration === undefined ? endMs : startMs + (cycle+1) * duration * 1000)};
}
