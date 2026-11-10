// All measurements are in original artwork pixels. The frame encloses the
// undistorted part of the painting, including every interactive control.
type Rect = readonly [left:number, top:number, width:number, height:number];
type Dial = readonly [centerX:number, centerY:number, diameter:number];
export interface Scene {
  asset:string;
  width:number;
  height:number;
  frame:Rect;
  screen:Rect;
  screenPath:string;
  channel:Dial;
  volume:Dial;
  volumeArc:readonly [startDegrees:number, endDegrees:number];
  settings:Rect;
  power:Rect;
  clockArt:{bounds:Rect;ellipse:Rect;wallStripWidth:number};
  clock:readonly [centerX:number, centerY:number, radius:number];
}
export interface IllustratedSkin { side:Scene; stacked:Scene }

export function fitScene(scene:Scene, width:number, height:number) {
  const [left,top,frameWidth,frameHeight]=scene.frame;
  const right=scene.width-left-frameWidth;
  const bottom=scene.height-top-frameHeight;
  const cover=Math.max(width/scene.width,height/scene.height);
  const scale=Math.min(cover,width/frameWidth,height/frameHeight);
  const spareX=Math.max(0,width-frameWidth*scale);
  const spareY=Math.max(0,height-frameHeight*scale);
  // Distribute the remaining canvas between the painted margins. Nine-slice
  // rendering extends or compresses only scenery outside the protected frame.
  const x=spareX*left/(left+right||1);
  const y=spareY*top/(top+bottom||1);
  return {
    scale, left:x-left*scale, top:y-top*scale,
    slices:[top,right,bottom,left].join(' '),
    borders:[y,spareX-x,spareY-y,x].map(n=>n+'px').join(' '),
  };
}
