import {useEffect,useRef,type CSSProperties} from 'react';
interface Props {label:string;value:number;min:number;max:number;step:number;valueText:string;onChange(value:number):void;className?:string;wrap?:boolean;disabled?:boolean}
export function Knob({label,value,min,max,step,valueText,onChange,className='',wrap=false,disabled=false}:Props){
  const ref=useRef<HTMLDivElement>(null);
  const current=useRef({value,onChange});current.current={value,onChange};
  const drag=useRef<{y:number;value:number;id:number;moved:boolean}|null>(null);
  const clamp=(v:number)=>Math.max(min,Math.min(max,Math.round((v-min)/step)*step+min));
  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();if(disabled||event.deltaY===0)return;
      current.current.onChange(Math.max(min,Math.min(max,current.current.value+(event.deltaY>0?-step:step))));
    };
    node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);
  },[min,max,step,disabled]);
  const ratio=max===min?0:(value-min)/(max-min);
  return <div className={`knob-unit ${className}`}>
    <div className="knob-scale" aria-hidden="true"><span>−</span><span>＋</span></div>
    <div ref={ref} className="knob" role="slider" tabIndex={0} aria-label={label} aria-disabled={disabled} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={valueText} aria-describedby="knob-instructions"
      style={{'--rotation':`${-135+ratio*270}deg`} as CSSProperties}
      onKeyDown={event=>{
        if(disabled)return;const delta=['ArrowRight','ArrowUp'].includes(event.key)?step:['ArrowLeft','ArrowDown'].includes(event.key)?-step:0;
        if(delta||['Home','End','PageUp','PageDown'].includes(event.key)){
          event.preventDefault();onChange(clamp(event.key==='Home'?min:event.key==='End'?max:value+(event.key==='PageUp'?step*5:event.key==='PageDown'?-step*5:delta)));
        }
      }}
      onPointerDown={event=>{if(disabled||event.button!==0)return;event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);drag.current={y:event.clientY,value,id:event.pointerId,moved:false};}}
      onPointerMove={event=>{const d=drag.current;if(!d||d.id!==event.pointerId)return;const pixels=d.y-event.clientY;if(Math.abs(pixels)>3)d.moved=true;if(d.moved)onChange(clamp(d.value+Math.round(pixels/(className==='channel-knob'?22:4))*step));}}
      onPointerUp={event=>{const d=drag.current;if(!d||d.id!==event.pointerId)return;if(!d.moved)onChange(wrap&&value>=max?min:clamp(value+step));drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
      onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
      <div className="knob-face"><span className="knob-indicator"/><span className="knob-center"/></div>
    </div>
  </div>;
}
