import React,{useMemo,useState}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";
import{DOMAIN_ANGLES,projectNodeToStack}from"./geometry";

const DOMAIN={mind:{rgb:[139,92,246]},body:{rgb:[34,197,94]},soul:{rgb:[245,158,11]}};
const rgb=a=>`rgb(${a.map(Math.round).join(",")})`;
const mix=ids=>{const cs=ids.map(id=>DOMAIN[id]?.rgb).filter(Boolean);return rgb([0,1,2].map(i=>cs.reduce((s,c)=>s+c[i],0)/cs.length))};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const START=DOMAIN_ANGLES.mind,SPAN=Math.PI*2;
const ORBITS=[28,52,76];
const MIN_GAP=15;

function placeWithoutOverlap(nodes){
 const lanes=[[],[],[]];
 return nodes.sort((a,b)=>a.delta-b.delta).map((node,i)=>{
  const preferred=(node.secondaryDomains?.length||0)>0?1:(i%3);
  let lane=preferred;
  const desired=50+node.delta*(node.secondaryDomains?.length?15*node.parallax:21);
  const candidates=[preferred,(preferred+1)%3,(preferred+2)%3];
  for(const c of candidates){const last=lanes[c][lanes[c].length-1];if(last==null||Math.abs(desired-last)>=MIN_GAP){lane=c;break}}
  const last=lanes[lane][lanes[lane].length-1];
  const y=clamp(last==null?desired:Math.max(desired,last+MIN_GAP),8,92);
  lanes[lane].push(y); return{...node,lane,y};
 });
}

export default function WellbeingStack(){
 const [angle,setAngle]=useState(START);
 const layout=useMemo(()=>placeWithoutOverlap(WELLBEING_NODES.map((node,i)=>({...node,_i:i,...projectNodeToStack(node,angle)})).filter(n=>n.visible)),[angle]);
 const domainDelta=d=>Math.abs(projectNodeToStack({primaryDomain:d.id,secondaryDomains:[]},angle).delta);
 const nearest=WELLBEING_DOMAINS.slice().sort((a,b)=>domainDelta(a)-domainDelta(b))[0],active=DOMAIN[nearest.id];
 const onScroll=e=>{const el=e.currentTarget,max=Math.max(1,el.scrollHeight-el.clientHeight);setAngle(START+(el.scrollTop/max)*SPAN)};
 return <section style={{padding:"2px 4px 110px",maxWidth:760,margin:"0 auto",overflow:"hidden"}}>
  <div style={{height:8}}/>
  <div onScroll={onScroll} style={{height:"82vh",minHeight:500,overflowY:"auto",overscrollBehavior:"contain",touchAction:"pan-y",scrollbarWidth:"none",position:"relative"}}>
   <div style={{height:"360vh"}}/>
   <div style={{position:"sticky",top:0,height:"82vh",minHeight:500,marginTop:"-360vh",pointerEvents:"none"}}>
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}>
     <defs><path id="wellbeing-active-perimeter" d="M 1 4 Q 7 50 1 96"/></defs>
     <path d="M 1 4 Q 7 50 1 96" fill="none" stroke={rgb(active.rgb)} strokeWidth="12" strokeOpacity=".82" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
     <text fill="white" fontSize="5.2" fontWeight="900" letterSpacing=".7" style={{textShadow:"0 1px 2px rgba(0,0,0,.65)"}}>
      <textPath href="#wellbeing-active-perimeter" startOffset="50%" textAnchor="middle">{nearest.label.toUpperCase()}</textPath>
     </text>
     {ORBITS.map((x,i)=><path key={i} d={`M ${x} 0 Q ${x+3} 50 ${x} 100`} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".65" strokeDasharray="2 3" vectorEffect="non-scaling-stroke"/>)}
    </svg>
    {layout.map(node=>{const influences=[node.primaryDomain,...(node.secondaryDomains||[])],colour=mix(influences),shared=influences.length>1,x=ORBITS[node.lane];const anchorX=6.2*(1-Math.pow((node.y-50)/50,2))+1;
     return <React.Fragment key={node.id}><svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}><path d={`M ${anchorX} ${node.y} C ${anchorX+7} ${node.y}, ${x-9} ${node.y}, ${x} ${node.y}`} fill="none" stroke={colour} strokeWidth={shared?"1.3":"1"} strokeOpacity={shared?".82":".62"} vectorEffect="non-scaling-stroke"/></svg><div style={{position:"absolute",left:`${x}%`,top:`${node.y}%`,transform:"translate(-50%,-50%)",zIndex:3}}><Node label={node.label} colour={colour} size={shared?74:68} shared={shared}/></div></React.Fragment>})}
   </div>
  </div>
 </section>;
}
function Node({label,colour,size,strong,shared}){return <div style={{position:"relative",width:size,height:size,borderRadius:"50%",display:"grid",placeItems:"center",padding:7,textAlign:"center",background:`radial-gradient(circle at 35% 28%,rgba(255,255,255,.3),transparent 34%),${colour}`,border:strong?"3px solid rgba(255,255,255,.82)":"2px solid rgba(255,255,255,.5)",boxShadow:strong?`0 0 22px ${colour}88`:`0 3px 10px rgba(0,0,0,.3),0 0 8px ${colour}55`,color:"white",fontWeight:strong?900:750,fontSize:strong?15:10.5,lineHeight:1.05,textShadow:"0 1px 2px #0008",overflowWrap:"anywhere"}}>{label}{shared&&<span style={{position:"absolute",right:3,bottom:3,width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}</div>}
