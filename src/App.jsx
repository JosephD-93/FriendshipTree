import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Trash2, ZoomIn, ZoomOut, Home,
  Calendar as CalendarIcon, X, Settings, 
  Moon, Sun, Cloud, Info, Activity, TreePine,
  MessageCircle, Coffee, PartyPopper, Plane, HeartHandshake, Map as MapIcon,
  BookUser
} from 'lucide-react';

const APP_VERSION = '3.1';
const INTERACTION_DISTANCE = 70;
const TIER_COLORS_GLOBAL = ['#bef264','#84cc16','#166534','#3b82f6','#9333ea'];
const PRIMARY_GROUP_COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316'];
const MAX_SCORE = 1000;
const DECAY_RATE_PER_DAY = 5;
const CALENDAR_NODE_SCALE = 8.4; // 30% smaller than original 15, then 20% more

const MONTH_COLORS = [
  '#1E3A8A', '#3B82F6', '#10B981', '#22C55E',
  '#84CC16', '#F59E0B', '#EF4444', '#F97316',
  '#D97706', '#9A3412', '#78350F', '#312E81'
];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Inline SVG avatar data URIs — no network required, no XML comments (breaks JSX)
const makeAvatar = (bg, skin, hair, extraPath) => {
  // Face-only portrait — no body, no neck, no shoulders
  // Face centred at (50,58), radius ~26. Hair sits above.
  const s = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<rect width="100" height="100" fill="${bg}"/>`,
    // Hair behind face (rendered first so face overlaps)
    extraPath,
    // Face
    `<ellipse cx="50" cy="58" rx="24" ry="26" fill="${skin}"/>`,
    // Eyes
    `<ellipse cx="43" cy="54" rx="3.5" ry="3.8" fill="#1a1a2e"/>`,
    `<ellipse cx="57" cy="54" rx="3.5" ry="3.8" fill="#1a1a2e"/>`,
    `<ellipse cx="44.2" cy="52.8" rx="1.2" ry="1.2" fill="white"/>`,
    `<ellipse cx="58.2" cy="52.8" rx="1.2" ry="1.2" fill="white"/>`,
    // Nose
    `<path d="M50 57 Q52 63 50 65 Q48 63 50 57" fill="${skin}" stroke="${hair}" stroke-width="0.4" opacity="0.35"/>`,
    // Mouth
    `<path d="M44 70 Q50 75 56 70" stroke="#b06060" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    `</svg>`,
  ].join('');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
};

const AVATARS = {
  me: makeAvatar('#4f46e5','#f4c2a1','#2d1b00',
    '<ellipse cx="50" cy="35" rx="25" ry="14" fill="#2d1b00"/><rect x="25" y="35" width="50" height="10" fill="#2d1b00"/>'),
  simon: makeAvatar('#0f766e','#f9d4b6','#8B4513',
    '<ellipse cx="50" cy="34" rx="25" ry="13" fill="#8B4513"/><rect x="25" y="34" width="50" height="8" fill="#8B4513"/><ellipse cx="30" cy="40" rx="7" ry="9" fill="#8B4513"/>'),
  bob: makeAvatar('#7c3aed','#e8b89a','#1a1a1a',
    '<ellipse cx="50" cy="36" rx="24" ry="10" fill="#1a1a1a"/>'),
  charlie: makeAvatar('#b45309','#f5cba7','#c0392b',
    '<ellipse cx="50" cy="35" rx="25" ry="13" fill="#c0392b"/><path d="M35 35 Q50 18 65 35" fill="#c0392b"/>'),
  dave: makeAvatar('#065f46','#d4a574','#4a3728',
    '<ellipse cx="50" cy="32" rx="27" ry="16" fill="#4a3728"/><rect x="23" y="32" width="54" height="10" fill="#4a3728"/>'),
  alice: makeAvatar('#be185d','#fde8d8','#d4a017',
    '<ellipse cx="50" cy="33" rx="26" ry="14" fill="#d4a017"/><rect x="24" y="33" width="8" height="40" fill="#d4a017"/><rect x="68" y="33" width="8" height="40" fill="#d4a017"/><ellipse cx="50" cy="33" rx="26" ry="14" fill="#d4a017"/>'),
  james: makeAvatar('#1e3a5f','#f0c89a','#2c2c2c',
    '<ellipse cx="50" cy="35" rx="25" ry="13" fill="#2c2c2c"/><path d="M25 38 Q50 30 75 38" fill="#2c2c2c"/>'),
  priya: makeAvatar('#7c2d12','#c68642','#1a0a00',
    '<ellipse cx="50" cy="33" rx="26" ry="14" fill="#1a0a00"/><rect x="22" y="33" width="9" height="50" fill="#1a0a00"/><rect x="69" y="33" width="9" height="50" fill="#1a0a00"/><ellipse cx="50" cy="33" rx="26" ry="14" fill="#1a0a00"/>'),
  james_f: makeAvatar('#1d4ed8','#d4956a','#3d1a00',
    '<ellipse cx="50" cy="34" rx="25" ry="13" fill="#3d1a00"/><ellipse cx="50" cy="38" rx="18" ry="9" fill="#3d1a00"/>'),
  imogen: makeAvatar('#7c3aed','#fde8d8','#d4a017',
    '<ellipse cx="50" cy="33" rx="26" ry="14" fill="#d4a017"/><path d="M24 40 Q20 58 26 78" stroke="#d4a017" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M76 40 Q80 58 74 78" stroke="#d4a017" stroke-width="8" fill="none" stroke-linecap="round"/>'),
  hayley: makeAvatar('#1d4ed8','#f5cba7','#6b3a2a',
    '<ellipse cx="50" cy="34" rx="26" ry="14" fill="#6b3a2a"/><rect x="24" y="34" width="52" height="22" rx="3" fill="#6b3a2a"/>'),
  sister: makeAvatar('#be185d','#f4c2a1','#2d1b00',
    '<ellipse cx="50" cy="33" rx="25" ry="13" fill="#2d1b00"/><rect x="25" y="33" width="50" height="8" fill="#2d1b00"/><ellipse cx="74" cy="30" rx="5" ry="8" fill="#2d1b00"/><path d="M74 38 Q82 52 76 68" stroke="#2d1b00" stroke-width="5" fill="none" stroke-linecap="round"/>'),
  mum: makeAvatar('#0f766e','#f4c2a1','#6b3a2a',
    '<ellipse cx="50" cy="33" rx="26" ry="14" fill="#6b3a2a"/><rect x="24" y="33" width="52" height="15" rx="4" fill="#6b3a2a"/>'),
  dad: makeAvatar('#065f46','#f4c2a1','#2d1b00',
    '<ellipse cx="50" cy="37" rx="20" ry="10" fill="#2d1b00"/><rect x="30" y="37" width="40" height="6" fill="#2d1b00"/>'),
  gemma: makeAvatar('#6d28d9','#fde8d8','#8B4513',
    '<ellipse cx="50" cy="32" rx="28" ry="16" fill="#8B4513"/><ellipse cx="29" cy="42" rx="9" ry="11" fill="#8B4513"/><ellipse cx="71" cy="42" rx="9" ry="11" fill="#8B4513"/>'),
  lauren: makeAvatar('#0e7490','#f5cba7','#1a1a1a',
    '<ellipse cx="50" cy="35" rx="24" ry="13" fill="#1a1a1a"/><ellipse cx="50" cy="22" rx="9" ry="9" fill="#1a1a1a"/><rect x="46" y="22" width="8" height="14" fill="#1a1a1a"/>'),
};

const L4 = 600;
const L5 = 1000;

// Blank startup — just Me and the 5 life flowers
const INITIAL_NODES = [
  { id: 'me',                label: 'Me',         img: AVATARS.me,      x: 0,    y: 0,    pinned: true  },
  { id: 'flower_social',     type: 'flower', dimKey: 'social',     label: 'Social',     x: 0,    y: -191, pinned: false },
  { id: 'flower_creativity', type: 'flower', dimKey: 'creativity', label: 'Creativity', x: -165, y: 95,   pinned: false },
  { id: 'flower_knowledge',  type: 'flower', dimKey: 'knowledge',  label: 'Knowledge',  x: 0,    y: 191,  pinned: false },
  { id: 'flower_health',     type: 'flower', dimKey: 'health',     label: 'Health',     x: 165,  y: 286,  pinned: false },
  { id: 'flower_growth',     type: 'flower', dimKey: 'growth',     label: 'Growth',     x: 165,  y: 95,   pinned: false },
];

const INITIAL_LINKS = [
  { source: 'me', target: 'flower_social'     },
  { source: 'me', target: 'flower_creativity' },
  { source: 'me', target: 'flower_knowledge'  },
  { source: 'me', target: 'flower_health'     },
  { source: 'me', target: 'flower_growth'     },
];

// Full demo snapshot — loaded when ✨ Demo is pressed
const DEMO_NODES = [
  { id: 'hub_musicals', type: 'hub', label: 'Musicals', x: -165, y: -286, pinned: true },
  { id: 'hub_family',   type: 'hub', label: 'Family',   x: 0,    y: -381, pinned: true },
  { id: 'hub_climbing', type: 'hub', label: 'Climbing', x: 165,  y: -95,  pinned: true },
  { id: 'simon',  label: 'Simon',  img: AVATARS.simon,   x: -330, y: -381, pinned: false, primaryGroup: 'hub_musicals', birthday: '22nd Aug 91'  },
  { id: 'gemma',  label: 'Gemma',  img: AVATARS.gemma,   x: -165, y: -476, pinned: false, primaryGroup: 'hub_musicals', birthday: '9th Mar 97'   },
  { id: 'lauren', label: 'Lauren', img: AVATARS.lauren,  x: -330, y: -191, pinned: false, primaryGroup: 'hub_musicals', birthday: '28th Nov 96'  },
  { id: 'sister', label: 'Sister', img: AVATARS.sister,  x: 0,    y: -572, pinned: false, primaryGroup: 'hub_family',   birthday: '5th Jul 90', isFamily: true },
  { id: 'mum',    label: 'Mum',    img: AVATARS.mum,     x: 165,  y: -476, pinned: false, primaryGroup: 'hub_family',   birthday: '14th Feb 62', isFamily: true },
  { id: 'dad',    label: 'Dad',    img: AVATARS.dad,     x: -165, y: -667, pinned: false, primaryGroup: 'hub_family',   birthday: '30th Oct 60', isFamily: true },
  { id: 'hayley', label: 'Hayley', img: AVATARS.hayley,  x: 330,  y: 0,    pinned: false, primaryGroup: 'hub_climbing', birthday: '12th Apr 98'  },
  { id: 'james_f',label: 'James',  img: AVATARS.james_f, x: 165,  y: -286, pinned: false, birthday: '17th Jan 94'  },
  { id: 'imogen', label: 'Imogen', img: AVATARS.imogen,  x: -330, y: -572, pinned: false, birthday: '3rd Jun 95'   },
];

const DEMO_LINKS = [
  { source: 'flower_social', target: 'hub_musicals' },
  { source: 'flower_social', target: 'hub_family'   },
  { source: 'flower_social', target: 'hub_climbing' },
  { source: 'flower_social', target: 'james_f'      },
  { source: 'flower_social', target: 'imogen'       },
  { source: 'hub_musicals',  target: 'simon'  },
  { source: 'hub_musicals',  target: 'gemma'  },
  { source: 'hub_musicals',  target: 'lauren' },
  { source: 'hub_family',    target: 'sister' },
  { source: 'hub_family',    target: 'mum'    },
  { source: 'hub_family',    target: 'dad'    },
  { source: 'hub_climbing',  target: 'hayley' },
];

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#0f172a', color: '#f87171', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 16 }}>Render Error — check console</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}


