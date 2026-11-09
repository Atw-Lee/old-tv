import {useEffect,useState,type CSSProperties} from 'react';
import type {SkinProps} from '../types.js';
import {Knob} from './Knob.js';
import {NoSignal} from './NoSignal.js';
import {fitScene,type IllustratedSkin} from './layout.js';
import './skin.css';

function box([left,top,width,height]:readonly [number,number,number,number]):CSSProperties {
  return {position:'absolute',left,top,width,height};
}

function dial([x,y,size]:readonly [number,number,number]):CSSProperties {
  const left=x-size/2, top=y-size/2;
  return {...box([left,top,size,size]),'--dial-position':`-${left}px -${top}px`} as CSSProperties;
}

function WallClock({geometry}:{geometry:readonly [number,number,number]}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    const refresh=()=>setNow(new Date());
    const timer=window.setInterval(refresh,1000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const [x,y,r]=geometry;
  const minutes=now.getUTCMinutes()+now.getUTCSeconds()/60;
  const hours=(now.getUTCHours()+8)%12+minutes/60;
  return <time className="wall-clock" style={box([x-r,y-r,r*2,r*2])} aria-label={`北京时间 ${(now.getUTCHours()+8)%24}时${now.getUTCMinutes()}分`}>
    <i style={{transform:`rotate(${hours*30}deg)`}}/><i style={{transform:`rotate(${minutes*6}deg)`}}/>
    <i className="second-hand" style={{transform:`rotate(${now.getUTCSeconds()*6}deg)`}}/>
  </time>;
}

export function IllustratedTV({skin,state,actions,children,onManage,settingsOpen}:SkinProps & {skin:IllustratedSkin;settingsOpen:boolean;onManage?:()=>void}){
  const [viewport,setViewport]=useState<[number,number]>(()=>[window.innerWidth,window.innerHeight]);
  useEffect(()=>{
    const resize=()=>setViewport([window.innerWidth,window.innerHeight]);
    window.addEventListener('resize',resize);
    return ()=>window.removeEventListener('resize',resize);
  },[]);
  const [width,height]=viewport;
  const narrow=height>width;
  const art=narrow?skin.stacked:skin.side;
  const fit=fitScene(art,width,height);
  const selected=state.channels.find(c=>c.id===state.channelId);
  const channelIndex=Math.max(0,state.channels.findIndex(c=>c.id===state.channelId));
  const limited=state.schedule.kind==='AIR'&&state.schedule.target.program.sourceType==='bilibili';
  const volume=Math.round(state.volume*100);
  const volumeLabel=volume===0?'静音':`${volume}%`;
  const sceneStyle={
    '--art':`url("${import.meta.env.BASE_URL}${art.asset}")`,
    '--art-size':`${art.width}px ${art.height}px`,

  } as CSSProperties;
  return <section className="illustrated-set" data-layout={narrow?'stacked':'side'} style={sceneStyle} data-testid="television" data-powered={state.powered}>
    <div className="scene-painting" aria-hidden="true" style={{borderImageSlice:fit.slices+' fill',borderImageWidth:fit.borders}}/>
    <div className="scene-controls" style={{left:fit.left,top:fit.top,width:art.width,height:art.height,transform:`scale(${fit.scale})`}}>
    <WallClock geometry={art.clock}/>
    <div className="painted-screen" style={{...box(art.screen),borderRadius:art.screenRadius}} data-testid="screen">
      {state.powered&&<div className="screen-content" key={state.channelId}>
        {state.schedule.kind==='AIR'?children:<NoSignal empty={state.channels.length===0}/>}
        <div className="screen-channel" aria-hidden="true">{String(selected?.number??0).padStart(2,'0')}</div>
        <div className="screen-scanlines" aria-hidden="true"/><div className="glass-reflection" aria-hidden="true"/>
      </div>}
    </div>
    <aside aria-label="电视机控制面板">
      <div className="painted-dial" style={dial(art.channel)} title="频道旋钮">
        <Knob wrap label="频道旋钮" min={1} max={Math.max(1,state.channels.length)} step={1} value={channelIndex+1}
          valueText={selected?`${selected.number}台 ${selected.name}`:'无频道'} className="channel-knob"
          onChange={n=>{const channel=state.channels[n-1];if(channel)actions.selectChannel(channel.id);}}/>
      </div>
      <div className="painted-dial" style={{...dial(art.volume),'--indicator-angle':`${art.volumeArc[0]+(art.volumeArc[1]-art.volumeArc[0])*state.volume}deg`} as CSSProperties} title={limited?'B站请使用视频内或系统音量':'音量旋钮'}>
        <Knob disabled={limited} label="音量旋钮" min={0} max={100} step={5} value={volume}
          valueText={volumeLabel} className="volume-knob" onChange={n=>actions.setVolume(n/100)}/>
      </div>
      <button className="painted-settings" style={box(art.settings)} onClick={onManage} aria-label="打开频道设置" title="设置" aria-haspopup="dialog" aria-expanded={settingsOpen}/>
      <button className="painted-power" style={box(art.power)} aria-label="电视电源" aria-pressed={state.powered} title="电视电源" onClick={actions.togglePower}/>
    </aside>
    </div>
  </section>;
}
