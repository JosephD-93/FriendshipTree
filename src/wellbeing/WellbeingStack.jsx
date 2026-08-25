import React,{useMemo,useState}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";
import{DOMAIN_ANGLES,projectNodeToStack}from"./geometry";

const DOMAIN={mind:{rgb:[139,92,246]},body:{rgb:[34,197,94]},soul:{rgb:[245,158,11]}};
const rgb=a=>`rgb(${a.map(Math.round).join(",")})`;
const mix=ids=>{const cs=ids.map(id=>DOMAIN[id]?.rgb).filter(Boolean);return rgb([0,1,2].map(i=>cs.reduce((s,c)=>s+c[i],0)/cs.length))};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const START=DOMAIN_ANGLES.mind,SPAN=Math.PI*2;

export default function WellbeingStack(){
 const [angle,setAngle]=useState(START);
 const layout=useMemo(()=>WELLBEING_NODES.map((node,i)=>({...node,_i:i,...projectNodeToStack(node,angle)})).filter(n=>n.visible),[angle]);
 const domainDelta=d=>Math.abs(projectNodeToStack({primaryDomain:d.id,secondaryDomains:[]},angle).delta);
 const nearest=WELLBEING_DOMAINS.slice().sort((a,b)=>domainDelta(a)-domainDelta(b))[0],active=DOMAIN[nearest.id];
 const onScroll=e=>{const el=e.currentTarget,max=Math.max(1,el.scrollHeight-el.clientHeight);setAngle(START+(el.scrollTop/max)*SPAN)};
 return <section style={{padding:"8px 8px 110px",maxWidth:760,margin:"0 auto",overflow:"hidden"}}>
  <div style={{textAlign:"center",fontWeight:900,fontSize:19,margin:"4px 0 2px"}}>{nearest.label}</div>
  <div style={{textAlign:"center",fontSize:11,opacity:.5,marginBottom:8}}>Swipe up or down around the ecosystem</div>
  <div onScroll={onScroll} style={{height:"72vh",minHeight:440,overflowY:"auto",overscrollBehavior:"contain",touchAction:"pan-y",scrollbarWidth:"none",position:"relative"}}>
   <div style={{height:"260vh"}}/>
   <div style={{position:"sticky",top:0,height:"72vh",minHeight:440,marginTop:"-260vh",pointerEvents:"none"}}>
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}><path d="M 49 0 Q 46.5 50 49 100" fill="none" stroke={rgb(active.rgb)} strokeWidth="1.2" strokeOpacity=".48" vectorEffect="non-scaling-stroke"/></svg>
    <div style={{position:"absolute",left:"49%",top:"48%",transform:"translate(-50%,-50%)"}}><Node label={nearest.label} colour={rgb(active.rgb)} size={70} strong/></div>
    {layout.map(node=>{const influences=[node.primaryDomain,...(node.secondaryDomains||[])],colour=mix(influences),shared=influences.length>1;
     // Horizontal branch side is stable. Sharing only changes vertical travel speed.
     const side=node._i%2?1:-1,x=49+side*(shared?34:38),verticalScale=shared?18*node.parallax:24,laneOffset=((Math.floor(node._i/2)%3)-1)*7,y=clamp(50+node.delta*verticalScale+laneOffset,6,94);
     return <React.Fragment key={node.id}><svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}><path d={`M 49 ${y} Q ${49+side*8} ${y}, ${x} ${y}`} fill="none" stroke={colour} strokeWidth={shared?"1.15":".8"} strokeOpacity={shared?".7":".46"} vectorEffect="non-scaling-stroke"/></svg><div style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",transition:"top .08s linear"}}><Node label={node.label} colour={colour} size={shared?55:49} shared={shared}/></div></React.Fragment>})}
   </div>
  </div>
  <div style={{textAlign:"center",fontSize:11,opacity:.48,padding:"8px 14px"}}>Shared nodes stay on their branch side and lag vertically, remaining visible as one connected section gives way to another.</div>
 </section>;
}
function Node({label,colour,size,strong,shared}){return <div style={{position:"relative",width:size,height:size,borderRadius:"50%",display:"grid",placeItems:"center",padding:5,textAlign:"center",background:`radial-gradient(circle at 35% 28%,rgba(255,255,255,.3),transparent 34%),${colour}`,border:strong?"3px solid rgba(255,255,255,.82)":"2px solid rgba(255,255,255,.5)",boxShadow:strong?`0 0 22px ${colour}88`:`0 3px 10px rgba(0,0,0,.3),0 0 8px ${colour}55`,color:"white",fontWeight:strong?900:750,fontSize:strong?15:9.5,lineHeight:1.05,textShadow:"0 1px 2px #0008"}}>{label}{shared&&<span style={{position:"absolute",right:2,bottom:2,width:7,height:7,borderRadius:"50%",background:"#fff"}}/>}</div>}
