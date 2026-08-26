import React,{useMemo,useState}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";
import{DOMAIN_ANGLES,projectNodeToStack}from"./geometry";

const DOMAIN={mind:{rgb:[139,92,246]},body:{rgb:[34,197,94]},soul:{rgb:[245,158,11]}};
const rgb=a=>`rgb(${a.map(Math.round).join(",")})`;
const mix=ids=>{const cs=ids.map(id=>DOMAIN[id]?.rgb).filter(Boolean);return rgb([0,1,2].map(i=>cs.reduce((s,c)=>s+c[i],0)/cs.length))};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const START=DOMAIN_ANGLES.mind,SPAN=Math.PI*2;
const ORBITS=[28,48,68,87];
const MIN_GAP=15;
const CIRCLE_CY=50,CIRCLE_R=76,CIRCLE_CX=-Math.sqrt(CIRCLE_R*CIRCLE_R-CIRCLE_CY*CIRCLE_CY);

function circleX(y){const dy=y-CIRCLE_CY;return CIRCLE_CX+Math.sqrt(Math.max(0,CIRCLE_R*CIRCLE_R-dy*dy))}
function stableLane(node,i){
 const shared=(node.secondaryDomains?.length||0)>0;
 if(shared)return 1+(i%2);
 return i%ORBITS.length;
}
function placeStable(nodes){
 const grouped=ORBITS.map(()=>[]);
 nodes.forEach((node,i)=>{const lane=stableLane(node,node._i??i);const desired=clamp(50+node.delta*(node.secondaryDomains?.length?13*node.parallax:18),9,91);grouped[lane].push({...node,lane,desired})});
 const placed=[];
 grouped.forEach(items=>{
  items.sort((a,b)=>a.desired-b.desired);
  let prev=-999;
  items.forEach(item=>{item.y=Math.max(item.desired,prev+MIN_GAP);prev=item.y});
  if(items.length&&items[items.length-1].y>91){const shift=items[items.length-1].y-91;items.forEach(item=>item.y-=shift)}
  if(items.length&&items[0].y<9){const shift=9-items[0].y;items.forEach(item=>item.y+=shift)}
  for(let i=items.length-2;i>=0;i--)items[i].y=Math.min(items[i].y,items[i+1].y-MIN_GAP);
  items.forEach(item=>{item.y=clamp(item.y,9,91);placed.push(item)});
 });
 return placed;
}

export default function WellbeingStack(){
 const [angle,setAngle]=useState(START);
 const layout=useMemo(()=>placeStable(WELLBEING_NODES.map((node,i)=>({...node,_i:i,...projectNodeToStack(node,angle)})).filter(n=>n.visible)),[angle]);
 const domainDelta=d=>Math.abs(projectNodeToStack({primaryDomain:d.id,secondaryDomains:[]},angle).delta);
 const nearest=WELLBEING_DOMAINS.slice().sort((a,b)=>domainDelta(a)-domainDelta(b))[0],active=DOMAIN[nearest.id];
 const onScroll=e=>{const el=e.currentTarget,max=Math.max(1,el.scrollHeight-el.clientHeight);setAngle(START+(el.scrollTop/max)*SPAN)};
 return <section style={{padding:"2px 4px 110px",maxWidth:760,margin:"0 auto",overflow:"hidden"}}>
  <div style={{height:8}}/>
  <div onScroll={onScroll} style={{height:"82vh",minHeight:500,overflowY:"auto",overscrollBehavior:"contain",touchAction:"pan-y",scrollbarWidth:"none",position:"relative"}}>
   <div style={{height:"360vh"}}/>
   <div style={{position:"sticky",top:0,height:"82vh",minHeight:500,marginTop:"-360vh",pointerEvents:"none"}}>
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"hidden"}}>
     <defs><path id="wellbeing-active-perimeter" d={`M 0 0 A ${CIRCLE_R} ${CIRCLE_R} 0 0 1 0 100`}/></defs>
     <circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_R} fill="none" stroke={rgb(active.rgb)} strokeWidth="12" strokeOpacity=".84" vectorEffect="non-scaling-stroke"/>
     <text fill="white" fontSize="4.7" fontWeight="900" letterSpacing=".28" dy="-1.1" style={{paintOrder:"stroke",stroke:"rgba(7,16,31,.72)",strokeWidth:"1.1px",textShadow:"0 1px 2px rgba(0,0,0,.7)"}}><textPath href="#wellbeing-active-perimeter" startOffset="50%" textAnchor="middle">{nearest.label.toUpperCase()}</textPath></text>
     {ORBITS.map((x,i)=><path key={i} d={`M ${x} 0 Q ${x+2} 50 ${x} 100`} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth=".5" strokeDasharray="1.5 4" vectorEffect="non-scaling-stroke"/>)}
    </svg>
    {layout.map(node=>{const influences=[node.primaryDomain,...(node.secondaryDomains||[])],colour=mix(influences),shared=influences.length>1,x=ORBITS[node.lane],anchorX=circleX(node.y),fade=clamp(.3+(node.proximity||0)*1.15,.35,1);
     return <React.Fragment key={node.id}><svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible",opacity:fade}}><path d={`M ${anchorX} ${node.y} C ${anchorX+8} ${node.y}, ${x-10} ${node.y}, ${x} ${node.y}`} fill="none" stroke={colour} strokeWidth={shared?"1.3":"1"} strokeOpacity={shared?".78":".58"} vectorEffect="non-scaling-stroke"/></svg><div style={{position:"absolute",left:`${x}%`,top:`${node.y}%`,transform:"translate(-50%,-50%)",zIndex:3,opacity:fade}}><Node label={node.label} colour={colour} size={shared?82:76}/></div></React.Fragment>})}
   </div>
  </div>
 </section>;
}
function Node({label,colour,size,strong}){return <div style={{position:"relative",width:size,height:size,borderRadius:"50%",display:"grid",placeItems:"center",boxSizing:"border-box",padding:9,textAlign:"center",background:`radial-gradient(circle at 35% 28%,rgba(255,255,255,.3),transparent 34%),${colour}`,border:strong?"3px solid rgba(255,255,255,.82)":"2px solid rgba(255,255,255,.5)",boxShadow:strong?`0 0 22px ${colour}88`:`0 3px 10px rgba(0,0,0,.3),0 0 8px ${colour}55`,color:"white",fontWeight:strong?900:760,fontSize:strong?15:10.6,lineHeight:1.08,textShadow:"0 1px 2px #0008",overflowWrap:"break-word",wordBreak:"normal"}}>{label}</div>}
