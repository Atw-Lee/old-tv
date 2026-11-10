import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import type {Scene} from './layout.js';
import {PropPainting} from './PropPainting.js';
import './keepsakes.css';

function ContactCard(){
  const [missing,setMissing]=useState(false);
  const ink=useId();
  if(missing)return <span className="receipt-placeholder">微信二维码暂未加载</span>;
  // Crop the original WeChat card in source pixels. Use luminance as inverse
  // alpha so the original QR modules remain intact against the painted wall.
  return <svg className="contact-code" viewBox="90 188 708 708" role="img" aria-label="个人微信二维码">
    <defs><filter id={ink} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 1 0"/>
    </filter></defs>
    <image width="888" height="888" href={import.meta.env.BASE_URL+'sponsor/wechat-contact.jpg'}
      filter={`url(#${ink})`} onError={()=>setMissing(true)}/>
  </svg>;
}

export function RoomKeepsakes({art,children}:{art:Scene;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!open)return;
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!dialog.current?.open)setOpen(false);};
    window.addEventListener('keydown',escape);
    return ()=>window.removeEventListener('keydown',escape);
  },[open]);
  const [cx,cy,r]=art.clock;
  const [left,top,width,height]=art.clockArt.bounds;
  const [dialX,dialY,rimX,rimY]=art.clockArt.ellipse;
  const style={left,top,width,height,'--hand-x':(cx-r-left)+'px','--hand-y':(cy-r-top)+'px',
    '--dial-clip':`ellipse(${rimX*.87}px ${rimY*.87}px at ${dialX}px ${dialY}px)`,
    '--pivot':`${dialX}px ${dialY}px`,
  } as CSSProperties;
  const dial=useRef<HTMLSpanElement>(null);
  const face=useRef<HTMLSpanElement>(null);
  function wobble(){
    if(open||!dial.current||face.current?.getAnimations().length)return;
    dial.current.animate([
      {opacity:1,transform:'rotate(0deg)'},
      {opacity:1,transform:'rotate(2deg)',offset:.25},
      {opacity:1,transform:'rotate(-1.5deg)',offset:.7},
      {opacity:1,transform:'rotate(0deg)'},
    ],{duration:480,easing:'ease-in-out'});
  }
  return <><div style={style} className="keepsake clock" data-open={open}>
      <PropPainting art={art} backdrop/>
      <button type="button" className="keepsake-toggle" aria-expanded={open} aria-label="移开挂钟"
        onPointerEnter={e=>{if(e.pointerType==='mouse')wobble();}} onClick={()=>setOpen(!open)}>
        <span className="keepsake-face" ref={face}>
          <PropPainting art={art}/>
          <span className="clock-dial-clip"><span className="clock-dial-hover" ref={dial}><PropPainting art={art}/></span></span>
          <span className="clock-hands">{children}</span>
        </span>
      </button>
      {open&&<button className="keepsake-receipt" aria-label="放大个人微信二维码" onClick={()=>dialog.current?.showModal()}><ContactCard/></button>}
    </div>
  <dialog ref={dialog} className="receipt-dialog" aria-label="个人微信二维码" onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
    {open&&<div><ContactCard/><button onClick={()=>dialog.current?.close()}>收起</button></div>}
  </dialog></>;
}
