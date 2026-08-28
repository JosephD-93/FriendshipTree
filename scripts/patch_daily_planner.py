from pathlib import Path

path=Path('src/App.jsx')
s=path.read_text(encoding='utf-8')
start=s.index('function CalendarPlannerV2(')
end=s.index('function OverviewBalanceMap',start)
pre,body,post=s[:start],s[start:end],s[end:]

def rep(old,new,count=1):
    global body
    found=body.count(old)
    if found!=count:
        raise SystemExit(f'Expected {count} occurrence(s), found {found}: {old[:120]}')
    body=body.replace(old,new,count)

# Open Calendar directly on today's Daily Planner and keep the parent year current.
rep('const[day,setDay]=React.useState(null),[drag,setDrag]=React.useState(null),[draft,setDraft]=React.useState(null),[input,setInput]=React.useState({priority:"",todo:""});const months=',
    'const[day,setDay]=React.useState(()=>getLocalDateStr(new Date)),[drag,setDrag]=React.useState(null),[draft,setDraft]=React.useState(null),[input,setInput]=React.useState({priority:"",todo:""});const dragRef=React.useRef(null),EVENT_COLORS=["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#ec4899","#06b6d4","#64748b"],DEFAULT_EVENT_COLOR="#3b82f6";React.useEffect(()=>{setYear(new Date().getFullYear())},[]);const months=')

# Normalise device-calendar events so timed entries also appear in the Daily Planner.
rep('deviceEvents.forEach(e=>{const k=(e.start?.dateTime||e.start?.date||"").slice(0,10);if(k)(evs[k]=evs[k]||[]).push({...e,title:e.summary||"Calendar event",device:true})});',
    'deviceEvents.forEach(e=>{const rawStart=e.start?.dateTime||e.start?.date||"",rawEnd=e.end?.dateTime||e.end?.date||"",k=rawStart.slice(0,10),time=x=>{if(!x||!x.includes("T"))return null;const d=new Date(x);return Number.isNaN(d.getTime())?null:pad(d.getHours())+":"+pad(d.getMinutes())};if(k)(evs[k]=evs[k]||[]).push({...e,title:e.summary||"Calendar event",device:true,startTime:time(rawStart),endTime:time(rawEnd)})});')

# Robust Pointer Events gesture handling for Android/WebView: ref-backed state, prevent native selection,
# pointer capture, and explicit pointercancel cleanup.
rep('onPointerDown:e=>{e.currentTarget.setPointerCapture(e.pointerId);const n=ix(e);setDrag({date,a:n,b:n,id:e.pointerId})}',
    'onPointerDown:e=>{if(e.cancelable)e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const n=ix(e),next={date,a:n,b:n,id:e.pointerId};dragRef.current=next;setDrag(next)}')
rep('onPointerMove:e=>drag?.id===e.pointerId&&setDrag(x=>({...x,b:ix(e)}))',
    'onPointerMove:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const next={...cur,b:ix(e)};dragRef.current=next;setDrag(next)}')
rep('onPointerUp:e=>{if(drag?.id!==e.pointerId)return;const lo=Math.min(drag.a,drag.b),hi=Math.max(drag.a,drag.b)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});setDrag(null)},style:{position:"relative",height:1248,touchAction:"none",background:darkMode?"#0f172a":"white"}',
    'onPointerUp:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const lo=Math.min(cur.a,cur.b),hi=Math.max(cur.a,cur.b)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},onPointerCancel:e=>{if(dragRef.current?.id===e.pointerId){dragRef.current=null;setDrag(null)}},onContextMenu:e=>e.preventDefault(),style:{position:"relative",height:1248,touchAction:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",background:darkMode?"#0f172a":"white"}')

# Saved blocks keep and display their selected colour.
rep('background:"#10b981",color:"white",fontSize:9,fontWeight:800}},e.title)',
    'background:e.color||"#10b981",color:"white",fontSize:9,fontWeight:800}},e.title)')

