export const BAND_NAMES=["Very Low","Low","Good","Great","High","Very High"];
export const DIMENSIONS=[
  ["social","Social","#22C55E"],["health","Health","#EF4444"],["mind","Mind","#14B8A6"],
  ["knowledge","Knowledge","#3B82F6"],["creativity","Creativity","#9333EA"],["growth","Growth","#F97316"],
  ["purpose","Purpose","#EAB308"],["rest","Rest","#06B6D4"],["security","Security","#64748B"]
];
export const CENTER={x:220,y:210};
export const INNER_RADIUS=26;
export const BAND_WIDTH=22;
export const OUTER_RADIUS=INNER_RADIUS+6*BAND_WIDTH;
export const BOUNDARIES=Array.from({length:7},(_,i)=>INNER_RADIUS+i*BAND_WIDTH);
// Position is a continuous visual coordinate supplied by the caller, not a health score.
// No implicit conversion from activity totals, weekly targets or dimension health.
export function locate(position,index){
  if(!Number.isFinite(position)||position<0||position>6)return null;
  const angle=-Math.PI/2+index*2*Math.PI/DIMENSIONS.length;
  const radius=INNER_RADIUS+position*BAND_WIDTH;
  const tier=Math.min(5,Math.floor(position));
  return {x:CENTER.x+Math.cos(angle)*radius,y:CENTER.y+Math.sin(angle)*radius,radius,angle,tier};
}
export function gradientOpacity(radius){
  const start=BOUNDARIES[2],end=BOUNDARIES[4],peak=BOUNDARIES[3];
  if(radius<=start||radius>=end)return 0;
  return .5-.5*Math.cos(Math.PI*(radius-start)/(peak-start));
}
export const EXAMPLE_POSITIONS={social:3.25,health:4.5,mind:2.5,knowledge:3.4,creativity:5.6,growth:2.8,purpose:3.6,rest:.7,security:1.7};
