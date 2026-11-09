import {useId,useState} from 'react';
import {CircleHelp} from 'lucide-react';
import type {Program,Schedule} from '../../core/model.js';
import {timeMinute,timeText} from '../../core/editor.js';
import {SelectField} from './SelectField.js';
import {Input} from '../../components/ui/input.js';
import {DurationField} from './DurationField.js';
function suggestedEnd(start:string,seconds?:number){
  try{return timeText(Math.min(1440,timeMinute(start)+Math.ceil((seconds??3600)/60)));}catch{return '';}
}
export function SlotFields({programs,slot,dirty}:{programs:Program[];slot:Schedule|null;dirty:()=>void}){
  const hintId=useId();
  const [id,setId]=useState(slot?.programId??programs[0]!.id);
  const program=programs.find(p=>p.id===id)!;
  const [start,setStart]=useState(timeText(slot?.startMinute??540));
  const [manualEnd,setManualEnd]=useState<string|null>(slot?timeText(slot.endMinute):null);
  const [observed,setObserved]=useState<number|undefined>(program.durationSeconds);
  const [behavior,setBehavior]=useState(slot?.endBehavior??'no-signal');
  return <><div className="control-field">视频源<SelectField label="排片视频源" name="program" value={id} options={programs.map(p=>({value:p.id,label:p.title}))} onValueChange={value=>{
    const p=programs.find(x=>x.id===value)!;setId(value);setObserved(p.durationSeconds);setManualEnd(null);if(p.sourceType==='bilibili'&&!p.durationSeconds)setBehavior('no-signal');dirty();
  }}/></div>
  <DurationField key={id} type={program.sourceType} url={program.sourceUrl} known={program.durationSeconds} onRead={setObserved}/>
  <div className="time-fields"><div className="control-field">开始时间<Input type="time" step={60} name="start" aria-label="开始时间" required value={start} onChange={e=>setStart(e.target.value)} placeholder="09:00"/></div>
  <div className="control-field">结束时间<Input type="time" step={60} aria-label="结束时间" required value={(manualEnd??suggestedEnd(start,observed)).replace('24:00','00:00')} onChange={e=>setManualEnd(e.target.value==='00:00'?'24:00':e.target.value)} /><input type="hidden" name="end" value={manualEnd??suggestedEnd(start,observed)}/></div></div>
  <div className="control-field">
    <span className="behavior-caption">播完后
      <span className="behavior-help"><button type="button" aria-label="播完后说明" aria-describedby={hintId}><CircleHelp aria-hidden="true"/></button><span id={hintId} role="tooltip">{program.sourceType==='bilibili'?(observed?'B 站按填写的时长切换，暂停或缓冲不会推迟切换。':'在视频源中填写实际时长，即可按时间循环或显示无信号。'):'视频提前结束时按此选项播放，到排片结束时间即切换。'} 排片按分钟向上取整，结束选 00:00 表示当天 24:00。</span></span>
    </span>
    <SelectField name="behavior" label="播完后" value={behavior} onValueChange={v=>{setBehavior(v==='loop'?'loop':'no-signal');dirty();}} disabled={program.sourceType==='bilibili'&&!observed} options={[{value:'no-signal',label:'无信号'},{value:'loop',label:'循环'}]}/></div>
</>;
}
