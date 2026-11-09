export const TIME_ZONE = 'Asia/Shanghai';
export interface Clock { now(): number }
export const systemClock: Clock = {now: () => Date.now()};
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
export interface BroadcastDay {date: string; startMs: number; elapsedMs: number}
/** Epoch-based date conversion, independent of host timezone. Supported broadcast era: 2000–2099. */
export function broadcastDay(epochMs: number): BroadcastDay {
  if (!Number.isFinite(epochMs) || epochMs < Date.UTC(2000, 0, 1) || epochMs >= Date.UTC(2100, 0, 1)) {
    throw new RangeError('Broadcast clock must be a finite epoch in 2000–2099');
  }
  const parts = Object.fromEntries(formatter.formatToParts(epochMs).map(p => [p.type, p.value]));
  const millis = ((epochMs % 1000) + 1000) % 1000;
  const elapsedMs = (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000 + millis;
  return {date: `${parts.year}-${parts.month}-${parts.day}`, startMs: epochMs - elapsedMs, elapsedMs};
}
