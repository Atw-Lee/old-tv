/** Domain objects; persistence and editor UI belong to M3. */
export type SourceType = 'hls-vod' | 'bilibili' | 'youtube';
export interface Channel {
  id: string;
  number: number;
  name: string;
  sortOrder: number;
  enabled: boolean;
}
export interface Program {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string;
  sourceId?: string;
  /** Source duration from metadata or user input; independent of slot length. */
  durationSeconds?: number;
}
export interface Schedule {
  id: string;
  channelId: string;
  programId: string;
  startMinute: number;
  endMinute: number;
  endBehavior?: 'no-signal' | 'loop';
}
export interface Settings {
  schemaVersion: 1;
  skinId: 'china-crt-80s';
  volume: number;
  lastChannelId?: string;
}
export interface Configuration {
  channels: Channel[];
  programs: Program[];
  schedules: Schedule[];
  settings: Settings;
}
export type Issue = {path: string; message: string};
export class ConfigurationError extends Error {
  constructor(public readonly issues: readonly Issue[]) {
    super(issues.map(i => `${i.path}: ${i.message}`).join('\n'));
    this.name = 'ConfigurationError';
  }
}

/** Validate untrusted objects and return an owned copy. No import/export or storage side effects. */
export function parseConfiguration(input: unknown): Configuration {
  const issues: Issue[] = [];
  const fail = (path: string, message: string) => { issues.push({path, message}); };
  const obj = (value: unknown, path: string): Record<string, unknown> => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'Expected object'); return {};
    }
    return value as Record<string, unknown>;
  };
  const str = (v: unknown, path: string): string => {
    if (typeof v !== 'string' || !v.trim()) { fail(path, 'Expected nonempty string'); return ''; }
    return v;
  };
  const num = (v: unknown, path: string, min: number, max: number, integer = false): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v))) {
      fail(path, `Expected ${integer ? 'integer' : 'finite number'} in [${min}, ${max}]`); return min;
    }
    return v;
  };
  const list = (v: unknown, path: string): unknown[] => {
    if (!Array.isArray(v)) { fail(path, 'Expected array'); return []; } return v;
  };
  const root = obj(input, 'config');
  const channels = list(root.channels, 'channels').map((v, i): Channel => {
    const p = `channels[${i}]`, x = obj(v, p);
    if (typeof x.enabled !== 'boolean') fail(`${p}.enabled`, 'Expected boolean');
    return {id: str(x.id, `${p}.id`), name: str(x.name, `${p}.name`),
      number: num(x.number, `${p}.number`, 1, Number.MAX_SAFE_INTEGER, true),
      sortOrder: num(x.sortOrder, `${p}.sortOrder`, 0, Number.MAX_SAFE_INTEGER, true), enabled: x.enabled === true};
  });
  const programs = list(root.programs, 'programs').map((v, i): Program => {
    const p = `programs[${i}]`, x = obj(v, p);
    const type = x.sourceType;
    if (type !== 'hls-vod' && type !== 'bilibili' && type !== 'youtube') fail(`${p}.sourceType`, 'Unsupported source');
    const url = str(x.sourceUrl, `${p}.sourceUrl`);
    try {
      const u = new URL(url);
      if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw Error();
    } catch { fail(`${p}.sourceUrl`, 'Expected HTTP(S) URL without embedded credentials'); }
    const result: Program = {id: str(x.id, `${p}.id`), title: str(x.title, `${p}.title`), sourceType: type as SourceType, sourceUrl: url};
    if (x.sourceId !== undefined) result.sourceId = str(x.sourceId, `${p}.sourceId`);
    if (x.durationSeconds !== undefined) {
      result.durationSeconds = num(x.durationSeconds, `${p}.durationSeconds`, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER);
    }
    return result;
  });
  const schedules = list(root.schedules, 'schedules').map((v, i): Schedule => {
    const p = `schedules[${i}]`, x = obj(v, p);
    const result: Schedule = {id: str(x.id, `${p}.id`), channelId: str(x.channelId, `${p}.channelId`), programId: str(x.programId, `${p}.programId`),
      startMinute: num(x.startMinute, `${p}.startMinute`, 0, 1439, true), endMinute: num(x.endMinute, `${p}.endMinute`, 1, 1440, true)};
    if(x.endBehavior!==undefined){if(x.endBehavior!=='loop'&&x.endBehavior!=='no-signal')fail(`${p}.endBehavior`,'Unsupported end behavior');else result.endBehavior=x.endBehavior;}
    if (result.endMinute <= result.startMinute) fail(p, 'Slot must have positive length and cannot cross midnight');
    return result;
  });
  const unique = (values: readonly (string | number)[], path: string) => {
    if (new Set(values).size !== values.length) fail(path, 'Duplicate value');
  };
  unique(channels.map(c => c.id), 'channels.id'); unique(channels.map(c => c.number), 'channels.number');
  unique(programs.map(p => p.id), 'programs.id'); unique(schedules.map(s => s.id), 'schedules.id');
  const channelIds = new Set(channels.map(c => c.id)), programIds = new Set(programs.map(p => p.id));
  schedules.forEach((s, i) => {
    if (!channelIds.has(s.channelId)) fail(`schedules[${i}].channelId`, 'Missing channel');
    if(s.endBehavior==='loop'&&programs.some(p=>p.id===s.programId&&p.sourceType==='bilibili'&&!p.durationSeconds))fail(`schedules[${i}].endBehavior`,'循环排片引用的 B 站视频必须填写实际时长');
    if (!programIds.has(s.programId)) fail(`schedules[${i}].programId`, 'Missing program');
  });
  for (const channel of channels) {
    const slots = schedules.filter(s => s.channelId === channel.id).sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < slots.length; i++) {
      if (slots[i]!.startMinute < slots[i - 1]!.endMinute) fail(`schedules.${slots[i]!.id}`, 'Overlapping slots in channel');
    }
  }
  const raw = obj(root.settings, 'settings');
  if (raw.schemaVersion !== 1) fail('settings.schemaVersion', 'Only schemaVersion 1 is supported');
  if (raw.skinId !== 'china-crt-80s') fail('settings.skinId', 'Unsupported skin');
  const settings: Settings = {schemaVersion: 1, skinId: 'china-crt-80s', volume: num(raw.volume, 'settings.volume', 0, 1)};
  if (raw.lastChannelId !== undefined) {
    settings.lastChannelId = str(raw.lastChannelId, 'settings.lastChannelId');
    if (!channelIds.has(settings.lastChannelId)) fail('settings.lastChannelId', 'Missing channel');
  }
  if (issues.length) throw new ConfigurationError(issues);
  return {channels, programs, schedules, settings};
}

export function enabledChannels(channels: readonly Channel[]): Channel[] {
  return channels.filter(c => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export function adjacentChannel(channels: readonly Channel[], currentId: string | undefined, direction: 1 | -1): string | undefined {
  const enabled = enabledChannels(channels);
  if (!enabled.length) return undefined;
  const index = enabled.findIndex(c => c.id === currentId);
  if (index === -1) return (direction === 1 ? enabled[0] : enabled.at(-1))!.id;
  return enabled[(index + direction + enabled.length) % enabled.length]!.id;
}