// -- FAB Component ------------------------------------------------------------
function FabMenu(props) {
  const { theme, fabOpen, setFabOpen, fabPos, setFabPos,
    draggingFab, setDraggingFab, heldTool, setHeldTool,
    fabDragStart, fabRef, holdTimer,
    historyLen, futureLen, vineDrawMode, macheteMode, pendingPaths,
    undo, redo, setSearchOpen, setSettingsOpen,
    commitAllPaths, setVineDrawMode, setMacheteMode, setPendingPaths, setCurrentStroke,
    rakeActive, setRakeActive,
    lassoMode, setLassoMode, setLassoPath, setLassoSelected, setLassoMenuOpen,
  } = props;

  const dm = theme.darkMode;
  const bg = dm?'#1e293b':'white';
  const col = dm?'#e2e8f0':'#334155';
  const FAB=52, TOOL=44, ICON_R=82, LABEL_R=130;
  const W=window.innerWidth, H=window.innerHeight;

  const py = fabPos.edge==='bottom'?H-FAB-64:fabPos.edge==='top'?8:Math.max(8,Math.min(H-FAB-64,fabPos.offset*H-FAB/2));
  const px = fabPos.edge==='right'?W-FAB-8:fabPos.edge==='left'?8:Math.max(8,Math.min(W-FAB-8,fabPos.offset*W-FAB/2));
  const cx=px+FAB/2, cy=py+FAB/2;

  const snapEdge=(ex,ey)=>{
    const d={left:ex,right:W-ex,top:ey,bottom:H-ey};
    const edge=Object.keys(d).reduce((a,b)=>d[a]<d[b]?a:b);
    const off=(edge==='left'||edge==='right')?Math.max(0.05,Math.min(0.95,ey/H)):Math.max(0.05,Math.min(0.95,ex/W));
    return {edge,offset:off};
  };

  const tools = [
    {id:'search',icon:'🔍',label:'Search',  fn:()=>{setSearchOpen(true);setFabOpen(false);}},
    {id:'undo',  icon:'↩', label:'Undo',    fn:()=>undo(), holdFn:()=>redo(), holdIcon:'↪',holdLabel:'Redo', dim:historyLen===0&&futureLen===0},
    {id:'vine',  icon:'🌿',label:vineDrawMode?'Commit':'Vine', fn:()=>{vineDrawMode?(commitAllPaths(),setVineDrawMode(false)):(setVineDrawMode(true),setMacheteMode(false),setPendingPaths([]),setCurrentStroke([]));setFabOpen(false);}, active:vineDrawMode},
    {id:'cut',   icon:'🪓',label:macheteMode?'Stop':'Cut', fn:()=>{setMacheteMode(!macheteMode);setVineDrawMode(false);setFabOpen(false);}, active:macheteMode},
    {id:'rake',  icon:'🧹',label:rakeActive?'Hide Rake':'Rake', fn:()=>{setRakeActive(v=>!v);setFabOpen(false);}, active:rakeActive},
    {id:'lasso', icon:'⭕',label:lassoMode?'Stop':'Select', fn:()=>{setLassoMode(v=>!v);setLassoPath([]);setLassoSelected([]);setLassoMenuOpen(false);setFabOpen(false);}, active:lassoMode},
    {id:'cfg',   icon:'⚙️',label:'Settings',fn:()=>{setSettingsOpen(v=>!v);setFabOpen(false);}},
  ];
  const n=tools.length;

  // Fan angle pointing inward from whichever edge we're on
  const cAngle=fabPos.edge==='left'?0:fabPos.edge==='right'?180:fabPos.edge==='top'?90:270;
  const spread=(n-1)*36;

  // For each tool, compute icon pos and label pos at same angle, further out
  // Clamp label to stay on screen
  const getPositions=(i)=>{
    const ang=(cAngle - spread/2 + spread/(n-1)*i)*Math.PI/180;
    const ix=cx+Math.cos(ang)*ICON_R-TOOL/2;
    const iy=cy+Math.sin(ang)*ICON_R-TOOL/2;
    const lx=cx+Math.cos(ang)*LABEL_R;
    const ly=cy+Math.sin(ang)*LABEL_R;
    return {
      icon:{ x:Math.max(6,Math.min(W-TOOL-6,ix)), y:Math.max(6,Math.min(H-TOOL-64,iy)) },
      label:{ x:Math.max(4,Math.min(W-90,lx)), y:Math.max(4,Math.min(H-20,ly)) },
      ang,
    };
  };

  const fabIconCol=fabOpen?'white':(vineDrawMode||macheteMode||rakeActive||lassoMode?'white':'#10b981');
  const fabBg=fabOpen?'#dc2626':(vineDrawMode||macheteMode||rakeActive||lassoMode?'#10b981':bg);

  return (
    <>
      {fabOpen&&<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:149}} onClick={()=>setFabOpen(false)}/>}
      {tools.map((t,i)=>{
        const pos=getPositions(i);
        const held=heldTool===t.id;
        const icon=held&&t.holdIcon?t.holdIcon:t.icon;
        const lbl=held&&t.holdLabel?t.holdLabel:t.label;
        return (
          <React.Fragment key={t.id}>
            <div style={{position:'fixed',left:pos.icon.x,top:pos.icon.y,zIndex:151,
              transform:fabOpen?'scale(1)':'scale(0)',
              opacity:fabOpen?(t.dim?0.3:1):0,
              transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1) '+(i*40)+'ms',
              pointerEvents:fabOpen&&!t.dim?'auto':'none'}}>
              <button
                onPointerDown={()=>{if(t.holdFn)holdTimer.current=setTimeout(()=>setHeldTool(t.id),400);}}
                onPointerUp={()=>{clearTimeout(holdTimer.current);if(held&&t.holdFn){t.holdFn();setHeldTool(null);}else{t.fn();setHeldTool(null);}}}
                onPointerLeave={()=>{clearTimeout(holdTimer.current);setHeldTool(null);}}
                style={{width:TOOL,height:TOOL,borderRadius:'50%',
                  border:'2px solid '+(t.active||held?'#10b981':'transparent'),
                  cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',
                  background:t.active||held?'#064e3b':bg,
                  boxShadow:held?'0 0 0 3px #10b981,0 4px 14px rgba(0,0,0,0.35)':'0 4px 14px rgba(0,0,0,0.35)',
                  color:t.active||held?'#10b981':col,
                }}>{icon}</button>
            </div>
            {fabOpen&&!t.dim&&(
              <div style={{position:'fixed',
                left:pos.label.x, top:pos.label.y,
                transform:'translate(-50%,-50%)',
                zIndex:153,
                fontSize:10,fontWeight:700,whiteSpace:'nowrap',pointerEvents:'none',
                color:dm?'#e2e8f0':'#1e293b',
                background:dm?'rgba(15,23,42,0.92)':'rgba(255,255,255,0.92)',
                padding:'2px 7px',borderRadius:4,
                boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
                opacity:fabOpen?1:0,
                transition:'opacity 0.2s '+(i*40)+'ms',
              }}>{lbl}</div>
            )}
          </React.Fragment>
        );
      })}
      <div ref={fabRef} style={{position:'fixed',left:px,top:py,zIndex:152,width:FAB,height:FAB,touchAction:'none'}}
        onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);fabDragStart.current={x:e.clientX,y:e.clientY,moved:false};setDraggingFab(false);}}
        onPointerMove={e=>{if(!fabDragStart.current)return;const dx=e.clientX-fabDragStart.current.x,dy=e.clientY-fabDragStart.current.y;if(Math.sqrt(dx*dx+dy*dy)>8){fabDragStart.current.moved=true;setDraggingFab(true);setFabOpen(false);setFabPos(snapEdge(e.clientX,e.clientY));}}}
        onPointerUp={e=>{if(!fabDragStart.current)return;if(!fabDragStart.current.moved)setFabOpen(v=>!v);else setFabPos(snapEdge(e.clientX,e.clientY));fabDragStart.current=null;setDraggingFab(false);}}
      >
        <button style={{width:'100%',height:'100%',borderRadius:'50%',border:'none',
          cursor:draggingFab?'grabbing':'grab',background:fabBg,
          boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
          display:'flex',alignItems:'center',justifyContent:'center',
          transition:'background 0.2s',pointerEvents:'none'}}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M3 11 L13 3 L23 11" stroke={fabIconCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="5" y="11" width="16" height="11" rx="0.5" stroke={fabIconCol} strokeWidth="1.8" fill="none"/>
            <rect x="10" y="16" width="6" height="6" rx="0.5" stroke={fabIconCol} strokeWidth="1.5" fill="none"/>
            <circle cx="15" cy="19" r="0.8" fill={fabIconCol}/>
            <rect x="6.5" y="13" width="4" height="3.5" rx="0.3" stroke={fabIconCol} strokeWidth="1.2" fill="none"/>
            <path d="M8.5 13 L8.5 16.5 M6.5 14.75 L10.5 14.75" stroke={fabIconCol} strokeWidth="0.8"/>
          </svg>
        </button>
      </div>
      {/* Floating confirm button below FAB when vine/cut active */}
      {(vineDrawMode || macheteMode) && (
        <div style={{position:'fixed',left:px,top:py+FAB+8,zIndex:152,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <button onClick={()=>{
            if(vineDrawMode){commitAllPaths();setVineDrawMode(false);setPendingPaths([]);setCurrentStroke([]);}
            if(macheteMode){setMacheteMode(false);}
          }} style={{
            width:FAB,height:FAB,borderRadius:'50%',border:'3px solid white',cursor:'pointer',
            background:vineDrawMode?'#10b981':'#ef4444',
            boxShadow:'0 4px 16px rgba(0,0,0,0.35)',color:'white',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
          }}>
            <span style={{fontSize:16,lineHeight:1}}>{vineDrawMode?'🌿':'🪓'}</span>
            <span style={{fontSize:7,fontWeight:900,letterSpacing:'0.5px'}}>{vineDrawMode?'COMMIT':'STOP'}</span>
          </button>
        </div>
      )}
      {/* Floating button below FAB when rake active */}
      {rakeActive && (
        <div style={{position:'fixed',left:px,top:py+FAB+8,zIndex:152,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <button
            onPointerDown={()=>{ rakeHoldTimer.current=setTimeout(()=>setClearLeavesConfirm(true),600); }}
            onPointerUp={()=>{ clearTimeout(rakeHoldTimer.current); }}
            onPointerLeave={()=>{ clearTimeout(rakeHoldTimer.current); }}
            onClick={()=>setRakeActive(false)}
            style={{
              width:FAB,height:FAB,borderRadius:'50%',border:'3px solid white',cursor:'pointer',
              background:'#92400e',
              boxShadow:'0 4px 16px rgba(0,0,0,0.35)',color:'white',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
            }}>
            <span style={{fontSize:16,lineHeight:1}}>🧹</span>
            <span style={{fontSize:7,fontWeight:900,letterSpacing:'0.5px'}}>STOP</span>
          </button>
        </div>
      )}
      {/* Floating button below FAB when lasso active */}
      {lassoMode && (
        <div style={{position:'fixed',left:px,top:py+FAB+8,zIndex:152,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <button onClick={()=>{setLassoMode(false);setLassoPath([]);setLassoSelected([]);setLassoMenuOpen(false);}}
            style={{
              width:FAB,height:FAB,borderRadius:'50%',border:'3px solid white',cursor:'pointer',
              background:'#7c3aed',
              boxShadow:'0 4px 16px rgba(0,0,0,0.35)',color:'white',
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
            }}>
            <span style={{fontSize:16,lineHeight:1}}>⭕</span>
            <span style={{fontSize:7,fontWeight:900,letterSpacing:'0.5px'}}>STOP</span>
          </button>
        </div>
      )}
    </>
  );
}




const KEYFRAMES_CSS = [
  '@keyframes spin{to{transform:rotate(360deg)}}',
  '@keyframes fadein{from{opacity:0}to{opacity:1}}',
  // Native (Capacitor) safe-area handling so content clears the phone's
  // status bar (top) and navigation bar (bottom). Harmless in a browser
  // where the insets are 0.
  ':root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px);}',
  'body{padding-top:var(--sat);padding-bottom:var(--sab);padding-left:var(--sal);padding-right:var(--sar);box-sizing:border-box;}',
  // Fixed top bars sit below the status bar
  '.ft-safe-top{top:var(--sat) !important;}',
  // Fixed full-screen overlays should still cover the whole screen
].join(' ');

function AppInner() {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState(() => {
    try { const s = localStorage.getItem('ft_nodes'); return s ? JSON.parse(s) : INITIAL_NODES; } catch(e) { return INITIAL_NODES; }
  });
  const [links, setLinks] = useState(() => {
    try { const s = localStorage.getItem('ft_links'); return s ? JSON.parse(s) : INITIAL_LINKS; } catch(e) { return INITIAL_LINKS; }
  });
  const [lastDecayCheck, setLastDecayCheck] = useState(Date.now());
  const [viewMode, setViewMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_viewMode')) || 'canvas'; } catch(e) { return 'canvas'; }
  });
  const [calendarLayout, setCalendarLayout] = useState('circle');
  const [dimensions, setDimensions] = useState(() => {
    try { const s = localStorage.getItem('ft_dimensions'); return s ? { ...DEFAULT_DIMENSIONS, ...JSON.parse(s) } : DEFAULT_DIMENSIONS; } catch(e) { return DEFAULT_DIMENSIONS; }
  });
  const [collapsedGroups, setCollapsedGroups] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.collapsedGroups !== undefined ? s.collapsedGroups : []; } catch(e) { return []; } })());
  const [mergePrompt, setMergePrompt] = useState(null); // {type:'group'|'friend', a, b} or null
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [notifPermission, setNotifPermission] = useState('Notification' in window ? Notification.permission : 'denied');
  const [flowerPanel, setFlowerPanel] = useState(null);
  const [flowerMenuOpen, setFlowerMenuOpen] = useState(false);
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
  const [dragActivity, setDragActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('social');
  const [socialView, setSocialView] = useState('gridScore'); // 'gridScore'|'gridMomentum'|'barScore'|'barMomentum'
  const [barStyle, setBarStyle] = useState('segments');
  const [activeTags, setActiveTags] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.activeTags !== undefined ? s.activeTags : []; } catch(e) { return []; } })()); // tags currently filtered on
  const [tagInput, setTagInput] = useState('');     // new tag being typed in panel
  const [addFriendForms, setAddFriendForms] = useState([]);
  const [photoSlideshow, setPhotoSlideshow] = useState(null); // nodeId
  const [slideIdx, setSlideIdx] = useState(0);
  const [photoCrop, setPhotoCrop] = useState(null);
  const [profilePhotosViewer, setProfilePhotosViewer] = useState(null); // nodeId when open
  // Group photo tagger
  const [groupPhotoSrc, setGroupPhotoSrc] = useState(null);   // base64 of the group photo
  const [faceRings, setFaceRings] = useState([]);              // [{id,x,y,r,name,assignedNodeId}]
  const [tagStep, setTagStep] = useState('place');             // 'place' | 'identify'
  const [tagCurrent, setTagCurrent] = useState(0);            // index into faceRings being identified
  const [groupPhotoOriginNode, setGroupPhotoOriginNode] = useState(null); // nodeId photo was opened from
  const dragRingRef = useRef(null);
  const groupPhotoViewRef = useRef({x:0,y:0,scale:1});
  const groupPhotoPanRef = useRef(null);
  const groupPhotoPinchRef = useRef(null);
  const groupPhotoSvgRef = useRef(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [faceDetecting, setFaceDetecting] = useState(false);
  const faceApiLoadedRef = useRef(false);
  const origFlowerRef = useRef(null);
  const [partnerFlowerEditor, setPartnerFlowerEditor] = useState(null);
  // Reset flower snapshot when editor opens/closes
  React.useEffect(() => {
    if (!partnerFlowerEditor) { origFlowerRef.current = null; return; }
    const n = nodes.find(n=>n.id===partnerFlowerEditor);
    if (n && origFlowerRef.current === null) {
      origFlowerRef.current = {
        partnerFlower: n.partnerFlower ? JSON.parse(JSON.stringify(n.partnerFlower)) : null,
        miniFlower: n.miniFlower ? JSON.parse(JSON.stringify(n.miniFlower)) : null,
        groupMiniFlower: n.groupMiniFlower ? JSON.parse(JSON.stringify(n.groupMiniFlower)) : null,
        groupFlowerActive: n.groupFlowerActive,
      };
    }
  }, [partnerFlowerEditor]);
  const [pfAppearanceOpen, setPfAppearanceOpen] = useState(true);
  const [pfSelectedPart, setPfSelectedPart] = useState('main');
  const [pfFlowerType, setPfFlowerType] = useState('main'); // 'main' | 'mini'
  const [pfColorPickerFor, setPfColorPickerFor] = useState(null);
  const [pfTab, setPfTab] = useState('design');
  const [pfEditingPresetIdx, setPfEditingPresetIdx] = useState(null);
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_flower_presets') || '[]'); } catch(e) { return []; }
  });
  const [settingsSections, setSettingsSections] = useState({appearance:true,filters:false,data:false,reset:false,security:false,future:false});
  const [fontSize, setFontSize] = useState(() => { try { return parseFloat(localStorage.getItem('ft_fontSize')||'1'); } catch(e) { return 1; } });
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize * 16}px`;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [fontSize]);
  const [dataSnapshot, setDataSnapshot] = useState(null); // {nodes, links} saved before destructive reset
  const [avatarBuilder, setAvatarBuilder] = useState(null);
  const cropCanvasRef = useRef(null);
  const cropImgRef = useRef(null);
  const cropDragRef = useRef(null);
  const cropResizeRef = useRef(false);
  const idbRef = useRef(null);
  const borderFlowerPositionsRef = useRef({});

  // -- IndexedDB for photo storage -------------------------------------------
  const [lastCreatedLink, setLastCreatedLink] = useState(null);
  const lastLinkTimer = useRef(null);

  const showLinkUndo = (source, target) => {
    clearTimeout(lastLinkTimer.current);
    setLastCreatedLink({ source, target });
    lastLinkTimer.current = setTimeout(() => setLastCreatedLink(null), 4000);
  };

  const getPhotoBorderColor = (node) => {
    if (photoBorderMode === 'none') return null;
    if (photoBorderMode === 'tier') {
      const s = node.interactionScore || 0;
      const ti = s < 100 ? 0 : s < 300 ? 1 : s < 600 ? 2 : s < 1000 ? 3 : 4;
      return TIER_COLORS_GLOBAL[ti];
    }
    if (photoBorderMode === 'group') {
      // Use personal colour if set (for ungrouped people)
      if (node.personalColor) return node.personalColor;
      const hubLink = links.find(l => {
        const otherId = l.source === node.id ? l.target : l.target === node.id ? l.source : null;
        if (!otherId) return false;
        return nodes.find(n => n.id === otherId)?.type === 'hub';
      });
      if (!hubLink) return null; // no group, no personal colour = no border
      const hubId = nodes.find(n=>n.id===hubLink.source)?.type==='hub' ? hubLink.source : hubLink.target;
      if (groupColors[hubId]) return groupColors[hubId];
      const idx = nodes.filter(n=>n.type==='hub').findIndex(n=>n.id===hubId);
      return PRIMARY_GROUP_COLORS[idx % PRIMARY_GROUP_COLORS.length];
    }
    if (photoBorderMode === 'momentum') {
      const s = node.interactionScore || 0;
      const prev = node.prevScore || s;
      const delta = s - prev;
      if (delta > 20) return '#10b981';
      if (delta < -20) return '#ef4444';
      return '#f59e0b';
    }
    return null;
  };

  const snapshotRef = useRef(null);

  const saveSnapshot = () => {
    // Capture synchronously using refs so we always get current values
    snapshotRef.current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      links: JSON.parse(JSON.stringify(links)),
    };
    setDataSnapshot(snapshotRef.current);
  };

  const restoreSnapshot = () => {
    const snap = snapshotRef.current;
    if (!snap) return;
    setNodes(snap.nodes);
    setLinks(snap.links);
    snapshotRef.current = null;
    setDataSnapshot(null);
    showToast('↩ Data restored');
  };

  const openPinModal = (mode, title, onSuccess) => {
    setPinModal({ mode, title, onSuccess });
    setPinInput('');
    setPinError('');
  };

  const handlePinDigit = (d) => {
    const next = (pinInput + d).slice(0, 6);
    setPinInput(next);
    setPinError('');
    if (next.length >= 4) {
      setTimeout(() => {
        if (!pinModal) return;
        const stored = localStorage.getItem('ft_pin');
        if (pinModal.mode === 'set') {
          localStorage.setItem('ft_pin', next);
          setPinModal(null); setPinInput('');
          showToast('🔒 PIN set!');
          pinModal.onSuccess && pinModal.onSuccess();
        } else if (pinModal.mode === 'verify' || pinModal.mode === 'clear') {
          if (next === stored) {
            setPinModal(null); setPinInput('');
            pinModal.onSuccess && pinModal.onSuccess();
          } else {
            setPinError('Wrong PIN'); setPinInput('');
          }
        }
      }, 150);
    }
  };

  const handlePinBackspace = () => setPinInput(p => p.slice(0,-1));

  const clearPhotoDB = async () => {
    try {
      const db = idbRef.current || (idbRef.current = await openPhotoDB());
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').clear();
    } catch(e) {}
  };

  const clearAllData = () => {
    clearTimeout(saveTimer.current);
    // Keep names, photos, birthdays, notes, tags — only clear scores, logs, links history
    setNodes(prev => prev.map(n => ({
      ...n,
      interactionScore: 0,
      prevScore: 0,
      log: [],
      tags: n.tags, // keep tags
      // keep: label, img, birthday, notes, phone, email, contactName, type, x, y, id
    })));
    setLinks(INITIAL_LINKS);
    // Reset dimension logs and weekly scores but keep activities config
    setDimensions(prev => {
      const reset = {};
      Object.keys(prev).forEach(k => {
        reset[k] = { ...prev[k], log: [], weeklyScore: 0, health: 1.0 };
      });
      return reset;
    });
    setArchivedLinks([]);
    try { localStorage.removeItem('ft_links'); } catch(e) {}
    showToast('🗑️ History cleared — people & photos kept');
  };

  // -- IndexedDB photo storage -----------------------------------------------
  const openPhotoDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('FriendTreePhotos', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'nodeId' });
      if (!db.objectStoreNames.contains('gallery')) db.createObjectStore('gallery', { keyPath: 'key' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });

  const saveToGallery = (nodeId, dataUrl, meta) => {
    meta = meta || {};
    return openPhotoDB().then(db => {
      const key = nodeId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
      return new Promise((res,rej) => {
        const tx = db.transaction('gallery','readwrite');
        tx.objectStore('gallery').put({ key, nodeId, dataUrl, sourceType: meta.sourceType||'manual', date: meta.date||'' });
        tx.oncomplete = () => res(key); tx.onerror = rej;
      });
    }).catch(e => console.error('Gallery save failed', e));
  };

  const loadGallery = (nodeId) => {
    return openPhotoDB().then(db => {
      return new Promise((res,rej) => {
        const tx = db.transaction('gallery','readonly');
        const req = tx.objectStore('gallery').getAll();
        req.onsuccess = () => res((req.result||[]).filter(r=>r.nodeId===nodeId));
        req.onerror = rej;
      });
    }).catch(() => []);
  };

  const deleteFromGallery = (key) => {
    return openPhotoDB().then(db => {
      return new Promise((res,rej) => {
        const tx = db.transaction('gallery','readwrite');
        tx.objectStore('gallery').delete(key);
        tx.oncomplete = res; tx.onerror = rej;
      });
    }).catch(e => console.error('Gallery delete failed', e));
  };

  const savePhotoToDB = async (nodeId, dataUrl) => {
    try {
      const db = idbRef.current || (idbRef.current = await openPhotoDB());
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').put({ nodeId, dataUrl });
    } catch(e) { console.warn('Photo save failed:', e); }
  };

  const deletePhotoFromDB = async (nodeId) => {
    try {
      const db = idbRef.current || (idbRef.current = await openPhotoDB());
      const tx = db.transaction('photos', 'readwrite');
      tx.objectStore('photos').delete(nodeId);
    } catch(e) {}
  };

  // On mount — ask the OS to PERSIST our storage so Android doesn't evict
  // IndexedDB (which is why photos vanished after closing the native app).
  useEffect(() => {
    (async () => {
      try {
        if (navigator.storage && navigator.storage.persist) {
          const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
          if (!already) {
            const granted = await navigator.storage.persist();
            console.log('Persistent storage:', granted ? 'granted' : 'denied');
          }
        }
      } catch(e) { console.warn('storage.persist failed:', e); }
    })();
  }, []);

  // On mount — restore photos from IndexedDB onto nodes
  useEffect(() => {
    (async () => {
      try {
        const db = await openPhotoDB();
        idbRef.current = db;
        const tx = db.transaction('photos', 'readonly');
        const all = await new Promise((res, rej) => {
          const req = tx.objectStore('photos').getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        });
        if (all.length === 0) return;
        const photoMap = {};
        all.forEach(({ nodeId, dataUrl }) => { if (dataUrl) photoMap[nodeId] = dataUrl; });
        setNodes(prev => prev.map(n => photoMap[n.id] ? { ...n, img: photoMap[n.id] } : n));
      } catch(e) { console.warn('Photo restore failed:', e); }
    })();
  }, []); // eslint-disable-line

  // Auto-create hidden hubs for anyone connected directly to the social node.
  // This gives each social-connected person their own group (with vine border)
  // that holds them plus anyone branching off them.
  useEffect(() => {
    const newHubs = [];
    const newHubLinks = [];
    links
      .filter(l => l.source === 'flower_social' || l.target === 'flower_social')
      .map(l => l.source === 'flower_social' ? l.target : l.source)
      .filter(id => { const n = nodes.find(n => n.id === id); return n && n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me'; })
      .forEach(id => {
        const hubId = 'hidden_hub_' + id;
        const person = nodes.find(n => n.id === id);
        if (!nodes.some(n => n.id === hubId)) {
          newHubs.push({ id: hubId, type: 'hub', hidden: true, label: (person && person.label ? person.label : 'Friend') + "'s Group", x: (person && person.x ? person.x : 0) + 180, y: (person && person.y ? person.y : 0), pinned: false });
        }
        if (!links.some(l => (l.source===hubId&&l.target===id)||(l.target===hubId&&l.source===id))) {
          newHubLinks.push({ source: hubId, target: id });
        }
      });
    if (newHubs.length > 0) setNodes(prev => [...prev, ...newHubs]);
    if (newHubLinks.length > 0) setLinks(prev => [...prev, ...newHubLinks]);

    // Repair any hidden hub whose label is missing/undefined — name it after
    // the person it belongs to (e.g. "Hayley's Group").
    setNodes(prev => {
      let changed = false;
      const fixed = prev.map(n => {
        if (n.type === 'hub' && n.hidden && (!n.label || n.label === 'undefined' || /^undefined/.test(n.label))) {
          const personId = n.id.replace('hidden_hub_', '');
          const person = prev.find(p => p.id === personId);
          if (person && person.label) { changed = true; return { ...n, label: person.label + "'s Group" }; }
        }
        return n;
      });
      return changed ? fixed : prev;
    });
  }, [links]); // eslint-disable-line

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [connSections, setConnSections] = useState({ group: true, subgroups: true, severed: false });
  const [expandedGroupMembers, setExpandedGroupMembers] = useState({});

  const [avBg,    setAvBg]    = useState('#4f46e5');
  const [avSkin,  setAvSkin]  = useState('#f4c2a1');
  const [avHair,  setAvHair]  = useState('#2d1b00');
  const [avStyle, setAvStyle] = useState('medium');
  const [avFace,  setAvFace]  = useState('smile');
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryText, setDiaryText] = useState('');
  const [diarySuggestions, setDiarySuggestions] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState(null);
  const isPanningOverride = useRef(false); // set synchronously when pan wins over drag
  const [liftedNodeId, setLiftedNodeId] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  useEffect(() => {
    if (!selectedNodeId) { setGalleryItems([]); return; }
    setGalleryLoading(true);
    loadGallery(selectedNodeId).then(items => { setGalleryItems(items); setGalleryLoading(false); }).catch(() => setGalleryLoading(false));
  }, [selectedNodeId]); // eslint-disable-line
  const [toastMessage, setToastMessage] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [userIdeas, setUserIdeas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_ideas') || '[]'); } catch(e) { return []; }
  });
  const settingsOpenTime = useRef(0);
  useEffect(() => { if (settingsOpen) settingsOpenTime.current = Date.now(); }, [settingsOpen]);
  const [tierPickMode, setTierPickMode] = useState(false);
  const [photoBorderMode, setPhotoBorderMode] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.photoBorderMode !== undefined ? s.photoBorderMode : 'none'; } catch(e) { return 'none'; } })());
  const [showHubMembers, setShowHubMembers] = useState(true);
  // Butterflies (day) / fireflies (night) perched on flowers & photo edges.
  // Each: {id, perchKey, x, y, flying, fromX, fromY, toX, toY, flightStart}
  const [creatures, setCreatures] = useState([]);
  const [groupPhotoLayout, setGroupPhotoLayout] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.groupPhotoLayout || 'shells'; } catch(e) { return 'shells'; } }); // 'shells' | 'mandala'
  const [showGroupTable, setShowGroupTable] = useState(false);
  const [hubFlowerMenuOpen, setHubFlowerMenuOpen] = useState(false);
  const [showVineBorders, setShowVineBorders] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.showVineBorders !== undefined ? s.showVineBorders : true; } catch(e) { return true; } })());
  const [showVineColorPicker, setShowVineColorPicker] = useState(false);
  const [showVineTuner, setShowVineTuner] = useState(false);
  const [tunerSections, setTunerSections] = useState({borders:true,flowers:false,strands:false,groupBorder:false});
  const [sliderDragging, setSliderDragging] = useState(false);
  const [fallenLeaves, setFallenLeaves] = useState(() => { try { return JSON.parse(localStorage.getItem('ft_fallenLeaves')||'[]'); } catch(e) { return []; } });
  // Surrounding flowers settings
  const [surroundFlowerSettings, setSurroundFlowerSettings] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.surroundFlowerSettings ? {...{enabled:true,minSize:8,maxSize:22,count:5,spread:80,useCalc:true,showMain:true,showSurround:true,flowerScale:1.0},...s.surroundFlowerSettings} : {enabled:true,minSize:8,maxSize:22,count:5,spread:80,useCalc:true,showMain:true,showSurround:true,flowerScale:1.0}; } catch(e) { return {enabled:true,minSize:8,maxSize:22,count:5,spread:80,useCalc:true,showMain:true,showSurround:true,flowerScale:1.0}; } });
  const [vineBorderParams, setVineBorderParams] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.vineBorderParams ? {...{blobArcRadius:1.05,blobSagDepth:0.38,vineArcRadius:1.05,vineSagDepth:0.38,leavesInner:1.0,leavesOuter:1.0},...s.vineBorderParams} : {blobArcRadius:1.05,blobSagDepth:0.38,vineArcRadius:1.05,vineSagDepth:0.38,leavesInner:1.0,leavesOuter:1.0}; } catch(e) { return {blobArcRadius:1.05,blobSagDepth:0.38,vineArcRadius:1.05,vineSagDepth:0.38,leavesInner:1.0,leavesOuter:1.0}; } });
  const GROUP_BORDER_PARAMS_DEFAULT = {arcRadius:1.05,sagDepth:0.38,coreWidth:3.2,wrap1Width:2.0,wrap2Width:1.6,wrap3Width:1.3,growWidth:1.2,leafCoreSize:12,leafWrapSize:5,leafGrowSize:2,leafSpacing:28,leavesInner:1.0,leavesOuter:1.0};
  const [groupBorderParams, setGroupBorderParams] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.groupBorderParams ? {...GROUP_BORDER_PARAMS_DEFAULT,...s.groupBorderParams} : GROUP_BORDER_PARAMS_DEFAULT; } catch(e) { return GROUP_BORDER_PARAMS_DEFAULT; } });
  const STRAND_PARAMS_DEFAULT = {coreWidth:10.2,wrap1Width:2.0,wrap2Width:1.6,wrap3Width:1.3,growWidth:1.2,coreColorD:'#14532d',coreColorL:'#15803d',wrap1ColorD:'#15803d',wrap1ColorL:'#22c55e',wrap2ColorD:'#16a34a',wrap2ColorL:'#4ade80',wrap3ColorD:'#22c55e',wrap3ColorL:'#86efac',growColorD:'#16a34a',growColorL:'#4ade80',leafCoreSize:43,leafWrapSize:19,leafGrowSize:5,leafCoreDark:'#14532d',leafCoreLight:'#15803d',leafWrapDark:'#166534',leafWrapLight:'#22c55e',leafGrowDark:'#16a34a',leafGrowLight:'#4ade80',leafSpacing:36};
  const [strandParams, setStrandParams] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.strandParams ? {...STRAND_PARAMS_DEFAULT,...s.strandParams} : STRAND_PARAMS_DEFAULT; } catch(e) { return STRAND_PARAMS_DEFAULT; } });
  const [groupColors, setGroupColors] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.groupColors !== undefined ? s.groupColors : {}; } catch(e) { return {}; } })());
  const [confirmModal, setConfirmModal] = useState(null);
  const [pinModal, setPinModal] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [appLocked, setAppLocked] = useState(false);
  const [lockPin, setLockPin] = useState(() => { try { return localStorage.getItem('ft_pin') || ''; } catch(e) { return ''; } });
  const [lockTimer, setLockTimerVal] = useState(() => { try { return localStorage.getItem('ft_lockTimer') || 'close'; } catch(e) { return 'close'; } });
  const lastActiveRef = useRef(Date.now());

  // Check if app should lock based on timer
  useEffect(() => {
    const check = () => {
      const pin = localStorage.getItem('ft_pin');
      if (!pin) return;
      const timer = localStorage.getItem('ft_lockTimer') || 'close';
      const elapsed = Date.now() - lastActiveRef.current;
      const limits = { '5min': 5*60000, '1hour': 3600000, '1day': 86400000, 'close': Infinity };
      if (timer !== 'close' && elapsed > (limits[timer] || Infinity)) setAppLocked(true);
    };
    const iv = setInterval(check, 30000);
    const resetTimer = () => { lastActiveRef.current = Date.now(); };
    window.addEventListener('pointerdown', resetTimer);
    // Lock on visibility change (app close/background)
    const onVis = () => {
      if (document.hidden) {
        const pin = localStorage.getItem('ft_pin');
        const timer = localStorage.getItem('ft_lockTimer') || 'close';
        if (pin && timer === 'close') setAppLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); window.removeEventListener('pointerdown', resetTimer); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  const [theme, setTheme] = useState(() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.theme ? {...{darkMode:true,showWeathering:true,fontSize:14},...s.theme} : {darkMode:true,showWeathering:true,fontSize:14}; } catch(e) { return {darkMode:true,showWeathering:true,fontSize:14}; } });
  const [fabOpen, setFabOpen] = useState(false);
  const [fabPos, setFabPos] = useState({ edge: 'left', offset: 0.3 });
  const [draggingFab, setDraggingFab] = useState(false);
  const [heldTool, setHeldTool] = useState(null);
  const fabDragStart = useRef(null);
  const fabRef = useRef(null);
  const holdTimer = useRef(null);
  const groupLiftTimer = useRef(null);
  const groupDragIds = useRef(null);
  const groupDragOrigins = useRef({});
  const groupHoldStartPos = useRef(null); // tracks pointer position when group hold timer starts
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLevelPanel, setShowLevelPanel] = useState(false);
  const [showLevelSetter, setShowLevelSetter] = useState(false);
  const [showPersonalColorPicker, setShowPersonalColorPicker] = useState(false);
  const [showMapKey, setShowMapKey] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.showMapKey !== undefined ? s.showMapKey : false; } catch(e) { return false; } })());
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [groupModal, setGroupModal] = useState(null);
  const [selectForGroupMode, setSelectForGroupMode] = useState(null);
  const [selectedForGroup, setSelectedForGroup] = useState([]);
  const selectedForGroupRef = useRef([]);

  // Keep ref in sync with state
  useEffect(() => { selectedForGroupRef.current = selectedForGroup; }, [selectedForGroup]); // null | { hubId }
  const [slashTrail, setSlashTrail] = useState([]);
  const [archivedLinks, setArchivedLinks] = useState((() => { try { const s=JSON.parse(localStorage.getItem('ft_settings')||'{}'); return s.archivedLinks !== undefined ? s.archivedLinks : []; } catch(e) { return []; } })());
  const [macheteMode, setMacheteMode] = useState(false);
  const [vineDrawMode, setVineDrawMode] = useState(false);
  const [rakeActive, setRakeActive] = useState(false);
  const [lassoMode, setLassoMode] = useState(false);
  const [lassoPath, setLassoPath] = useState([]);
  const [lassoDrawing, setLassoDrawing] = useState(false);
  const [lassoSelected, setLassoSelected] = useState([]);
  const [lassoMenuOpen, setLassoMenuOpen] = useState(false);
  const [rakePos, setRakePos] = useState({ x: 120, y: 120 });
  const [rakeDragging, setRakeDragging] = useState(false);
  const [collectedLeaves, setCollectedLeaves] = useState([]);
  const [clearLeavesConfirm, setClearLeavesConfirm] = useState(false);
  const rakeHoldTimer = useRef(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryViewer, setGalleryViewer] = useState(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const rakeDragStart = useRef(null);
  const [vineConnectPrompt, setVineConnectPrompt] = useState(null);
  const [pendingPaths, setPendingPaths] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [growingVines, setGrowingVines] = useState([]); // [{id, pathD, totalLen, progress, nodeId}]
  const [spawnPopup, setSpawnPopup] = useState(null); // {x, y, r} SVG coords + actual radius
  const isDrawing = useRef(false);
  const isSlashing = useRef(false);
  const activePointers = useRef(new Map());
  const liftTimer = useRef(null);
  const lastTapRef = useRef(new Map());
  const initialPinchDist = useRef(null);
  const initialPinchScale = useRef(null);
  const [canvasVelocity, setCanvasVelocity] = useState({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const panTimer = useRef(null);

  useEffect(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, scale: viewMode === 'calendar' ? 0.055 : viewMode === 'me' ? 1 : 0.6 });
    }
  }, [viewMode]);

  useEffect(() => {
    const checkDecay = () => {
      const now = Date.now();
      const daysPassed = Math.floor((now - lastDecayCheck) / (1000 * 60 * 60 * 24));
      if (daysPassed > 0) {
        setNodes(prev => prev.map(n => {
          if (n.type === 'hub' || n.id === 'me') return n;
          const newScore = Math.max(0, (n.interactionScore || 0) - (daysPassed * DECAY_RATE_PER_DAY));
          return { ...n, interactionScore: newScore };
        }));
        setLastDecayCheck(now);
      }
    };
    checkDecay();
    const interval = setInterval(checkDecay, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [lastDecayCheck]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-')) {
        e.preventDefault();
        const zoomFactor = e.key === '-' ? 0.8 : 1.2;
        setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.01, prev.scale * zoomFactor), 3) }));
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getConnectionCount = useCallback((nodeId) => {
    return links.filter(l => l.source === nodeId || l.target === nodeId).length;
  }, [links]);

  const calculateHubStrength = useCallback((hubId) => {
    const connectedFriends = links
      .filter(l => l.source === hubId || l.target === hubId)
      .map(l => l.source === hubId ? l.target : l.source)
      .map(friendId => nodes.find(n => n.id === friendId))
      .filter(n => n && n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me');
    if (connectedFriends.length === 0) return 0;
    const totalScore = connectedFriends.reduce((sum, f) => sum + (f.interactionScore || 0), 0);
    return Math.min(MAX_SCORE, totalScore);
  }, [links, nodes]);

  const getNodeRadius = useCallback((node) => {
    if (node.id === 'me') return 80;
    if (node.type === 'hub') return 40;
    if (node.type === 'flower') return 80;
    const score = node.interactionScore || 0;
    const normalized = Math.min(score / 300, 1);
    return 40 + (normalized * 40);
  }, []);

  const handlePointerDown = (e, nodeId) => {
    if (vineDrawMode && viewMode === 'canvas') return;

    // Track every pointer with its starting position
    activePointers.current.set(e.pointerId, {
      id: e.pointerId, x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
      nodeId: nodeId, time: Date.now(),
      decidedPan: false,
    });

    const allPtrs = Array.from(activePointers.current.values());

    if (allPtrs.length === 2) {
      // Pinch zoom init
      const [p0, p1] = allPtrs;
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      initialPinchDist.current = Math.sqrt(dx*dx + dy*dy);
      initialPinchScale.current = transform.scale;
      return;
    }

    if (nodeId && viewMode === 'canvas') {
      const touchedNode = nodes.find(n => n.id === nodeId);
      if (touchedNode?.hidden) { handlePointerDown(e, null); return; }
      // In select-for-group mode, don't lift nodes — just register touch for tap detection
      if (selectForGroupMode) {
        activePointers.current.set(e.pointerId, {
          id: e.pointerId, x: e.clientX, y: e.clientY,
          startX: e.clientX, startY: e.clientY,
          nodeId: nodeId, time: Date.now(), decidedPan: false,
        });
        return;
      }
      // Ignore node touches if we're already panning the canvas
      if (isPanning) {
        activePointers.current.set(e.pointerId, {
          id: e.pointerId, x: e.clientX, y: e.clientY,
          startX: e.clientX, startY: e.clientY,
          nodeId: null, time: Date.now(), decidedPan: true,
        });
        return;
      }
      // Start the long-press timer — node only lifts after 150ms stillness
      isPanningOverride.current = false;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      setDragNode({ id: nodeId, startX: node.x, startY: node.y, pointerId: e.pointerId });
      clearTimeout(liftTimer.current);
      clearTimeout(groupLiftTimer.current);
      liftTimer.current = setTimeout(() => {
        isPanningOverride.current = false;
        setLiftedNodeId(nodeId);
      }, 150);

      // Capture pointer start position for movement threshold check
      groupHoldStartPos.current = { x: e.clientX, y: e.clientY };
      const MOVE_CANCEL_PX = 12;

      // 2s hold while staying still — drag node with all connected friends
      const dragNodeId = nodeId;
      groupLiftTimer.current = setTimeout(() => {
        // Cancel if pointer has moved too much (user is panning not holding)
        const start = groupHoldStartPos.current;
        if (!start) return;
        const movedX = Math.abs(e.clientX - start.x);
        const movedY = Math.abs(e.clientY - start.y);
        if (movedX > MOVE_CANCEL_PX || movedY > MOVE_CANCEL_PX) return;
        // Use functional setState to get current nodes/links
        setNodes(currentNodes => {
          setLinks(currentLinks => {
            const draggedNode = currentNodes.find(n => n.id === dragNodeId);
            if (!draggedNode) return currentLinks;

            const visited = new Set([dragNodeId]);

            if (draggedNode.type === 'hub') {
              currentLinks.forEach(l => {
                if (l.source === dragNodeId) visited.add(l.target);
                if (l.target === dragNodeId) visited.add(l.source);
              });
              currentNodes.forEach(n => {
                if (n.type === 'flower' || n.id === 'me') visited.delete(n.id);
              });
            } else {
              const queue = [dragNodeId];
              while (queue.length > 0) {
                const curr = queue.shift();
                currentLinks.forEach(l => {
                  if (l.source === curr && !visited.has(l.target)) {
                    const target = currentNodes.find(n => n.id === l.target);
                    if (target && target.type !== 'flower' && target.id !== 'me') {
                      visited.add(l.target);
                      queue.push(l.target);
                    }
                  }
                });
              }
            }

            if (visited.size > 1) {
              const origins = {};
              currentNodes.forEach(n => { if (visited.has(n.id)) origins[n.id] = { x: n.x, y: n.y }; });
              groupDragOrigins.current = origins;
              setDragNode(prev => prev ? { ...prev, startX: draggedNode.x, startY: draggedNode.y } : prev);
              groupDragIds.current = visited;
              showToast('🌿 Moving group · ' + (visited.size-1) + ' member' + (visited.size-1===1?'':'s'));
            }

            return currentLinks;
          });
          return currentNodes;
        });
      }, 2000);
    } else {
      // Background touch — start panning immediately
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setSelectedNodeId(null);
      setAddFriendForms([]);
      setShowPhotoOptions(false);
    }
    setShowTutorial(false);
  };

  const handlePointerMove = (e) => {
    if (vineDrawMode && isDrawing.current && viewMode === 'canvas') {
      const rect = svgRef.current ? svgRef.current.getBoundingClientRect() : { left:0, top:0 };
      const sx = (e.clientX - rect.left - transform.x) / transform.scale;
      const sy = (e.clientY - rect.top - transform.y) / transform.scale;
      setCurrentStroke(prev => [...prev, { x: sx, y: sy }]);
      return;
    }

    // Update hold start pos tracking so group drag timer can check movement
    if (groupHoldStartPos.current) {
      const dx = Math.abs(e.clientX - groupHoldStartPos.current.x);
      const dy = Math.abs(e.clientY - groupHoldStartPos.current.y);
      if (dx > 12 || dy > 12) {
        // Moved too much — cancel group drag timer
        clearTimeout(groupLiftTimer.current);
        groupHoldStartPos.current = null;
      }
    }

    const ptr = activePointers.current.get(e.pointerId);
    if (!ptr) return;
    ptr.x = e.clientX;
    ptr.y = e.clientY;

    const allPtrs = Array.from(activePointers.current.values());

    // Pinch zoom
    if (allPtrs.length === 2) {
      const [p0, p1] = allPtrs;
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (initialPinchDist.current > 0) {
        const newScale = Math.min(Math.max(0.01, initialPinchScale.current * (dist / initialPinchDist.current)), 3);
        setTransform(t => ({ ...t, scale: newScale }));
      }
      return;
    }

    // Node touch — decide: pan or drag?
    if (ptr.nodeId && dragNode && !ptr.decidedPan) {
      if (!liftedNodeId) {
        // Not lifted yet — check if we should switch to pan
        const moved = Math.sqrt((ptr.x - ptr.startX)**2 + (ptr.y - ptr.startY)**2);
        if (moved > 12) {
          clearTimeout(liftTimer.current);
          clearTimeout(groupLiftTimer.current);
          groupDragIds.current = null;
          groupHoldStartPos.current = null;
          isPanningOverride.current = true;
          ptr.decidedPan = true;
          ptr.nodeId = null; // treat as background touch from now on
          setDragNode(null);
          setLiftedNodeId(null);
          setIsPanning(true);
          setPanStart({ x: ptr.startX - transform.x, y: ptr.startY - transform.y });
          lastPanPos.current = { x: ptr.startX, y: ptr.startY };
        } else {
          return; // still deciding — don't move anything
        }
      } else {
        ptr.decidedPan = false; // lifted — this is a drag
      }
    }

    // Panning
    if (isPanning && !liftedNodeId) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      // Apply directly to DOM for smooth 60fps — no React re-render
      const newT = { ...transform, x: newX, y: newY };
      applyTransform(newT);
      setTransform(newT);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      if (liftTimer.current) {
        clearTimeout(liftTimer.current);
        liftTimer.current = null;
        setDragNode(null);
      }
      return;
    }

    // Dragging a lifted node
    if (liftedNodeId && dragNode && !isPanningOverride.current) {
      const rect = svgRef.current ? svgRef.current.getBoundingClientRect() : { left:0, top:0 };
      const svgX = (e.clientX - rect.left - transform.x) / transform.scale;
      const svgY = (e.clientY - rect.top - transform.y) / transform.scale;
      setHexSnapPos(snapToHex(svgX, svgY));
      if (groupDragIds.current) {
        const dx = svgX - dragNode.startX;
        const dy = svgY - dragNode.startY;
        const groupIds = groupDragIds.current; // capture before async
        const groupOrigins = groupDragOrigins.current;
        setNodes(prev => prev.map(n => {
          if (!groupIds || !groupIds.has(n.id)) return n;
          const orig = groupOrigins[n.id];
          if (!orig) return n;
          return { ...n, x: orig.x + dx, y: orig.y + dy };
        }));
      } else {
        setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: svgX, y: svgY } : n));
      }      let closest = null, minDist = INTERACTION_DISTANCE;
      nodes.forEach(n => {
        if (n.id === dragNode.id) return;
        if (n.type === 'flower' && n.id !== 'flower_social') return;
        if (n.hidden) return;
        const d = Math.sqrt((n.x-svgX)**2 + (n.y-svgY)**2);
        if (d < minDist) { minDist = d; closest = n.id; }
      });
      setHoverTarget(closest);
    }
  };

  const handlePointerUp = (e) => {
    if (vineDrawMode && isDrawing.current && viewMode === 'canvas') {
      isDrawing.current = false;
      setCurrentStroke(prev => {
        if (prev.length >= 4) setPendingPaths(pp => [...pp, { pts: prev }]);
        return [];
      });
      return;
    }

    clearTimeout(liftTimer.current);
    clearTimeout(groupLiftTimer.current);
    groupDragIds.current = null;
    groupDragOrigins.current = {};
    const ptr = activePointers.current.get(e.pointerId);
    if (!ptr) return;
    activePointers.current.delete(e.pointerId);

    const moved = Math.sqrt((ptr.x - ptr.startX)**2 + (ptr.y - ptr.startY)**2);
    const wasTap = moved < 12;

    if (ptr.nodeId && wasTap && viewMode === 'canvas') {
      // Select-for-group mode — tap toggles selection
      if (selectForGroupMode) {
        const tappedNode = nodes.find(n => n.id === ptr.nodeId);
        if (tappedNode && tappedNode.type !== 'hub' && tappedNode.type !== 'flower') {
          const current = selectedForGroupRef.current;
          const next = current.includes(ptr.nodeId)
            ? current.filter(id => id !== ptr.nodeId)
            : [...current, ptr.nodeId];
          selectedForGroupRef.current = next;
          setSelectedForGroup(next);
        }
        return;
      }
      const lastTime = lastTapRef.current.get(ptr.nodeId) || 0;
      const tapCount = (lastTapRef.current.get(ptr.nodeId + '_count') || 0) + 1;
      const now = Date.now();
      const tappedNode = nodes.find(n => n.id === ptr.nodeId);

      if (now - lastTime < 400) {
        if (tapCount >= 3 && tappedNode?.type === 'hub') {
          // Triple-tap hub: collapse/expand
          setCollapsedGroups(prev =>
            prev.includes(ptr.nodeId) ? prev.filter(id => id !== ptr.nodeId) : [...prev, ptr.nodeId]
          );
          showToast(collapsedGroups.includes(ptr.nodeId) ? '📂 Group expanded' : '📁 Group collapsed');
          lastTapRef.current.delete(ptr.nodeId);
          lastTapRef.current.delete(ptr.nodeId + '_count');
        } else if (tapCount >= 2) {
          if (tappedNode?.type === 'hub') {
            // Double-tap hub: just open/focus sidebar
            setSelectedNodeId(ptr.nodeId);
          } else if (tappedNode?.type === 'flower') {
            const flowerNode = nodes.find(n => n.dimKey === tappedNode.dimKey);
            if (!flowerNode?.borderLocked) {
              const modes = ['none','tier','group','momentum'];
              const labels = ['No border','Tier colour','Group colour','Momentum colour'];
              const next = modes[(modes.indexOf(photoBorderMode) + 1) % modes.length];
              setPhotoBorderMode(next);
              showToast('🌸 Border: ' + labels[modes.indexOf(next)]);
            } else {
              showToast('🔒 Border locked — unlock in group settings');
            }
          } else {
            // Double-tap person: open their sidebar
            setSelectedNodeId(ptr.nodeId);
          }
          lastTapRef.current.delete(ptr.nodeId);
          lastTapRef.current.delete(ptr.nodeId + '_count');
        } else {
          lastTapRef.current.set(ptr.nodeId, now);
          lastTapRef.current.set(ptr.nodeId + '_count', tapCount);
        }
      } else {
        // First tap — select node to open sidebar (but not flower nodes)
        if (tappedNode?.type !== 'flower') setSelectedNodeId(ptr.nodeId);
        lastTapRef.current.set(ptr.nodeId, now);
        lastTapRef.current.set(ptr.nodeId + '_count', 1);
      }
    }

    if (liftedNodeId && dragNode) {
      // Settle to snapped position
      if (hexSnapPos) {
        setNodes(prev => prev.map(n =>
          n.id === dragNode.id ? { ...n, x: hexSnapPos.x, y: hexSnapPos.y } : n
        ));
      }
      if (!wasTap && hoverTarget) {
        snapshot();
        const targetNode = nodes.find(n => n.id === hoverTarget);
        const draggedNode = nodes.find(n => n.id === dragNode.id);
        const archived = archivedLinks.find(l =>
          (l.source === dragNode.id && l.target === hoverTarget) ||
          (l.source === hoverTarget && l.target === dragNode.id)
        );
        // Group→Group: merge prompt, bounce back
        if (draggedNode?.type === 'hub' && targetNode?.type === 'hub') {
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          setMergePrompt({ type: 'group', a: dragNode.id, b: hoverTarget });

        // Anything→Social flower: connect and bounce back
        } else if (targetNode?.id === 'flower_social') {
          const alreadyLinked = links.some(l =>
            (l.source === 'flower_social' && l.target === dragNode.id) ||
            (l.source === dragNode.id && l.target === 'flower_social')
          );
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          if (!alreadyLinked) {
            setLinks(prev => [...prev, { source: 'flower_social', target: dragNode.id }]);
            showLinkUndo('flower_social', dragNode.id);
            showToast('🌱 Connected to Social');
          } else {
            showToast('Already connected to Social');
          }

        // Person/Me→Person/Me: connect prompt, bounce back
        } else if (targetNode?.type !== 'hub' && targetNode?.type !== 'flower' &&
                   draggedNode?.type !== 'hub' && draggedNode?.type !== 'flower') {
          const alreadyLinked = links.some(l =>
            (l.source === dragNode.id && l.target === hoverTarget) ||
            (l.source === hoverTarget && l.target === dragNode.id)
          );
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          if (!alreadyLinked) {
            setMergePrompt({ type: 'friend', a: dragNode.id, b: hoverTarget });
          } else {
            showToast('Already connected');
          }

        // Person→Hub: join group, bounce back
        } else if (targetNode?.type === 'hub') {
          const alreadyLinked = links.some(l =>
            (l.source === hoverTarget && l.target === dragNode.id) ||
            (l.source === dragNode.id && l.target === hoverTarget)
          );
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          if (!alreadyLinked) {
            setLinks(prev => [...prev, { source: hoverTarget, target: dragNode.id }]);
            showLinkUndo(hoverTarget, dragNode.id);
            showToast('🌱 Added to ' + targetNode.label);
          }

        // Hub→Person or anything else with a valid target: connect, bounce back
        } else if (targetNode) {
          const alreadyLinked = links.some(l =>
            (l.source === dragNode.id && l.target === hoverTarget) ||
            (l.source === hoverTarget && l.target === dragNode.id)
          );
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          if (!alreadyLinked) {
            setLinks(prev => [...prev, { source: dragNode.id, target: hoverTarget }]);
            showLinkUndo(dragNode.id, hoverTarget);
            const archived = archivedLinks.find(l =>
              (l.source === dragNode.id && l.target === hoverTarget) ||
              (l.source === hoverTarget && l.target === dragNode.id)
            );
            if (archived) {
              setArchivedLinks(prev => prev.filter(l => l !== archived));
              showToast('🌿 Reconnected!');
            } else {
              showToast('🌱 Connected to ' + targetNode.label);
            }
          }
        }
      }
      setDragNode(null);
      setLiftedNodeId(null);
      setHoverTarget(null);
      setHexSnapPos(null);
    } else {
      setDragNode(null);
    }

    isPanningOverride.current = false;
    if (activePointers.current.size === 0) {
      setIsPanning(false);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.01, prev.scale * zoomFactor), 3) }));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const loadDemoData = () => {
    const now = Date.now();
    const hoursAgo = (h) => now - h * 3600000;
    const daysAgo  = (d) => new Date(now - d * 864e5).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

    const buildHistory = (currentScore, trend) => {
      const entries = [];
      for (let h = 72; h >= 0; h -= 6) {
        let s = currentScore;
        if (trend === 'rising')    s = Math.max(0, currentScore - (h / 72) * 200);
        if (trend === 'falling')   s = Math.min(1000, currentScore + (h / 72) * 220);
        if (trend === 'recovering')s = h > 36
          ? Math.min(1000, currentScore + (h / 72) * 300)
          : Math.max(0, currentScore - ((36 - h) / 36) * 80);
        if (trend === 'stable')    s = currentScore + Math.sin(h * 0.3) * 15;
        entries.push({ score: Math.round(s), ts: hoursAgo(h) });
      }
      return entries;
    };

    // First: add all demo people and groups (merge — don't duplicate)
    setNodes(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const toAdd = DEMO_NODES.filter(n => !existingIds.has(n.id));
      return [...prev, ...toAdd];
    });
    setLinks(prev => {
      const existingKeys = new Set(prev.map(l => `${l.source}-${l.target}`));
      const toAdd = DEMO_LINKS.filter(l => !existingKeys.has(`${l.source}-${l.target}`));
      return [...prev, ...toAdd];
    });

    // Then: populate scores and history on named nodes
    const friendData = {
      imogen:  { score: 980, trend: 'stable',     tags: ['Musicals','London'],    log: [
        { label: 'Weekend trip',       pts: 150, date: daysAgo(2) },
        { label: 'Long catch-up call', pts: 80,  date: daysAgo(5) },
        { label: 'Gig together',       pts: 100, date: daysAgo(14) },
      ]},
      james_f: { score: 650, trend: 'rising',     tags: ['London','Uni'],         log: [
        { label: 'Dinner out',         pts: 90,  date: daysAgo(3) },
        { label: 'Helped me move',     pts: 120, date: daysAgo(10) },
        { label: 'Texted',             pts: 10,  date: daysAgo(16) },
      ]},
      simon:   { score: 420, trend: 'recovering', tags: ['Musicals'],            log: [
        { label: 'Rehearsal',          pts: 60,  date: daysAgo(4) },
        { label: 'Post-show drinks',   pts: 80,  date: daysAgo(11) },
      ]},
      gemma:   { score: 160, trend: 'falling',    tags: ['Musicals'],            log: [
        { label: 'Coffee',             pts: 40,  date: daysAgo(6) },
      ]},
      lauren:  { score: 90,  trend: 'falling',    tags: ['Musicals'],            log: [
        { label: 'WhatsApp',           pts: 5,   date: daysAgo(30) },
      ]},
      sister:  { score: 700, trend: 'stable',     tags: ['Family'],              log: [
        { label: 'Family dinner',      pts: 80,  date: daysAgo(1) },
        { label: 'Long phone call',    pts: 60,  date: daysAgo(7) },
      ]},
      mum:     { score: 720, trend: 'stable',     tags: ['Family'],              log: [
        { label: 'Sunday call',        pts: 50,  date: daysAgo(2) },
        { label: 'Visit home',         pts: 150, date: daysAgo(12) },
      ]},
      dad:     { score: 620, trend: 'rising',     tags: ['Family'],              log: [
        { label: 'Watched the game',   pts: 80,  date: daysAgo(5) },
        { label: 'Visit home',         pts: 150, date: daysAgo(12) },
      ]},
      hayley:  { score: 640, trend: 'rising',     tags: ['Climbing','London'],   log: [
        { label: 'Bouldering — 2hrs',  pts: 100, date: daysAgo(1) },
        { label: 'Bouldering comp',    pts: 120, date: daysAgo(8) },
        { label: 'Post-climb coffee',  pts: 40,  date: daysAgo(15) },
      ]},
    };

    setNodes(prev => prev.map(n => {
      const data = friendData[n.id];
      if (!data) return n;
      return {
        ...n,
        interactionScore: data.score,
        interactionLog:   data.log,
        scoreHistory:     buildHistory(data.score, data.trend),
        ...(data.tags    ? { tags:    data.tags    } : {}),
      };
    }));

    setDimensions(prev => ({
      ...prev,
      creativity: { ...prev.creativity, health: 0.78, weeklyScore: 4, log: [
        { date: daysAgo(1), category: 'Digital / Code', note: 'Worked on FriendTree app', pts: 4 },
        { date: daysAgo(3), category: 'Design',         note: 'Made an infographic',      pts: 3 },
        { date: daysAgo(8), category: 'Visual Art',     note: 'Quick sketch session',     pts: 2 },
      ]},
      knowledge: { ...prev.knowledge, health: 0.65, weeklyScore: 3, log: [
        { date: daysAgo(2), category: 'Documentaries',    note: 'Planet Earth III ep 4',      pts: 2 },
        { date: daysAgo(5), category: 'Deep Dives',       note: 'Organic chemistry reading',  pts: 4 },
        { date: daysAgo(9), category: 'Podcasts / Audio', note: 'Huberman Lab — sleep',       pts: 2 },
      ]},
      health: { ...prev.health, health: 0.82, weeklyScore: 5, log: [
        { date: daysAgo(1), category: 'Climbing',         note: 'Bouldering — 2hrs',          pts: 5 },
        { date: daysAgo(3), category: 'Climbing',         note: 'Top rope with Hayley',       pts: 5 },
        { date: daysAgo(6), category: 'Cardio / Running', note: '5k run — 26 mins',           pts: 4 },
      ]},
      growth: { ...prev.growth, health: 0.71, weeklyScore: 3, log: [
        { date: daysAgo(2), category: 'Reflection / Journal', note: 'Weekly review',          pts: 3 },
        { date: daysAgo(6), category: 'Applied a Lesson',     note: 'Used Atomic Habits tip', pts: 5 },
      ]},
      social: { ...prev.social, health: 0.88, weeklyScore: 6, log: [
        { date: daysAgo(1), category: 'Night out',            note: 'Dinner with Imogen',     pts: 4 },
        { date: daysAgo(3), category: 'Coffee / catch-up',    note: 'Coffee with James',      pts: 3 },
        { date: daysAgo(5), category: 'Check in on someone',  note: 'Called Mum',             pts: 2 },
      ]},
    }));

    showToast('🌳 Demo loaded — leaves show budding, shrivelling & browning!');
  };


  const getCalendarLayout = useCallback(() => {
    const calendarNodes = nodes.filter(n => n.type !== 'hub' && n.birthday);

    // Parse birthday string in any reasonable format including "11th Mar 93"
    const parseBirthdayDate = (str) => {
      if (!str) return null;
      const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
      const clean = str.toLowerCase().replace(/[,\/\-\.]/g,' ').replace(/\s+/g,' ').trim();
      const tokens = clean.split(' ');
      let day = null, month = null, year = null;
      tokens.forEach(tok => {
        const stripped = tok.replace(/\D/g,'');
        const mKey = tok.replace(/[^a-z]/g,'').slice(0,3);
        if (MONTHS[mKey] !== undefined) { month = MONTHS[mKey]; return; }
        const num = parseInt(stripped, 10);
        if (isNaN(num)) return;
        if (num > 31) { year = num > 100 ? num : (num >= 0 && num <= 30 ? 2000 + num : 1900 + num); }
        else if (day === null) { day = num; }
        else if (year === null) { year = num > 100 ? num : (num >= 0 && num <= 30 ? 2000 + num : 1900 + num); }
      });
      if (!day || month === null) return null;
      const fullYear = year || 2000;
      return new Date(fullYear, month, day);
    };

    const getDayOfYear = (dateString) => {
      const d = parseBirthdayDate(dateString) || new Date(dateString);
      if (!d || isNaN(d.getTime())) return { day: 0, month: 0, year: 2000, dateStr: '' };
      const start = new Date(d.getFullYear(), 0, 0);
      const diff = d - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return { day: Math.floor(diff / oneDay), month: d.getMonth(), year: d.getFullYear(), dateStr: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
    };

    let processedNodes = calendarNodes.map(n => {
      const info = getDayOfYear(n.birthday);
      const radius = getNodeRadius(n);
      return { ...n, dayOfYear: info.day, birthMonth: info.month, birthYear: info.year, displayDate: info.dateStr, radius };
    }).sort((a, b) => a.dayOfYear - b.dayOfYear);

    const spacingPerDay = 15;
    let prevS = -99999;
    let prevRadius = 0;
    processedNodes = processedNodes.map(n => {
      let s = n.dayOfYear * spacingPerDay;
      const minRequiredDistance = (n.radius + prevRadius + 20) * CALENDAR_NODE_SCALE;
      if (s < prevS + minRequiredDistance) s = prevS + minRequiredDistance;
      prevS = s;
      prevRadius = n.radius;
      return { ...n, s };
    });

    // MONTH_S is always exactly one year of spacing — months always span the full vine
    const MONTH_S = 365 * spacingPerDay;
    // Total vine length must accommodate all nodes but is at least one year
    const MAX_S = Math.max(MONTH_S, prevS + 500 * CALENDAR_NODE_SCALE);

    // --- ORGANIC VINE WIGGLE ---
    // Pure sine looks mechanical. A vine grows with:
    //   1. A slow dominant curve (the "lean" of the vine)
    //   2. Medium sub-curves (side branches pulling it off course)
    //   3. Fine texture (tiny wobbles from tendrils/weight)
    // We layer octaves at IRRATIONAL frequency ratios so they never sync up
    // and add a phase-shift per octave so they feel independent.
    // Crucially we clamp the cumulative angle change so the vine never
    // reverses direction (no loops) — it always makes net forward progress.

    // --- LAYOUT SYSTEM ---
    // Each layout maps t∈[0,1] to an (x,y) spine point
    // Organic wiggle applied perpendicular to the spine direction
    const LAYOUTS = {
      circle: (t, perp) => {
        // Perfect geometric circle, Jan at top, clockwise
        const angle = t * Math.PI * 2 - Math.PI / 2;
        const R = 3200;
        const nx = Math.cos(angle + Math.PI / 2); // perp direction = tangent rotated 90°
        const ny = Math.sin(angle + Math.PI / 2);
        return { x: Math.cos(angle) * R + nx * perp, y: Math.sin(angle) * R + ny * perp };
      },
      spiral: (t, perp) => {
        // Outward spiral: radius grows from 800 to 3500
        const angle = t * Math.PI * 4 - Math.PI / 2; // 2 full turns
        const R = 800 + t * 2700;
        const nx = Math.cos(angle + Math.PI / 2);
        const ny = Math.sin(angle + Math.PI / 2);
        return { x: Math.cos(angle) * R + nx * perp, y: Math.sin(angle) * R + ny * perp };
      },
      line: (t, perp) => {
        // Horizontal left-to-right
        return { x: -5000 + t * 10000, y: perp };
      },
      wave: (t, perp) => {
        // Sine wave
        const x = -5000 + t * 10000;
        const y = Math.sin(t * Math.PI * 3) * 1400;
        // Perpendicular to wave tangent
        const dx = 10000, dy = Math.cos(t * Math.PI * 3) * 1400 * Math.PI * 3;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        return { x: x + (-dy/len) * perp, y: y + (dx/len) * perp };
      },
      arc: (t, perp) => {
        // Upward arc like a rainbow
        const angle = Math.PI + t * Math.PI; // left to right across top of circle
        const R = 4000;
        const nx = Math.cos(angle + Math.PI / 2);
        const ny = Math.sin(angle + Math.PI / 2);
        return { x: Math.cos(angle) * R + nx * perp, y: Math.sin(angle) * R + ny * perp };
      },
    };

    const getPoint = LAYOUTS[calendarLayout] || LAYOUTS.circle;

    // Small organic wiggle perpendicular to spine for vine texture
    const OCTAVES = [
      { freq: 6,   amp: 60,  phase: 0.0 },
      { freq: 13,  amp: 25,  phase: 2.1 },
      { freq: 23,  amp: 10,  phase: 4.7 },
    ];
    const getWiggle = (t) => {
      let w = 0;
      for (const oct of OCTAVES) w += Math.sin(t * oct.freq * Math.PI * 2 + oct.phase) * oct.amp;
      return w;
    };

    const steps = 800;
    const pathPoints = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = getPoint(t, getWiggle(t));
      pathPoints.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    const pathD = `M ${pathPoints.join(' L ')}`;

    const STRAND_COUNT = 3;
    const STRAND_SPREAD = 70;
    const strandPointArrays = Array.from({ length: STRAND_COUNT }, (_, si) => {
      const sPhase = (si / STRAND_COUNT) * Math.PI * 2;
      return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const weave = Math.sin(t * 8 * Math.PI + sPhase) * STRAND_SPREAD;
        const p = getPoint(t, getWiggle(t) + weave);
        return { x: p.x, y: p.y, t };
      });
    });

    const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

    // Compute t-bounds per month using MONTH_S — months always span 0→1 across the full vine
    let dayAccum = 0;
    const monthTBounds = DAYS_IN_MONTH.map((days) => {
      const tStart = Math.max(0, (dayAccum * spacingPerDay) / MONTH_S);
      dayAccum += days;
      const tEnd = Math.min((dayAccum * spacingPerDay) / MONTH_S, 1);
      return { tStart, tEnd };
    });

    // Per-month, per-strand path strings — carry tStart/tEnd for grown/ungrown split
    const strandSegments = monthTBounds.map(({ tStart, tEnd }) => ({
      tStart, tEnd,
      strands: Array.from({ length: STRAND_COUNT }, (_, si) => {
        const pts = strandPointArrays[si].filter(p => p.t >= tStart && p.t <= tEnd + 0.001);
        if (pts.length < 2) return { full: '', grown: '', ungrown: '' };
        const full = `M ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
        return { full, pts };
      }),
    }));

    // Month marker positions — use MONTH_S so markers always span full vine
    dayAccum = 0;
    const monthMarkers = DAYS_IN_MONTH.map((days, mi) => {
      const s = (dayAccum + days / 2) * spacingPerDay;
      dayAccum += days;
      const t = Math.min(s / MONTH_S, 1);
      const p = getPoint(t, getWiggle(t));
      return { x: p.x, y: p.y, shortLabel: MONTH_NAMES[mi], color: MONTH_COLORS[mi], t };
    });

    // Today as fraction of year — also relative to MONTH_S
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const todayT = Math.min((dayOfYear * spacingPerDay) / MONTH_S, 1);

    const LEAF_SPACING = 0.012;
    const leaves = [];
    for (let lt = LEAF_SPACING / 2; lt <= todayT; lt += LEAF_SPACING) {
      const p0 = getPoint(lt,       getWiggle(lt));
      const p1 = getPoint(lt+0.001, getWiggle(lt+0.001));
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      const side  = (leaves.length % 2 === 0) ? 1 : -1;
      const scale = 0.8 + 0.4 * Math.sin(lt * 47.3 + 1.7);
      const mi    = Math.min(11, Math.floor(lt * 12));
      leaves.push({ x: p0.x, y: p0.y, angle, side, scale, mi });
    }

    const positionedNodes = processedNodes.map(n => {
      const t = n.s / MAX_S;
      // Place photo outside the vine — perpendicular offset
      const photoOffset = n.radius * CALENDAR_NODE_SCALE * 1.15;
      const p = getPoint(t, getWiggle(t) + photoOffset);
      const currentYear = 2026;
      const age = currentYear - n.birthYear;
      const isMilestone = [16, 18, 21].includes(age) || age % 10 === 0;
      return { ...n, renderX: p.x, renderY: p.y, age, isMilestone, monthColor: MONTH_COLORS[n.birthMonth] };
    });

    return { pathD, strandSegments, monthMarkers, leaves, nodes: positionedNodes, todayT };
  }, [nodes, getNodeRadius, calendarLayout]);

  const { pathD: calendarPath, strandSegments: calendarStrandSegments, monthMarkers: calendarMonthMarkers, leaves: calendarLeaves, nodes: calendarRenderNodes, todayT: calendarTodayT = 1 } = viewMode === 'calendar' ? getCalendarLayout() : { pathD: '', strandSegments: [], monthMarkers: [], leaves: [], nodes: [], todayT: 1 };

  const ACTIVITY_LABELS = {
    message: 'Message', hangout: 'Hangout', nightout: 'Night Out',
    trip: 'Trip Away', gesture: 'Meaningful Gesture', general: 'Interaction',
  };

  const logActivity = (points, type = 'general') => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        let additionalPoints = points;
        let newDailyMessages = n.dailyMessages || { date: new Date().toDateString(), count: 0 };
        if (type === 'message') {
          const today = new Date().toDateString();
          if (newDailyMessages.date !== today) newDailyMessages = { date: today, count: 0 };
          if (newDailyMessages.count === 0) additionalPoints = 5;
          else if (newDailyMessages.count < 15) additionalPoints = 1;
          else { additionalPoints = 0; showToast("Daily messaging point cap reached."); }
          if (additionalPoints > 0) newDailyMessages.count += (additionalPoints === 5 ? 5 : 1);
        }
        if (additionalPoints <= 0) return n;
        const newScore = Math.min(MAX_SCORE, (n.interactionScore || 0) + additionalPoints);
        if (additionalPoints >= 80) showToast("🎉 Milestone Logged! Memory Bloom Triggered!");
        const logEntry = {
          label: ACTIVITY_LABELS[type] || 'Interaction',
          pts: additionalPoints,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        };
        const newLog = [...(n.interactionLog || []), logEntry].slice(-50);
        const prevScore = n.interactionScore || 0;
        // Feed social flower
        setDimensions(prev => {
          const s = prev.social || {};
          return { ...prev, social: { ...s, weeklyScore: (s.weeklyScore || 0) + Math.ceil(additionalPoints / 10) } };
        });
        const historyEntry = { score: newScore, ts: Date.now() };
        const newHistory = [...(n.scoreHistory || []), historyEntry].slice(-48);
        return { ...n, interactionScore: newScore, prevScore, dailyMessages: newDailyMessages, interactionLog: newLog, scoreHistory: newHistory };
      }
      return n;
    }));
  };

  // Simple string similarity score (0-1) — higher = more similar
  const nameSimilarity = (a, b) => {
    if (!a || !b) return 0;
    const al = a.toLowerCase(), bl = b.toLowerCase();
    if (al === bl) return 1;
    if (bl.includes(al) || al.includes(bl)) return 0.8;
    // Count shared characters
    const shared = [...al].filter(c => bl.includes(c)).length;
    return shared / Math.max(al.length, bl.length);
  };

  const createFriendFromForm = (formId, img, blob = null, nameOverride = null) => {
    const form = addFriendForms.find(f => f.id === formId);
    if (!form) return;
    const resolvedName = nameOverride || form.name;
    const newId = `node_${Date.now()}`;
    const avatarKeys = Object.keys(AVATARS);
    // Place near parent if one set, otherwise random open space
    const anchor = form.parentId
      ? nodes.find(n => n.id === form.parentId) || { x: 0, y: 0 }
      : { x: (Math.random()-0.5)*600, y: (Math.random()-0.5)*600 };
    const clearPos = findClearPosition(anchor, nodes);
    snapshot();
    setNodes(prev => [...prev, {
      id: newId,
      label: resolvedName.trim() || 'New Friend',
      img: img || AVATARS[avatarKeys[Math.floor(Math.random()*avatarKeys.length)]],
      x: clearPos.x, y: clearPos.y,
      interactionScore: form.initialScore || 0,
      pinned: false, type: 'friend',
      syncDismissed: !!img,
    }]);
    // Link to parent or auto-link to flower_social if no parent
    if (form.parentId) {
      setLinks(prev => [...prev, { source: form.parentId, target: newId }]);
    } else {
      setLinks(prev => [...prev, { source: 'flower_social', target: newId }]);
    }
    setSelectedNodeId(newId);
    setAddFriendForms(prev => prev.filter(f => f.id !== formId));
    showToast('🌱 ' + (resolvedName.trim() || 'New Friend') + ' added');
  };

  const handleImportContact = async () => {
    const currentLabel = nodes.find(n => n.id === selectedNodeId)?.label || '';
    const hasCustomName = currentLabel && currentLabel !== 'New Friend';

    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel', 'icon'];
        // If the user has typed a name, try to pass it as a search hint
        // (ContactsManager doesn't officially support pre-filtering but some implementations respect it)
        const contacts = await navigator.contacts.select(props, { multiple: false });
        if (contacts.length > 0) {
          const contact = contacts[0];
          let updates = { syncDismissed: true };
          if (contact.name?.length) updates.label = contact.name[0];
          if (contact.tel?.length) updates.phone = contact.tel[0];
          if (contact.icon?.length) {
            const blob = contact.icon[0];
            const blobReader = new FileReader();
            blobReader.onload = ev => { updates.img = ev.target.result; setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n)); };
            blobReader.readAsDataURL(blob);
          }
          setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
          showToast("Contact imported!");
        }
      } else throw new Error("API not supported");
    } catch(e) {
      showToast('Contacts unavailable on this device — enter details manually');
    }
  };

  const addFriendsFromContacts = async () => {
    const spawnNodes = (contactList) => {
      // Determine parent — selected person/hub, else flower_social, else me
      const parentNode = selectedNodeId && selectedNodeId !== 'me'
        ? nodes.find(n => n.id === selectedNodeId && n.type !== 'flower')
        : nodes.find(n => n.id === 'flower_social');
      const parent = parentNode || nodes.find(n => n.id === 'me') || { x: 0, y: 0, id: 'me' };

      const newNodes = contactList.map((contact, idx) => {
        // Place around parent using findClearPosition logic
        const angle = (idx / Math.max(contactList.length, 1)) * Math.PI * 2;
        // Snap to hex grid from parent
        const rawX = parent.x + Math.cos(angle) * (HEX_SIZE * 2.2);
        const rawY = parent.y + Math.sin(angle) * (HEX_SIZE * 2.2);
        const snapped = snapToHex(rawX, rawY);
        return {
          id: `node_${Date.now()}_${idx}`,
          label: contact.label,
          img: contact.img,
          phone: contact.phone || '',
          x: snapped.x,
          y: snapped.y,
          interactionScore: 0,
          pinned: false,
          type: 'friend',
        };
      });

      setNodes(prev => [...prev, ...newNodes]);
      // Wire each new friend back to the parent node
      setLinks(prev => [
        ...prev,
        ...newNodes.map(n => ({ source: parent.id, target: n.id })),
      ]);
      setShowTutorial(false);
      showToast(`${newNodes.length} friend${newNodes.length !== 1 ? 's' : ''} added${parentNode && parentNode.id !== 'me' ? ` via ${parent.label}` : ''}!`);
    };

    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel', 'icon'];
        const contacts = await navigator.contacts.select(props, { multiple: true });
        if (contacts.length > 0) {
          const sorted = [...contacts].sort((a, b) => (b.icon?.length || 0) - (a.icon?.length || 0));
          const mapped = await Promise.all(sorted.map(async c => {
            const fullName = c.name?.[0] || 'Friend';
            const firstName = fullName.split(' ')[0]; // first name only
            // Upscale contact thumbnail using canvas
            let img = AVATARS.james_f;
            if (c.icon?.length) {
              img = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = ev => {
                  // Draw onto larger canvas to upscale
                  const src = new Image();
                  src.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 400; canvas.height = 400;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    // Crop to square then upscale
                    const size = Math.min(src.width, src.height);
                    const sx = (src.width - size) / 2;
                    const sy = (src.height - size) / 2;
                    ctx.drawImage(src, sx, sy, size, size, 0, 0, 400, 400);
                    res(canvas.toDataURL('image/jpeg', 0.9));
                  };
                  src.src = ev.target.result;
                };
                reader.readAsDataURL(c.icon[0]);
              });
            }
            return {
              label: firstName,
              contactName: fullName !== firstName ? fullName : null, // store full name as AKA
              phone: c.tel?.[0] || '',
              img,
            };
          }));
          spawnNodes(mapped);
        }
      } else throw new Error("API not supported");
    } catch(e) {
      showToast('Contacts unavailable on this device');
    }
  };

  // Find a clear position near `nearNode` that doesn't overlap any existing node
  const findClearPosition = (nearNode, currentNodes) => {
    const MIN_DIST = 120;
    const MAX_DIST = 380;
    const STEP = 25;
    const DIRECTIONS = 20;
    const CLEAR_R = 70; // clearance radius for new position

    // Prefer to place along the line from Me toward nearNode, offset to the side
    const meNode = currentNodes.find(n => n.id === 'me') || { x: 0, y: 0 };
    const toTarget = Math.atan2(nearNode.y - meNode.y, nearNode.x - meNode.x);

    for (let dist = MIN_DIST; dist <= MAX_DIST; dist += STEP) {
      for (let di = 0; di < DIRECTIONS; di++) {
        // Bias toward perpendicular of Me→target direction
        const angle = toTarget + Math.PI * 0.5 + (di / DIRECTIONS) * Math.PI * 2;
        const cx = nearNode.x + Math.cos(angle) * dist;
        const cy = nearNode.y + Math.sin(angle) * dist;
        const clear = currentNodes.every(n => {
          const nr = n.type === 'hub' ? 70 : n.id === 'me' ? 80 : 60;
          const needed = CLEAR_R + nr;
          const ddx = n.x - cx, ddy = n.y - cy;
          return Math.sqrt(ddx*ddx + ddy*ddy) >= needed;
        });
        if (clear) return { x: cx, y: cy };
      }
    }
    // Fallback: just offset from nearNode
    return { x: nearNode.x + MIN_DIST, y: nearNode.y };
  };

  // Detect if a stroke ends in a loop (tip comes back near the start of the stroke)
  // Detect if a stroke ends in a loop (tip comes back near an earlier point)
  // Returns centroid position only — the loop itself is not drawn
  const detectLoop = (pts) => {
    if (pts.length < 8) return null;
    const tip = pts[pts.length - 1];
    const checkFrom = Math.floor(pts.length * 0.4);
    for (let i = checkFrom; i < pts.length - 4; i++) {
      const dx = tip.x - pts[i].x, dy = tip.y - pts[i].y;
      if (Math.sqrt(dx*dx + dy*dy) < 28) {
        // Use the loop-start point as the popup position, not the centroid
        // Trim the path to stop at the loop entry point
        return { cx: pts[i].x, cy: pts[i].y, trimAt: i };
      }
    }
    return null;
  };

  // Animate one vine growing along a custom path using dashoffset
  const animateVine = (linkId, totalLen) => {
    const startTime = performance.now();
    const duration = Math.min(2500, 500 + totalLen * 1.4);
    const tick = (now) => {
      const p = Math.min(1, (now - startTime) / duration);
      setGrowingVines(prev => prev.map(v => v.id === linkId ? { ...v, progress: p } : v));
      if (p < 1) requestAnimationFrame(tick);
      else {
        // Animation done — remove from growing list (link already exists in links state)
        setGrowingVines(prev => prev.filter(v => v.id !== linkId));
      }
    };
    requestAnimationFrame(tick);
  };

  const processSinglePath = (rawPts) => {
    if (rawPts.length < 4) return;

    // Smooth + downsample for analysis only (not for rendering)
    const smoothed = rawPts.map((p, i) => {
      const lo = Math.max(0, i - 1), hi = Math.min(rawPts.length - 1, i + 1);
      return { x: (rawPts[lo].x + p.x + rawPts[hi].x) / 3, y: (rawPts[lo].y + p.y + rawPts[hi].y) / 3 };
    });
    const step = Math.max(1, Math.floor(smoothed.length / 60));
    const pts = smoothed.filter((_, i) => i % step === 0);

    // Find which existing node a stretch of points passes through
    const findNodeOnSegment = (segPts, excludeId = null) => {
      let best = null, bestD = 999;
      segPts.forEach(pt => {
        nodes.forEach(n => {
          if (n.id === excludeId || n._isAnchor || n.type === 'hub') return;
          const d = Math.sqrt((n.x - pt.x) ** 2 + (n.y - pt.y) ** 2);
          // Me has a larger detection radius since it's the most common start point
          const r = n.id === 'me' ? 80 : 65;
          if (d < r && d < bestD) { bestD = d; best = n; }
        });
      });
      // Generous fallback: nearest person-node to the first point
      if (!best && segPts.length > 0) {
        const anchor = segPts[0];
        nodes.forEach(n => {
          if (n.id === excludeId || n._isAnchor || n.type === 'hub') return;
          const d = Math.sqrt((n.x - anchor.x) ** 2 + (n.y - anchor.y) ** 2);
          if (d < 150 && d < bestD) { bestD = d; best = n; }
        });
      }
      return best;
    };

    // Check for loop anywhere in the stroke
    const loop = detectLoop(pts);

    if (loop) {
      // Use the full path to find source (not just pre-loop) for better Me detection
      const sourceNode = findNodeOnSegment(pts.slice(0, loop.trimAt + 1));
      setSpawnPopup({
        x: loop.cx, y: loop.cy, r: 40,
        sourceNodeId: sourceNode?.id ?? null,
        sourceLabel: sourceNode?.label ?? null,
      });
      if (sourceNode) showToast(`Who is at the loop? (connects to ${sourceNode.label})`);
      return;
    }

    // No loop — scan full path for both nodes (allows line that overlaps Me then someone else)
    const sourceNode = findNodeOnSegment(pts.slice(0, Math.ceil(pts.length * 0.5)));
    const targetNode = findNodeOnSegment(pts.slice(Math.floor(pts.length * 0.3)), sourceNode?.id);

    if (!sourceNode || !targetNode) return; // must cross two known nodes

    // Avoid duplicate links
    const alreadyLinked = links.some(l =>
      (l.source === sourceNode.id && l.target === targetNode.id) ||
      (l.source === targetNode.id && l.target === sourceNode.id)
    );
    if (alreadyLinked) {
      showToast(`${sourceNode.label} & ${targetNode.label} are already connected`);
      re