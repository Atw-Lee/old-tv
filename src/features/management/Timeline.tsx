import {useRef,useState} from 'react';
import type {Configuration,Schedule} from '../../core/model.js';
import {moveSlot,timeText} from '../../core/editor.js';
export function Timeline({config,channelId,disabled,onChange,onSelect}:{config:Configuration;channelId:string;disabled:boolean;onChange(slot:Schedule):void;onSelect(slot:Schedule):void}){
  const track=useRef<HTMLDivElement>(null);
  const gesture=useRef<{slot:Schedule;x:number;width:number;mode:'move'|'start'|'end';moved:boolean}|null>(null);
  const [preview,setPreview]=useState<Schedule|null>(null);
  const slots=config.schedules.filter(s=>s.channelId===channelId).sort((a,b)=>a.startMinute-b.startMinute);
  const shown=slots.map(s=>preview?.id===s.id?preview:s);
  let end=0;const gaps:{start:number;end:number}[]=[];for(const s of shown){if(s.startMinute>end)gaps.push({start:end,end:s.startMinute});end=Math.max(end,s.endMinute);}if(end<1440)gaps.push({start:end,end:1440});
  return <div className="timeline-scroll"><div className="timeline-inner"><div className="time-ruler">{Array.from({length:13},(_,i)=><span key={i}>{String(i*2).padStart(2,'0')}:00</span>)}</div>
    <div className="timeline" ref={track} aria-label="每日24小时排片轨道">
      {gaps.map(g=><div className="time-gap" key={g.start} style={{left:`${g.start/14.4}%`,width:`${(g.end-g.start)/14.4}%`}} title={`${timeText(g.start)}–${timeText(g.end)} 空档`}>空档</div>)}
      {shown.map(s=><div key={s.id} className="time-slot" data-testid={`slot-${s.id}`} style={{left:`${s.startMinute/14.4}%`,width:`${(s.endMinute-s.startMinute)/14.4}%`}}>
        {(['start','move','end'] as const).map(mode=><button type="button" key={mode} disabled={disabled} className={`slot-${mode}`} aria-label={`${mode==='move'?'编辑':mode==='start'?'调整开始':'调整结束'} ${config.programs.find(p=>p.id===s.programId)?.title}`} title={`${timeText(s.startMinute)}–${timeText(s.endMinute)}；拖动吸附5分钟，点击编辑精确时间`}
          onPointerDown={e=>{if(e.button!==0||!track.current)return;e.currentTarget.setPointerCapture(e.pointerId);gesture.current={slot:s,x:e.clientX,width:track.current.clientWidth,mode,moved:false};}}
          onPointerMove={e=>{const g=gesture.current;if(!g)return;const delta=(e.clientX-g.x)/g.width*1440;if(Math.abs(e.clientX-g.x)>3)g.moved=true;if(g.moved){const [startMinute,endMinute]=moveSlot(g.slot.startMinute,g.slot.endMinute,delta,g.mode);setPreview({...g.slot,startMinute,endMinute});}}}
          onPointerUp={e=>{const g=gesture.current;if(!g)return;gesture.current=null;setPreview(null);if(g.moved){const [startMinute,endMinute]=moveSlot(g.slot.startMinute,g.slot.endMinute,(e.clientX-g.x)/g.width*1440,g.mode);onChange({...g.slot,startMinute,endMinute});}else onSelect(s);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
          onPointerCancel={()=>{gesture.current=null;setPreview(null);}}
          onLostPointerCapture={()=>{gesture.current=null;setPreview(null);}}
          onClick={e=>{if(e.detail===0)onSelect(s);}}>{mode==='move'?<><strong>{config.programs.find(p=>p.id===s.programId)?.title}</strong><small>{timeText(s.startMinute)}–{timeText(s.endMinute)}</small></>:null}</button>)}
      </div>)}
    </div></div><p className="help">北京时间 · 每日循环。拖动节目移动，两侧把手调整长度（吸附5分钟）；点击节目可精确输入。空档显示无信号。</p></div>;
}
