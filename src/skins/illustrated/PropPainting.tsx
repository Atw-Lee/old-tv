import {useId} from 'react';
import type {Scene} from './layout.js';

export function PropPainting({art,backdrop}:{art:Scene;backdrop?:boolean}){
  const id=useId().replace(/:/g,'');
  const [x,y,w,h]=art.clockArt.bounds;
  const [cx,cy,rx,ry]=art.clockArt.ellipse;
  // Mirror the clear strip at the right edge of the painting. Sampling at
  // the clock's own height avoids carrying the television's shadow up the wall.
  const stripWidth=art.clockArt.wallStripWidth;
  const sampleX=art.width-stripWidth-x;
  const painting=<image href={import.meta.env.BASE_URL+art.asset} x={-x} y={-y} width={art.width} height={art.height}/>;
  return <svg aria-hidden="true" className="prop-paint" viewBox={`0 0 ${w} ${h}`}>
    {backdrop?<><defs>
      <pattern id={id+'-plaster'} patternUnits="userSpaceOnUse" width={stripWidth*2} height={h}>
        <svg width={stripWidth} height={h} viewBox={`${sampleX} 0 ${stripWidth} ${h}`}>{painting}</svg>
        <g transform={`translate(${stripWidth*2} 0) scale(-1 1)`}>
          <svg width={stripWidth} height={h} viewBox={`${sampleX} 0 ${stripWidth} ${h}`}>{painting}</svg>
        </g>
      </pattern>
      <filter id={id+'-soft'} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
      <mask id={id+'-wall'}><ellipse cx={cx+5} cy={cy+6} rx={rx+22} ry={ry+23} fill="white" filter={`url(#${id}-soft)`}/></mask>
    </defs><rect width={w} height={h} fill={`url(#${id}-plaster)`} mask={`url(#${id}-wall)`}/></>
    :<><defs><clipPath id={id}><ellipse cx={cx} cy={cy} rx={rx} ry={ry}/></clipPath></defs><g clipPath={`url(#${id})`}>{painting}</g></>}
  </svg>;
}