# Colour swatches in the event editor; colour is stored with the event and survives sync/local save.
rep('React.createElement("textarea",{value:draft.notes,onChange:e=>setDraft({...draft,notes:e.target.value}),placeholder:"Notes"}),React.createElement("div",null,people.map',
    'React.createElement("textarea",{value:draft.notes,onChange:e=>setDraft({...draft,notes:e.target.value}),placeholder:"Notes"}),React.createElement("div",{style:{margin:"10px 0"}},React.createElement("div",{style:{fontSize:11,fontWeight:800,marginBottom:6,opacity:.72}},"Event colour"),React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},EVENT_COLORS.map(c=>React.createElement("button",{key:c,type:"button",onClick:()=>setDraft({...draft,color:c}),title:c,style:{width:30,height:30,borderRadius:"50%",background:c,border:draft.color===c?"3px solid white":"2px solid transparent",boxShadow:draft.color===c?"0 0 0 2px "+c:"none"}})))),React.createElement("div",null,people.map')

# Phone portrait: stop forcing a 600px two-column canvas; stack the sidebar below the timeline.
rep('gridTemplateColumns:"minmax(330px,1fr) 250px",gap:10,padding:10,minWidth:600',
    'gridTemplateColumns:window.innerWidth<700?"minmax(0,1fr)":"minmax(330px,1fr) 250px",gap:10,padding:10,minWidth:0')

# Ensure the planner fully covers old calendar/map layers while open.
rep('return React.createElement("div",{style:{position:"absolute",inset:"0 0 calc(64px + env(safe-area-inset-bottom,0px)) 0",zIndex:85,overflow:"auto",background:',
    'return React.createElement("div",{style:{position:"fixed",inset:"0 0 calc(64px + env(safe-area-inset-bottom,0px)) 0",zIndex:190,overflow:"auto",background:')

# Add Today shortcut to the Daily Planner header.
rep('React.createElement("b",{style:{flex:1,textAlign:"center"}},"Daily planner"),React.createElement("select",{value:preference,onChange:e=>setPreference(e.target.value)}',
    'React.createElement("b",{style:{flex:1,textAlign:"center"}},"Daily planner"),React.createElement("button",{onClick:()=>{const now=getLocalDateStr(new Date);setDay(now);setYear(new Date().getFullYear())},style:{marginRight:7,border:"none",borderRadius:8,padding:"6px 9px",background:"#10b981",color:"white",fontSize:11,fontWeight:900}},"Today"),React.createElement("select",{value:preference,onChange:e=>setPreference(e.target.value)}')

# Retire the old birthday circle from this planner. Existing persisted 'circle' preference becomes Stack.
rep('const openMonth=m=>{const next=window.innerWidth>window.innerHeight?"row":"stack";',
    'const activeLayout=layout==="circle"?"stack":layout;const openMonth=m=>{const next=window.innerWidth>window.innerHeight?"row":"stack";')
rep('overflow:layout==="row"?"hidden":"auto"', 'overflow:activeLayout==="row"?"hidden":"auto"')
rep('[["circle","Circle"],["stack","Stack"],["row","Row"]]', '[["stack","Stack"],["row","Row"]]')
old='layout==="circle"?React.createElement(BirthdayYearWheel,{nodes,darkMode,year,onPerson,onDay:setDay,onMonth:openMonth,galleryPhotos:photos}):layout==="stack"?React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:12}},months.map((_,m)=>React.createElement(Month,{key:m,m}))):React.createElement("div",{style:{height:"100%",display:"flex",alignItems:"center",gap:12,overflowX:"auto",padding:"0 3vw",scrollSnapType:"x mandatory"}},months.map((_,m)=>React.createElement(Month,{key:m,m})))'
new='activeLayout==="stack"?React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:12}},months.map((_,m)=>React.createElement(Month,{key:m,m}))):React.createElement("div",{style:{height:"100%",display:"flex",alignItems:"center",gap:12,overflowX:"auto",padding:"0 3vw",scrollSnapType:"x mandatory"}},months.map((_,m)=>React.createElement(Month,{key:m,m})))'
rep(old,new)

path.write_text(pre+body+post,encoding='utf-8')
print('Daily Planner patch applied successfully')
