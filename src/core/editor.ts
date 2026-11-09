import {parseConfiguration, type Configuration, type Program} from './model.js';
export const emptyConfiguration: Configuration = {channels:[],programs:[],schedules:[],settings:{schemaVersion:1,skinId:'china-crt-80s',volume:.35}};
export function removeChannel(input: Configuration, id: string): Configuration {
  const next=structuredClone(input);next.channels=next.channels.filter(c=>c.id!==id);next.schedules=next.schedules.filter(s=>s.channelId!==id);
  if(next.settings.lastChannelId===id)delete next.settings.lastChannelId;
  return parseConfiguration(next);
}
export function removeProgram(input: Configuration, id: string): Configuration {
  const next=structuredClone(input);next.programs=next.programs.filter(p=>p.id!==id);next.schedules=next.schedules.filter(s=>s.programId!==id);return parseConfiguration(next);
}
export function timeText(minute: number): string {return `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;}
export function timeMinute(value: string): number {
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value))throw Error('请输入00:00–24:00的时间');
  const [h,m]=value.split(':').map(Number);return h!*60+m!;
}
export function moveSlot(start: number,end: number,delta: number,mode: 'move'|'start'|'end'): [number,number] {
  const snap=(value:number)=>Math.round(value/5)*5;
  if(mode==='move'){const s=Math.max(0,Math.min(1440-(end-start),snap(start+delta)));return [s,s+end-start];}
  return mode==='start'?[Math.max(0,Math.min(end-1,snap(start+delta))),end]:[start,Math.max(start+1,Math.min(1440,snap(end+delta)))];
}
export function exportBackup(config: Configuration): string {return JSON.stringify({schemaVersion:1,...parseConfiguration(config)},null,2);}
export function importBackup(text: string): Configuration {
  if(text.length>5_000_000)throw Error('备份超过5MB，请检查文件');
  const value: unknown=JSON.parse(text);
  if(!value||typeof value!=='object'||!('schemaVersion' in value)||value.schemaVersion!==1)throw Error('仅支持schemaVersion 1的备份');
  return parseConfiguration(value);
}
export function friendlyError(error: unknown): string {
  const message=error instanceof Error?error.message:String(error);
  if(message.includes('Overlapping'))return '同一频道的节目时间重叠，请调整起止时间。';
  if(message.includes('Duplicate'))return '编号或ID重复，请使用不同的值。';
  if(message.includes('positive length'))return '结束时间必须晚于开始时间，跨午夜请拆分为两段。';
  if(message.includes('HTTP(S)'))return '请输入完整的http或https链接，不能包含账号密码。';
  return message;
}

/** Preserve verified metadata only while the underlying source is unchanged. */
export function reviseProgram(previous: Program | undefined, draft: Program): Program {
  const next={...draft};
  if(previous?.sourceType===draft.sourceType&&previous.sourceUrl===draft.sourceUrl){
    if(previous.durationSeconds!==undefined)next.durationSeconds=previous.durationSeconds;
    if(next.sourceId===undefined&&previous.sourceId!==undefined)next.sourceId=previous.sourceId;
  }
  return next;
}
