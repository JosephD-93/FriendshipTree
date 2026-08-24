import React,{useMemo,useState}from"react";
import{WELLBEING_DOMAINS,WELLBEING_NODES}from"./model";

const DOMAIN_STYLE={
  mind:{icon:"◌",accent:"#8b5cf6",soft:"rgba(139,92,246,.12)"},
  body:{icon:"♥",accent:"#22c55e",soft:"rgba(34,197,94,.12)"},
  soul:{icon:"✦",accent:"#f59e0b",soft:"rgba(245,158,11,.12)"},
};

export default function WellbeingStack(){
  const [open,setOpen]=useState({mind:true,body:true,soul:true});
  const byDomain=useMemo(()=>Object.fromEntries(WELLBEING_DOMAINS.map(d=>[d.id,WELLBEING_NODES.filter(n=>n.primaryDomain===d.id)])),[]);
  return <section style={{padding:"12px 12px 96px",maxWidth:760,margin:"0 auto"}}>
    <div style={{textAlign:"center",padding:"8px 8px 18px"}}>
      <div style={{width:58,height:58,borderRadius:"50%",margin:"0 auto 8px",display:"grid",placeItems:"center",background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.22)",fontSize:24}}>You</div>
      <div style={{fontSize:12,opacity:.65}}>Mind · Body · Soul</div>
    </div>
    {WELLBEING_DOMAINS.map(domain=>{
      const s=DOMAIN_STYLE[domain.id]; const expanded=open[domain.id];
      return <div key={domain.id} style={{marginBottom:14,borderRadius:18,overflow:"hidden",border:`1px solid ${s.accent}55`,background:"rgba(15,23,42,.72)"}}>
        <button onClick={()=>setOpen(v=>({...v,[domain.id]:!v[domain.id]}))} style={{width:"100%",border:0,color:"inherit",background:s.soft,padding:"15px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
          <span style={{width:38,height:38,borderRadius:"50%",display:"grid",placeItems:"center",background:s.accent,color:"#fff",fontSize:19}}>{s.icon}</span>
          <span style={{flex:1}}><strong style={{display:"block",fontSize:18}}>{domain.label}</strong><span style={{fontSize:12,opacity:.68}}>{domain.description}</span></span>
          <span style={{fontSize:12,opacity:.65}}>Not enough data</span><span>{expanded?"⌃":"⌄"}</span>
        </button>
        {expanded&&<div style={{padding:"6px 12px 12px"}}>{byDomain[domain.id].map(node=>
          <div key={node.id} style={{padding:"11px 4px",borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:s.accent,opacity:.72}}/>
            <span style={{flex:1,fontSize:14}}>{node.label}{node.secondaryDomains?.length>0&&<span style={{display:"block",fontSize:10,opacity:.52,marginTop:2}}>Also connects to {node.secondaryDomains.map(id=>WELLBEING_DOMAINS.find(d=>d.id===id)?.label).filter(Boolean).join(" · ")}</span>}</span>
            <span style={{fontSize:11,opacity:.5}}>Not enough data</span>
          </div>)}
        </div>}
      </div>})}
    <p style={{fontSize:11,lineHeight:1.5,opacity:.5,padding:"2px 6px"}}>This first view shows the wellbeing structure only. States will appear as FriendshipTree connects real observed, inferred and reported evidence.</p>
  </section>;
}
