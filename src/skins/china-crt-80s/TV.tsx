import {useEffect,useRef,useState} from 'react';
import type {SkinProps} from '../types.js';
import {Knob} from './Knob.js';
import {NoSignal} from './NoSignal.js';
import {Button} from '../../components/ui/button.js';
import './skin.css';
export function CRT80s({state,actions,children,onManage}:SkinProps & {onManage?:()=>void}){
  const limited=state.schedule.kind==='AIR'&&state.schedule.target.program.sourceType==='bilibili';
  const selected=state.channels.find(c=>c.id===state.channelId);
  const channelIndex=Math.max(0,state.channels.findIndex(c=>c.id===state.channelId));
  const [phase,setPhase]=useState('steady');
  const previous=useRef({powered:state.powered,channel:state.channelId});
  useEffect(()=>{
    const old=previous.current;previous.current={powered:state.powered,channel:state.channelId};
    if(old.powered===state.powered&&old.channel===state.channelId)return;
    setPhase(old.powered!==state.powered?(state.powered?'power-on':'power-off'):state.powered?'tuning':'steady');
    const timer=setTimeout(()=>setPhase('steady'),500);return()=>clearTimeout(timer);
  },[state.powered,state.channelId]);
  return <div className="tv-stage">
    <div className="television" data-testid="television" data-powered={state.powered} data-phase={phase}>
      <div className="cabinet-edge" aria-hidden="true"/>
      <div className="tv-face">
        <div className="picture-section">
          <div className="bezel"><div className="glass" data-testid="screen">
            {state.powered?<div className="screen-content" key={state.channelId}>
              {state.schedule.kind==='AIR'?children:<NoSignal empty={state.channels.length===0}/>}
              <div className="screen-channel" aria-hidden="true">{String(selected?.number??0).padStart(2,'0')}</div>
            </div>:<div className="off-screen"><span className="off-reflection"/></div>}
            <div className="screen-scanlines" aria-hidden="true"/><div className="glass-reflection" aria-hidden="true"/>
            <div className="switch-flash" aria-hidden="true"/>
          </div></div>
          <div className="screen-chin"><span>彩色电视机 <b>TV–1988</b></span></div>
        </div>
        <aside className="control-panel" aria-label="电视机控制面板">
          <div className="panel-top"><span className="metal-badge">全频道</span><span className="panel-model">PAL · 14″</span></div>
          <div className="channel-control">
            <div className="control-label"><span>频道</span><span>CHANNEL</span></div>
            <div className="dial-numbers" aria-hidden="true"><span>Ⅰ</span><span>Ⅱ</span><span>Ⅲ</span></div>
            <Knob wrap label="频道旋钮" min={1} max={Math.max(1,state.channels.length)} step={1} value={channelIndex+1} valueText={selected?`${selected.number}台 ${selected.name}`:'无频道'} onChange={n=>{const c=state.channels[n-1];if(c)actions.selectChannel(c.id);}} className="channel-knob"/>
            <div className="channel-step-buttons"><Button variant="outline" className="step-button" aria-label="上一频道" onClick={()=>actions.nextChannel(-1)}>−</Button><span aria-hidden="true">调谐</span><Button variant="outline" className="step-button" aria-label="下一频道" onClick={()=>actions.nextChannel(1)}>＋</Button></div>
          </div>
          <div className="volume-control"><div className="control-label"><span>音量</span><span>VOLUME</span></div><Knob disabled={limited} label="音量旋钮" min={0} max={100} step={5} value={Math.round(state.volume*100)} valueText={state.volume===0?'静音':`${Math.round(state.volume*100)}%`} onChange={n=>actions.setVolume(n/100)} className="volume-knob"/><output className="volume-value" aria-label="音量值">{state.volume===0?'静音':`${Math.round(state.volume*100)}%`}</output>{limited&&<p className="volume-limitation">B站请使用视频内或系统音量</p>}</div>
          <div className="speaker" aria-hidden="true"/>{onManage&&<button type="button" className="cabinet-settings" onClick={onManage} aria-label="打开频道设置">调校 · SET</button>}
          <div className="power-control"><span className={`power-led ${state.powered?'lit':''}`} aria-hidden="true"/><Button className="power-switch" aria-label="电视电源" aria-pressed={state.powered} onClick={actions.togglePower}><span className="power-symbol" aria-hidden="true">⏻</span></Button><span className="power-caption">电源 <small>POWER</small></span></div>
        </aside>
      </div>
      <span className="cabinet-screw screw-one" aria-hidden="true"/><span className="cabinet-screw screw-two" aria-hidden="true"/>
    </div>
    <div className="tv-feet" aria-hidden="true"><span/><span/></div><div className="tv-shadow" aria-hidden="true"/>
  </div>;
}
