import React,{useMemo}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";

const DOMAIN={
 mind:{icon:"◌",rgb:[139,92,246]},
 body:{icon:"♥",rgb:[34,197,94]},
 soul:{icon:"✦",rgb:[245,158,11]},
};
const rgb=a=>`rgb(${a.map(Math.round).join(",")})`;
const mix=ids=>{
 const colours=ids.map(id=>DOMAIN[id]?.rgb).filter(Boolean);
 if(!colours.length)return"rgb(100,116,139)";
 return rgb([0,1,2].map(i=>colours.reduce((s,c)=>s+c[i],0)/colours.length));
};
const tint=(c,f=.72)=>rgb(c.map(v=>v+(255-v)*f));

export default function WellbeingStack(){
 const groups=useMemo(()=>Object.fromEntries(WELLBEING_DOMAINS.map(d=>[d.id,WELLBEING_NODES.filter(n=>n.primaryDomain===d.id)])),[]);
 return <section style={{padding:"8px 8px 110px",maxWidth:760,margin:"0 auto",overflow:"hidden"}}>
  <div style={{display:"flex",justifyContent:"center",padding:"8px 0 22px"}}><Node label="You" colour="#e2e8f0" size={62}/></div>
  {WELLBEING_DOMAINS.map((domain,index)=>{
   const d=DOMAIN[domain.id],nodes=groups[domain.id];
   return <div key={domain.id} style={{position:"relative",paddingBottom:index===2?4:30}}>
    <div style={{position:"absolute",left:"50%",top:-22,bottom:0,width:3,transform:"translateX(-50%)",background:`linear-gradient(${rgb(d.rgb)},${rgb(d.rgb)}22)`,borderRadius:4}}/>
    <div style={{position:"relative",display:"flex",justifyContent:"center",marginBottom:20}}>
     <Node label={domain.label} icon={d.icon} colour={rgb(d.rgb)} size={74} strong/>
    </div>
    <div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",columnGap:8,rowGap:24,padding:"0 4px"}}>
     {nodes.map((node,i)=>{
      const influences=[node.primaryDomain,...(node.secondaryDomains||[])];
      const colour=mix(influences);
      const pure=influences.length===1;
      const x=(i%3)*50+25;
      return <div key={node.id} style={{position:"relative",minWidth:0,display:"flex",justifyContent:"center"}}>
       <svg aria-hidden="true" style={{position:"absolute",width:"100%",height:42,top:-25,left:0,overflow:"visible",pointerEvents:"none"}} viewBox="0 0 100 42" preserveAspectRatio="none">
        <path d={`M 50 42 C 50 18, ${50+(x-50)*.18} 16, 50 0`} fill="none" stroke={colour} strokeOpacity=".48" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>
       </svg>
       <Node label={node.label} colour={pure?tint(d.rgb,.25):colour} shared={!pure} size={56}/>
      </div>})}
    </div>
   </div>})}
  <div style={{textAlign:"center",fontSize:11,opacity:.48,padding:"18px 18px 0"}}>Shared colours show where a branch draws from more than one part of wellbeing. Growth states and evidence will be layered onto these nodes next.</div>
 </section>;
}

function Node({label,icon,colour,size=56,strong=false,shared=false}){
 return <div title={shared?"Shared across wellbeing domains":undefined} style={{position:"relative",zIndex:1,width:size,height:size,borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:5,textAlign:"center",background:`radial-gradient(circle at 35% 28%,rgba(255,255,255,.28),transparent 34%),${colour}`,border:strong?"3px solid rgba(255,255,255,.82)":"2px solid rgba(255,255,255,.48)",boxShadow:strong?`0 0 22px ${colour}88`:`0 4px 12px rgba(0,0,0,.28),0 0 10px ${colour}44`,color:"white",fontWeight:strong?900:750,fontSize:strong?15:10,lineHeight:1.05,textShadow:"0 1px 2px rgba(0,0,0,.55)"}}>
  {icon&&<span style={{fontSize:18,lineHeight:1,marginBottom:3}}>{icon}</span>}<span>{label}</span>
  {shared&&<span style={{position:"absolute",right:2,bottom:2,width:9,height:9,borderRadius:"50%",background:"rgba(255,255,255,.82)",border:"1px solid rgba(15,23,42,.6)"}}/>}
 </div>;
}
