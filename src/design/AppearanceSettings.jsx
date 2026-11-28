import React,{useState} from "react";
import BalanceWheel from "./BalanceWheel.jsx";
import {EXAMPLE_POSITIONS,DIMENSIONS} from "./balanceGeometry.js";
import {ROLES,PRESETS,normalizeAppearance,resolvePalette,contrastRatio,onColour} from "./appearance.js";

function PlannerPreview({p}){
  const events=[["Morning routine","routine",0,1.5],["Work","work",2,2],["Lunch with friends","social",4.5,1.5],["Gym","health",7,2]];
  return <svg viewBox="0 0 180 226" width="100%" role="img" aria-label="Example daily planner using this palette">
    <rect width="180" height="226" rx="9" fill={p.background} stroke={p.grid}/>
    <path d="M9 0H171Q180 0 180 9V40H0V9Q0 0 9 0" fill={p.frame}/>
    <text x="9" y="15" fontSize="11" fontWeight="700" fill={p.text}>November</text>
    {[23,24,25,26,27,28,29].map((d,i)=><g key={d}><circle cx={14+i*25} cy="29" r="8" fill={i===5?p.accent:"none"}/><text x={14+i*25} y="32" textAnchor="middle" fontSize="8" fill={i===5?onColour(p.accent):p.muted}>{d}</text></g>)}
    <rect y="40" width="180" height="17" fill={p.surface}/><text x="8" y="51" fontSize="8" fill={p.text}>Saturday 28 · Day view</text>
    {Array.from({length:10},(_,i)=><g key={i}><text x="3" y={65+i*15} fontSize="6.5" fill={p.muted}>{String(8+i).padStart(2,"0")}:00</text><line x1="25" x2="177" y1={62+i*15} y2={62+i*15} stroke={p.grid} strokeWidth=".7"/></g>)}
    {events.map(([name,key,start,duration])=><g key={key}><rect x="27" y={63+start*15} width="149" height={duration*15-2} rx="3" fill={p[key]}/><text x="32" y={73+start*15} fontSize="8" fontWeight="600" fill={onColour(p[key])}>{name}</text></g>)}
    <path d="M0 211H180V217Q180 226 171 226H9Q0 226 0 217Z" fill={p.frame}/>
    {["Map","Planner","Overview","More"].map((n,i)=><text key={n} x={23+i*45} y="221" textAnchor="middle" fontSize="7" fill={i===1?p.accent:p.muted}>{n}</text>)}
  </svg>;
}
export default function AppearanceSettings({value,onChange,darkMode}){
  const a=normalizeAppearance(value);
  const [previewDark,setPreviewDark]=useState(darkMode);
  const [name,setName]=useState("");
  const [perfect,setPerfect]=useState(false);
  const [editing,setEditing]=useState(null);
  const mode=previewDark?"dark":"light";
  const p=resolvePalette(a,previewDark);
  const choices=[["legacy","Current appearance"],...Object.entries(PRESETS).map(([k,v])=>[k,v.name]),...a.custom.map(v=>[v.id,v.name])];
  function select(id){onChange({...a,selected:id});setEditing(null);}
  function create(){if(a.custom.length>=30)return;const id="custom-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);const item={id,name:name.trim()||"My palette",dark:resolvePalette(a,true),light:resolvePalette(a,false)};onChange({selected:id,custom:[...a.custom,item]});setEditing(id);setName("");}
  const current=a.custom.find(x=>x.id===a.selected);
  const changeColour=(key,colour)=>onChange({...a,custom:a.custom.map(x=>x.id===current.id?{...x,[mode]:{...x[mode],[key]:colour}}:x)});
  const button={minHeight:44,border:"1px solid "+p.grid,borderRadius:8,background:p.surface,color:p.text,padding:"6px 8px",cursor:"pointer",fontSize:12};
  const warning=[[p.text,p.background],[p.text,p.surface],[p.text,p.frame],[p.muted,p.background],[p.muted,p.surface],[p.muted,p.frame]].some(([fg,bg])=>contrastRatio(fg,bg)<4.5);
  return <section style={{background:p.background,color:p.text,padding:10,borderRadius:12,margin:"12px 0",border:"1px solid "+p.grid}}>
    <h3 style={{fontSize:15,margin:"0 0 4px"}}>App colour palettes</h3>
    <p style={{fontSize:12,color:p.muted,margin:"0 0 10px"}}>Choose a palette and preview it. Currently applied to Overview; other screens will adopt it in stages.</p>
    <div style={{display:"flex",gap:6,marginBottom:8}}>
      {[true,false].map(d=><button key={String(d)} type="button" aria-pressed={previewDark===d} onClick={()=>setPreviewDark(d)} style={{...button,flex:1,borderColor:previewDark===d?p.accent:p.grid}}>{d?"Dark preview":"Light preview"}</button>)}
    </div>
    <div style={{display:"grid",gap:7}}>
      {choices.map(([id,label])=>{const q=resolvePalette({...a,selected:id},previewDark);return <button key={id} type="button" aria-pressed={a.selected===id} onClick={()=>select(id)} style={{...button,textAlign:"left",borderColor:a.selected===id?p.accent:p.grid,display:"flex",alignItems:"center",gap:8}}><span style={{flex:1,minWidth:0}}>{label}{a.selected===id?" ✓":""}</span><span style={{display:"flex",gap:2}}>{["background","frame","accent","routine","work","health"].map(k=><span key={k} style={{width:12,height:17,borderRadius:2,background:q[k],border:"1px solid "+p.grid}}/>)}</span></button>})}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.2fr)",gap:8,marginTop:12,alignItems:"start"}}>
      <div>{ROLES.map(([key,label])=><div key={key} style={{display:"flex",alignItems:"center",gap:4,minHeight:21,fontSize:10}}><span style={{width:12,height:12,borderRadius:2,background:p[key],border:"1px solid "+p.grid,flexShrink:0}}/>{label}</div>)}</div>
      <PlannerPreview p={p}/>
    </div>
    <div style={{display:"flex",gap:6,marginTop:10}}><input aria-label="New palette name" value={name} onChange={e=>setName(e.target.value)} maxLength={48} placeholder="Palette name" style={{...button,flex:1,minWidth:0}}/><button type="button" disabled={a.custom.length>=30} onClick={create} style={button}>Create</button></div>
    {current&&<><button type="button" onClick={()=>setEditing(editing===current.id?null:current.id)} style={{...button,width:"100%",marginTop:6}}>{editing===current.id?"Done editing":"Edit selected palette"}</button>
      {editing===current.id&&<div style={{marginTop:8}}>{ROLES.map(([key,label])=><label key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,minHeight:44}}>{label}<input type="color" aria-label={label} value={p[key]} onChange={e=>changeColour(key,e.target.value)} style={{width:44,height:44,padding:3,border:0,background:"transparent"}}/></label>)}</div>}</>}
    <details style={{marginTop:12}}><summary style={{cursor:"pointer",minHeight:44,display:"flex",alignItems:"center",fontWeight:600,fontSize:13}}>Balance wheel design preview</summary><p style={{fontSize:11,color:p.muted}}>Example data only. Your existing Overview scores are unchanged.</p><BalanceWheel positions={perfect?Object.fromEntries(DIMENSIONS.map(([key])=>[key,3])):EXAMPLE_POSITIONS} score={perfect?100:78} palette={p}/><label style={{display:"flex",alignItems:"center",gap:8,minHeight:44,fontSize:12}}><input type="checkbox" checked={perfect} onChange={e=>setPerfect(e.target.checked)}/>Preview perfect balance</label></details>
    {warning&&<p role="status" style={{fontSize:12,color:p.text}}>Some text colours may be difficult to read. Try increasing contrast.</p>}
  </section>;
}
