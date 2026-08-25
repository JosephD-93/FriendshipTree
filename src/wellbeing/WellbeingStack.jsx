import React,{useMemo,useState}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";
import{DOMAIN_ANGLES,projectNodeToStack}from"./geometry";

const DOMAIN={mind:{rgb:[139,92,246]},body:{rgb:[34,197,94]},soul:{rgb:[245,158,11]}};
const rgb=a=>`rgb(${a.map(Math.round).join(",")})`;
const mix=ids=>{const cs=ids.map(id=>DOMAIN[id]?.rgb).filter(Boolean);return rgb([0,1,2].map(i=>cs.reduce((s,c)=>s+c[i],0)/cs.length))};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export default function WellbeingStack(){
 const [angle,setAngle]=useState(DOMAIN_ANGLES.mind);
 const layout=useMemo(()=>WELLBEING_NODES.map(node=>({...node,...projectNodeToStack(node,angle)})).filter(n=>n.visible),[angle]);
 const nearest=WELLBEING_DOMAINS.slice().sort((a,b)=>Math.abs(DOMAIN_ANGLES[a.id]-angle)-Math.abs(DOMAIN_ANGLES[b.id]-angle))[0];
 const active=DOMAIN[nearest.id];
 return <section style={{padding:"8px 8px 110px",maxWidth:760,margin:"0 auto",overflow:"hidden",touchAction:"pan-y"}}>
  <div style={{textAlign:"center",fontWeight:900,fontSize:19,margin:"4px 0 2px"}}>{nearest.label}</div>
  <div style={{textAlign:"center",fontSize:11,opacity:.5,marginBottom:12}}>Scroll the ecosystem perimeter</div>
  <input aria-label="Rotate wellbeing ecosystem" type="range" min={-1.5708} max={4.7124} step={0.01} value={angle<-.01?angle:angle} onChange={e=>setAngle(Number(e.target.value))} style={{width:"100%",accentColor:rgb(active.rgb),marginBottom:10}}/>
  <div style={{height:"68vh",minHeight:430,position:"relative"}}>
   <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}}>
    <path d="M 49 0 Q 46 50 49 100" fill="none" stroke={rgb(active.rgb)} strokeWidth="1.4" strokeOpacity=".58" vectorEffect="non-scaling-stroke"/>
   </svg>
   <div style={{position:"absolute",left:"49%",top:"46%",transform:"translate(-50%,-50%)"}}><Node label={nearest.label} colour={rgb(active.rgb)} size={70} strong/></div>
   {layout.map((node,i)=>{
    const influences=[node.primaryDomain,...(node.secondaryDomains||[])];
    const colour=mix(influences);
    const side=i%2?1:-1;
    const y=clamp(50+node.delta*23+(i%4-1.5)*8,7,91);
    const distance=clamp(28+Math.abs(node.x)*18,28,46);
    const x=49+side*distance;
    const shared=influences.length>1;
    return <React.Fragment key={node.id}>
     <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible"}}><path d={`M 49 ${y} Q ${49+side*8} ${y}, ${x} ${y}`} fill="none" stroke={colour} strokeWidth={shared?"1.2":".85"} strokeOpacity={shared?".72":".48"} vectorEffect="non-scaling-stroke"/></svg>
     <div style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",transition:"left .16s linear,top .16s linear"}}><Node label={node.label} colour={colour} size={shared?55:49} shared={shared}/></div>
    </React.Fragment>})}
  </div>
  <div style={{textAlign:"center",fontSize:11,opacity:.48,padding:"8px 14px"}}>Shared nodes drift more slowly as the perimeter rotates, so they can remain visible while one parent section gives way to another.</div>
 </section>;
}
function Node({label,colour,size,strong,shared}){return <div style={{width:size,height:size,borderRadius:"50%",display:"grid",placeItems:"center",padding:5,textAlign:"center",background:`radial-gradient(circle at 35% 28%,rgba(255,255,255,.3),transparent 34%),${colour}`,border:strong?"3px solid rgba(255,255,255,.82)":"2px solid rgba(255,255,255,.5)",boxShadow:strong?`0 0 22px ${colour}88`:`0 3px 10px rgba(0,0,0,.3),0 0 8px ${colour}55`,color:"white",fontWeight:strong?900:750,fontSize:strong?15:9.5,lineHeight:1.05,textShadow:"0 1px 2px #0008"}}>{label}{shared&&<span style={{position:"absolute",width:7,height:7,borderRadius:"50%",background:"#fff",margin:"38px 0 0 38px"}}/>}</div>}
