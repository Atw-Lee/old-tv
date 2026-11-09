export const epoch = (time = '09:00:00', date = '2026-11-03') => Date.parse(`${date}T${time}+08:00`);
export function configuration() {
  return {
    channels: [
      {id:'a',number:1,name:'动画',sortOrder:0,enabled:true},
      {id:'b',number:2,name:'纪录片',sortOrder:1,enabled:true},
      {id:'c',number:3,name:'停用',sortOrder:2,enabled:false},
    ],
    programs: [
      {id:'p',title:'节目1',sourceType:'hls-vod',sourceUrl:'https://example.com/vod.m3u8'},
      {id:'q',title:'节目2',sourceType:'bilibili',sourceUrl:'https://www.bilibili.com/video/BV1B7411m7LV',sourceId:'BV1B7411m7LV'},
    ],
    schedules: [
      {id:'am',channelId:'a',programId:'p',startMinute:540,endMinute:600},
      {id:'next',channelId:'a',programId:'q',startMinute:600,endMinute:660},
      {id:'other',channelId:'b',programId:'p',startMinute:480,endMinute:720},
    ],
    settings:{schemaVersion:1,skinId:'china-crt-80s',volume:0.5,lastChannelId:'a'},
  };
}
export class FakeTime {
  time = epoch();
  sequence = 0;
  jobs = new Map();
  now = () => this.time;
  set = (fn, delay) => { const id = ++this.sequence; this.jobs.set(id,{fn,at:this.time+delay}); return id; };
  clear = id => { this.jobs.delete(id); };
  // Run timers chronologically without wall-clock waits.
  advance(ms) {
    const end = this.time + ms;
    while (true) {
      const entry = [...this.jobs].sort((a,b)=>a[1].at-b[1].at)[0];
      if (!entry || entry[1].at > end) break;
      this.time = entry[1].at; this.jobs.delete(entry[0]); entry[1].fn();
    }
    this.time = end;
  }
  // Simulate OS sleep/browser timer suspension without changing the actual interval count.
  sleep(ms) { this.time += ms; }
  fireOne() {
    const entry = [...this.jobs][0];
    if (entry) { this.jobs.delete(entry[0]); entry[1].fn(); }
  }
}
