import React,{useId} from "react";
import {BAND_NAMES,DIMENSIONS,CENTER,BOUNDARIES,OUTER_RADIUS,locate,gradientOpacity} from "./balanceGeometry.js";
function Marker({tier,color,background}){
  if(tier===0)return <g fill="none" stroke={color} strokeLinecap="round" strokeWidth="1.8"><path d="M-2.1 -6.66 A7 7 0 1 0 2.1 -6.66"/><path d="M0 -10.5V-2.5" strokeWidth="2.2"/><circle cy="1.3" r="1.5" fill={color} stroke="none"/></g>;
  if(tier===5)return <g><circle r="7" fill={color}/><rect x="-2" y="-10.5" width="4" height="9" rx="2" fill={color}/><path d="M0 -9V-2" stroke={background} strokeWidth="2" strokeLinecap="round"/><circle cy="1.5" r="1.35" fill={background}/></g>;
  return <g><circle r="7" stroke={color} strokeWidth="1.3" fill="none"/>{tier===1?<circle r="5.4" stroke={color} strokeWidth="1.15" fill="none"/>:<circle r={tier===4?5.6:4.15} fill={color}/>}</g>;
}
export default function BalanceWheel({positions,score,palette,colors={},onSelect}){
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const p=palette;
  const {x:cx,y:cy}=CENTER;
  const points=DIMENSIONS.map(([key,label,color],index)=>({key,label,color:colors[key]||color,point:locate(positions?.[key],index),angle:-Math.PI/2+index*2*Math.PI/DIMENSIONS.length}));
  const valid=points.filter(d=>d.point);
  const all=valid.length===DIMENSIONS.length;
  const stops=[0,...Array.from({length:45},(_,i)=>BOUNDARIES[2]+i),OUTER_RADIUS];
  return <div style={{maxWidth:660,margin:"0 auto",background:p.background,color:p.text,borderRadius:14,padding:4}}>
    <svg viewBox="0 0 440 420" width="100%" style={{display:"block",maxHeight:"68vh"}} role="img" aria-label="Life balance wheel">
      <defs><radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={OUTER_RADIUS}>{stops.map(r=><stop key={r} offset={r/OUTER_RADIUS} stopColor="#83C6A2" stopOpacity={.35*gradientOpacity(r)}/>)}</radialGradient></defs>
      <circle cx={cx} cy={cy} r={OUTER_RADIUS} fill={`url(#${id})`}/>
      {BOUNDARIES.map(r=><circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={p.muted} strokeWidth=".7" opacity=".18"/>)}
      {all&&<polygon points={valid.map(({point})=>`${point.x},${point.y}`).join(" ")} fill={p.text} fillOpacity=".035" stroke={p.muted} strokeWidth="1.5" strokeLinejoin="round"/>}
      {points.map(d=><g key={d.key}>
        {d.point&&<g transform={`translate(${d.point.x} ${d.point.y})`}><circle r="9.5" fill={p.background}/><Marker tier={d.point.tier} color={d.color} background={p.background}/><title>{d.label}: {BAND_NAMES[d.point.tier]}</title></g>}
        <text x={cx+Math.cos(d.angle)*185} y={cy+4+Math.sin(d.angle)*185} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={p.text}>{d.label}</text>
      </g>)}
      <text x={cx} y={cy+13} textAnchor="middle" fontSize="40" fontWeight="700" fill="#C69A35">{Number.isFinite(score)?Math.round(score):"—"}</text>
    </svg>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:4}}>
      {points.map(d=><button key={d.key} type="button" disabled={!onSelect} onClick={()=>onSelect?.(d.key)} style={{border:"none",background:"transparent",color:p.text,minHeight:44,padding:4,fontSize:11,display:"flex",alignItems:"center",gap:4,textAlign:"left",cursor:onSelect?"pointer":"default"}}><svg viewBox="-13 -14 26 26" width="22" height="22" style={{flexShrink:0}}>{d.point&&<Marker tier={d.point.tier} color={d.color} background={p.background}/>}</svg><span>{d.label}<br/><span style={{color:p.muted}}>{d.point?BAND_NAMES[d.point.tier]:"No data"}</span></span></button>)}
    </div>
    <svg viewBox="0 0 360 59" width="100%" role="img" aria-label="Six tier legend">{BAND_NAMES.map((name,tier)=><g key={name} transform={`translate(${30+tier*60} 23)`}><Marker tier={tier} color={p.accent} background={p.background}/><text y="27" textAnchor="middle" fontSize="9" fill={p.text}>{name}</text></g>)}</svg>
  </div>;
}
