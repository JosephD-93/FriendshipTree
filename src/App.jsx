import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Trash2, ZoomIn, ZoomOut,
  Calendar as CalendarIcon, X, Settings, 
  Moon, Sun, Cloud, Info, Activity, TreePine,
  MessageCircle, Coffee, PartyPopper, Plane, HeartHandshake, Map as MapIcon,
  BookUser
} from 'lucide-react';

const APP_VERSION = '2.8';
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


// ── FAB Component ────────────────────────────────────────────────────────────
function FabMenu(props) {
  const { theme, fabOpen, setFabOpen, fabPos, setFabPos,
    draggingFab, setDraggingFab, heldTool, setHeldTool,
    fabDragStart, fabRef, holdTimer,
    historyLen, futureLen, vineDrawMode, macheteMode, pendingPaths,
    undo, redo, setSearchOpen, setSettingsOpen,
    commitAllPaths, setVineDrawMode, setMacheteMode, setPendingPaths, setCurrentStroke
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

  const fabIconCol=fabOpen?'white':(vineDrawMode||macheteMode?'white':'#10b981');
  const fabBg=fabOpen?'#dc2626':(vineDrawMode||macheteMode?'#10b981':bg);

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
    </>
  );
}




function AppInner() {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState(() => {
    try { const s = localStorage.getItem('ft_nodes'); return s ? JSON.parse(s) : INITIAL_NODES; } catch { return INITIAL_NODES; }
  });
  const [links, setLinks] = useState(() => {
    try { const s = localStorage.getItem('ft_links'); return s ? JSON.parse(s) : INITIAL_LINKS; } catch { return INITIAL_LINKS; }
  });
  const [lastDecayCheck, setLastDecayCheck] = useState(Date.now());
  const [viewMode, setViewMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_viewMode')) || 'canvas'; } catch { return 'canvas'; }
  });
  const [calendarLayout, setCalendarLayout] = useState('circle');
  const [dimensions, setDimensions] = useState(() => {
    try { const s = localStorage.getItem('ft_dimensions'); return s ? { ...DEFAULT_DIMENSIONS, ...JSON.parse(s) } : DEFAULT_DIMENSIONS; } catch { return DEFAULT_DIMENSIONS; }
  });
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [mergePrompt, setMergePrompt] = useState(null); // {type:'group'|'friend', a, b} or null
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [notifPermission, setNotifPermission] = useState('Notification' in window ? Notification.permission : 'denied');
  const [flowerPanel, setFlowerPanel] = useState(null);
  const [dragActivity, setDragActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('social');
  const [socialView, setSocialView] = useState('grid'); // 'grid' | 'byScore' | 'byMomentum'
  const [barStyle, setBarStyle] = useState('segments');
  const [activeTags, setActiveTags] = useState([]); // tags currently filtered on
  const [tagInput, setTagInput] = useState('');     // new tag being typed in panel
  const [addFriendForms, setAddFriendForms] = useState([]);
  const [photoCrop, setPhotoCrop] = useState(null); // {nodeId, src (ORIGINAL), crop}
  const [partnerFlowerEditor, setPartnerFlowerEditor] = useState(null);
  const [pfAppearanceOpen, setPfAppearanceOpen] = useState(true);
  const [pfSelectedPart, setPfSelectedPart] = useState('main');
  const [pfColorPickerFor, setPfColorPickerFor] = useState(null);
  const [pfTab, setPfTab] = useState('design');
  const [pfEditingPresetIdx, setPfEditingPresetIdx] = useState(null);
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_flower_presets') || '[]'); } catch { return []; }
  });
  const [settingsSections, setSettingsSections] = useState({appearance:true,filters:false,data:false,reset:false,security:false,future:false});
  const [fontSize, setFontSize] = useState(() => { try { return parseFloat(localStorage.getItem('ft_fontSize')||'1'); } catch { return 1; } });
  const [dataSnapshot, setDataSnapshot] = useState(null); // {nodes, links} saved before destructive reset
  const [avatarBuilder, setAvatarBuilder] = useState(null);
  const cropCanvasRef = useRef(null);
  const cropImgRef = useRef(null);
  const cropDragRef = useRef(null);
  const idbRef = useRef(null);

  // ── IndexedDB for photo storage ───────────────────────────────────────────
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
    try { localStorage.removeItem('ft_links'); } catch {}
    showToast('🗑️ History cleared — people & photos kept');
  };

  // ── IndexedDB photo storage ───────────────────────────────────────────────
  const openPhotoDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open('FriendTreePhotos', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('photos', { keyPath: 'nodeId' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });

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
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
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
  const [toastMessage, setToastMessage] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [userIdeas, setUserIdeas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_ideas') || '[]'); } catch { return []; }
  });
  const settingsOpenTime = useRef(0);
  useEffect(() => { if (settingsOpen) settingsOpenTime.current = Date.now(); }, [settingsOpen]);
  const [tierPickMode, setTierPickMode] = useState(false);
  const [photoBorderMode, setPhotoBorderMode] = useState('none');
  const [groupColors, setGroupColors] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const [pinModal, setPinModal] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [appLocked, setAppLocked] = useState(false);
  const [lockPin, setLockPin] = useState(() => { try { return localStorage.getItem('ft_pin') || ''; } catch { return ''; } });
  const [lockTimer, setLockTimerVal] = useState(() => { try { return localStorage.getItem('ft_lockTimer') || 'close'; } catch { return 'close'; } });
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
  const [theme, setTheme] = useState({ darkMode: true, showWeathering: true, fontSize: 14 });
  const [fabOpen, setFabOpen] = useState(false);
  const [fabPos, setFabPos] = useState({ edge: 'left', offset: 0.3 });
  const [draggingFab, setDraggingFab] = useState(false);
  const [heldTool, setHeldTool] = useState(null);
  const fabDragStart = useRef(null);
  const fabRef = useRef(null);
  const holdTimer = useRef(null);
  const groupLiftTimer = useRef(null);
  const groupDragIds = useRef(null); // Set of nodeIds to move together, or null
  const groupDragOrigins = useRef({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLevelPanel, setShowLevelPanel] = useState(false);
  const [showLevelSetter, setShowLevelSetter] = useState(false);
  const [groupModal, setGroupModal] = useState(null);
  const [selectForGroupMode, setSelectForGroupMode] = useState(null);
  const [selectedForGroup, setSelectedForGroup] = useState([]);
  const selectedForGroupRef = useRef([]);

  // Keep ref in sync with state
  useEffect(() => { selectedForGroupRef.current = selectedForGroup; }, [selectedForGroup]); // null | { hubId }
  const [slashTrail, setSlashTrail] = useState([]);
  const [archivedLinks, setArchivedLinks] = useState([]);
  const [macheteMode, setMacheteMode] = useState(false);
  const [vineDrawMode, setVineDrawMode] = useState(false);
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
      // 2s hold — drag node with all directly connected friends
      groupLiftTimer.current = setTimeout(() => {
        if (!dragNode) return;
        // Use functional setState to get current nodes/links
        setNodes(currentNodes => {
          setLinks(currentLinks => {
            const draggedNode = currentNodes.find(n => n.id === nodeId);
            if (!draggedNode) return currentLinks;

            const visited = new Set([nodeId]);

            if (draggedNode.type === 'hub') {
              currentLinks.forEach(l => {
                if (l.source === nodeId) visited.add(l.target);
                if (l.target === nodeId) visited.add(l.source);
              });
              currentNodes.forEach(n => {
                if (n.type === 'flower' || n.id === 'me') visited.delete(n.id);
              });
            } else {
              const queue = [nodeId];
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
              showToast('🌿 Moving group of ' + visited.size);
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
        setNodes(prev => prev.map(n => {
          if (!groupDragIds.current.has(n.id)) return n;
          const orig = groupDragOrigins.current[n.id];
          if (!orig) return n;
          return { ...n, x: orig.x + dx, y: orig.y + dy };
        }));
      } else {
        setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: svgX, y: svgY } : n));
      }      let closest = null, minDist = INTERACTION_DISTANCE;
      nodes.forEach(n => {
        if (n.id === dragNode.id) return;
        if (n.type === 'flower' && n.id !== 'flower_social') return;
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
      if (now - lastTime < 400) {
        const tappedNode = nodes.find(n => n.id === ptr.nodeId);
        if (tapCount >= 3 && tappedNode?.type === 'hub') {
          // Triple-tap hub: toggle collapse
          setCollapsedGroups(prev =>
            prev.includes(ptr.nodeId) ? prev.filter(id => id !== ptr.nodeId) : [...prev, ptr.nodeId]
          );
          showToast(collapsedGroups.includes(ptr.nodeId) ? '📂 Group expanded' : '📁 Group collapsed');
          lastTapRef.current.delete(ptr.nodeId);
          lastTapRef.current.delete(ptr.nodeId + '_count');
        } else if (tapCount >= 2) {
          if (tappedNode?.type === 'hub') setGroupModal({ hubId: ptr.nodeId });
          else if (tappedNode?.type === 'flower') {
            // Double-tap any flower: cycle border mode (unless locked)
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
          }
          else if (tappedNode?.id === 'me') setSelectedNodeId('me');
          else setSelectedNodeId(ptr.nodeId);
          lastTapRef.current.delete(ptr.nodeId);
          lastTapRef.current.delete(ptr.nodeId + '_count');
        } else {
          lastTapRef.current.set(ptr.nodeId, now);
          lastTapRef.current.set(ptr.nodeId + '_count', tapCount);
        }
      } else {
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
        const newLog = [...(n.interactionLog || []), logEntry].slice(-50); // keep last 50
        // Feed social flower — friendship interactions boost social health
        setDimensions(prev => {
          const s = prev.social || {};
          return { ...prev, social: { ...s, weeklyScore: (s.weeklyScore || 0) + Math.ceil(additionalPoints / 10) } };
        });
        // Record score history for leaf lifecycle
        const historyEntry = { score: newScore, ts: Date.now() };
        const newHistory = [...(n.scoreHistory || []), historyEntry].slice(-48); // keep last 48 entries
        return { ...n, interactionScore: newScore, dailyMessages: newDailyMessages, interactionLog: newLog, scoreHistory: newHistory };
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

  const createFriendFromForm = (formId, img, blob = null) => {
    const form = addFriendForms.find(f => f.id === formId);
    if (!form) return;
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
      label: form.name.trim() || 'New Friend',
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
    showToast('🌱 ' + (form.name.trim() || 'New Friend') + ' added');
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
            blob = null; // handled async
            
          }
          setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
          showToast("Contact imported!");
        }
      } else throw new Error("API not supported");
    } catch {
      // Mock fallback — sort mock contacts by similarity to current label
      const mockPool = [
        { label: 'Alex Johnson', phone: '07700 900123', img: AVATARS.james_f },
        { label: 'Alice Smith',  phone: '07700 900124', img: AVATARS.alice },
        { label: 'Alicia Brown', phone: '07700 900125', img: AVATARS.priya },
        { label: 'James Walker', phone: '07700 900126', img: AVATARS.james_f },
        { label: 'Simon Taylor', phone: '07700 900127', img: AVATARS.simon },
      ];
      // Sort by similarity to current label if one exists
      const sorted = hasCustomName
        ? [...mockPool].sort((a, b) => nameSimilarity(b.label, currentLabel) - nameSimilarity(a.label, currentLabel))
        : mockPool;
      const best = sorted[0];
      setNodes(prev => prev.map(n =>
        n.id === selectedNodeId
          ? { ...n, label: best.label, phone: best.phone, img: best.img, syncDismissed: true }
          : n
      ));
      showToast(`Contacts unavailable — imported best match: ${best.label}`);
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
    } catch {
      const allAvatarKeys = Object.keys(AVATARS);
      const usedKeys = new Set();
      const pickAvatar = () => {
        const available = allAvatarKeys.filter(k => !usedKeys.has(k));
        const key = available[Math.floor(Math.random() * available.length)];
        usedKeys.add(key);
        return AVATARS[key];
      };
      const mockNames = ['Alice','James','Priya','Sam','Olivia','Marcus','Zara','Leo'];
      const mocks = Array.from({ length: 3 }, (_, i) => ({
        label: mockNames[Math.floor(Math.random() * mockNames.length)],
        img: pickAvatar(),
        phone: `07700 9001${String(i).padStart(2,'0')}`,
      }));
      spawnNodes(mocks);
      showToast("Contacts API unavailable — added 3 mock friends.");
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
      return;
    }

    // Check for a severed archived connection to restore
    const archived = archivedLinks.find(l =>
      (l.source === sourceNode.id && l.target === targetNode.id) ||
      (l.source === targetNode.id && l.target === sourceNode.id)
    );

    // Orient: closer-to-Me = source
    const mePos = nodes.find(n => n.id === 'me') || { x: 0, y: 0 };
    const srcD = Math.sqrt((sourceNode.x - mePos.x) ** 2 + (sourceNode.y - mePos.y) ** 2);
    const tgtD = Math.sqrt((targetNode.x - mePos.x) ** 2 + (targetNode.y - mePos.y) ** 2);
    const [finalSrc, finalTgt] = srcD <= tgtD
      ? [sourceNode.id, targetNode.id]
      : [targetNode.id, sourceNode.id];

    snapshot();

    if (archived) {
      setLinks(prev => [...prev, { source: finalSrc, target: finalTgt }]);
      setArchivedLinks(prev => prev.filter(l => l !== archived));
      setNodes(prev => prev.map(n =>
        n.id === finalTgt ? { ...n, interactionScore: Math.max(n.interactionScore || 0, archived.score || 0) } : n
      ));
      showToast('🌿 Reconnected — ' + sourceNode.label + ' & ' + targetNode.label);
    } else {
      // Show dotted link preview + friendship type prompt
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      setVineConnectPrompt({ srcId: finalSrc, tgtId: finalTgt, midX, midY });
    }
  };

  const commitAllPaths = () => {
    // Commit all accumulated strokes simultaneously
    pendingPaths.forEach(({ pts }) => processSinglePath(pts));
    setPendingPaths([]);
    setCurrentStroke([]);
  };

  const restoreLink = (archivedLink) => {
    // Remove from archive
    setArchivedLinks(prev => prev.filter(l => !(l.source === archivedLink.source && l.target === archivedLink.target && l.cutAt === archivedLink.cutAt)));
    // Re-add to active links (avoid duplicate)
    setLinks(prev => {
      const exists = prev.some(l => (l.source === archivedLink.source && l.target === archivedLink.target) || (l.source === archivedLink.target && l.target === archivedLink.source));
      if (exists) return prev;
      return [...prev, { source: archivedLink.source, target: archivedLink.target }];
    });
    showToast('🌿 Connection restored');
  };

  const addNewHub = () => {
    const id = `hub_${Date.now()}`;
    // Default parent is flower_social (all social connections route through it)
    // unless the user has a specific non-Me, non-hub, non-flower node selected
    const sel = selectedNodeId && nodes.find(n => n.id === selectedNodeId);
    // Anchor position — near Me if Me selected, otherwise spread out
    const anchorNode = selectedNodeId === 'me'
      ? nodes.find(n => n.id === 'me') || { x: 0, y: 0 }
      : { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 600 };

    // Try candidate positions radiating outward from the parent in 24 directions,
    // at increasing distances, until we find one that doesn't overlap any existing node.
    const MIN_DIST = 160;   // closest we'll place it
    const MAX_DIST = 420;   // furthest before giving up
    const STEP = 30;        // distance increment
    const HUB_RADIUS = 60;  // clearance bubble for the new hub sign
    const DIRECTIONS = 24;

    let bestX = anchorNode.x + MIN_DIST;
    let bestY = anchorNode.y;
    let placed = false;

    outer:
    for (let dist = MIN_DIST; dist <= MAX_DIST; dist += STEP) {
      for (let di = 0; di < DIRECTIONS; di++) {
        const angle = (di / DIRECTIONS) * Math.PI * 2;
        const cx = anchorNode.x + Math.cos(angle) * dist;
        const cy = anchorNode.y + Math.sin(angle) * dist;
        // Check clearance against every existing node
        const clear = nodes.every(n => {
          const nodeR = n.type === 'hub' ? 70 : (n.id === 'me' ? 80 : 60);
          const needed = HUB_RADIUS + nodeR;
          const dx = n.x - cx, dy = n.y - cy;
          return Math.sqrt(dx * dx + dy * dy) >= needed;
        });
        if (clear) {
          bestX = cx;
          bestY = cy;
          placed = true;
          break outer;
        }
      }
    }

    const newHub = {
      id, type: 'hub', label: 'New Group',
      x: bestX, y: bestY, pinned: false,
    };
    setNodes(prev => [...prev, newHub]);
    // Only connect to Me if Me node is selected — otherwise free-floating
    if (selectedNodeId === 'me') {
      setLinks(prev => [...prev, { source: 'me', target: id }]);
    }
    setSelectedNodeId(id);
    setGroupModal({ hubId: id });
    setShowTutorial(false);
  };

  // ── History — stored in refs to avoid re-renders breaking pointer capture ──
  const historyRef = useRef([]);
  const futureRef  = useRef([]);
  const [historyLen, setHistoryLen] = useState(0); // just for button disabled state
  const [futureLen,  setFutureLen]  = useState(0);

  const snapshot = useCallback(() => {
    // Read latest nodes/links via functional updater to avoid closure staleness
    setNodes(currentNodes => {
      setLinks(currentLinks => {
        historyRef.current = [...historyRef.current.slice(-49), { nodes: currentNodes, links: currentLinks }];
        futureRef.current  = [];
        setHistoryLen(historyRef.current.length);
        setFutureLen(0);
        return currentLinks; // no change
      });
      return currentNodes; // no change
    });
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    setNodes(currentNodes => {
      setLinks(currentLinks => {
        futureRef.current  = [{ nodes: currentNodes, links: currentLinks }, ...futureRef.current.slice(0, 49)];
        historyRef.current = historyRef.current.slice(0, -1);
        setHistoryLen(historyRef.current.length);
        setFutureLen(futureRef.current.length);
        return prev.links;
      });
      return prev.nodes;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    setNodes(currentNodes => {
      setLinks(currentLinks => {
        historyRef.current = [...historyRef.current, { nodes: currentNodes, links: currentLinks }];
        futureRef.current  = futureRef.current.slice(1);
        setHistoryLen(historyRef.current.length);
        setFutureLen(futureRef.current.length);
        return next.links;
      });
      return next.nodes;
    });
  }, []);

  // Normalise any birthday string to "11th Mar 93" format
  const normaliseBirthday = (raw) => {
    if (!raw || !raw.trim()) return '';
    const MONTHS = {
      jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
      january:1,february:2,march:3,april:4,june:6,july:7,august:8,
      september:9,october:10,november:11,december:12
    };
    const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ordinal = (n) => {
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    };
    // Extract numbers and month words from the string
    const str = raw.toLowerCase().replace(/[,\/\-\.]/g,' ').replace(/\s+/g,' ').trim();
    const tokens = str.split(' ');
    let day = null, month = null, year = null;
    tokens.forEach(tok => {
      const stripped = tok.replace(/\D/g,'');
      const num = parseInt(stripped, 10);
      if (MONTHS[tok.replace(/[^a-z]/g,'')]) {
        month = MONTHS[tok.replace(/[^a-z]/g,'')];
      } else if (!isNaN(num)) {
        if (num >= 1 && num <= 31 && day === null && (year !== null || num <= 31)) {
          // Ambiguous — if we already have a year candidate, treat as day
          if (year === null && num > 31) { year = num; }
          else if (day === null) { day = num; }
          else if (year === null) { year = num; }
        }
        if (num > 31 && num < 10000) year = num;
        else if (num >= 1 && num <= 31 && day === null) day = num;
      }
    });
    // Re-scan to separate year (4 digits or >31) from day
    tokens.forEach(tok => {
      const num = parseInt(tok.replace(/\D/g,''), 10);
      if (!isNaN(num) && num > 31) year = num;
    });
    if (!day && !month) return raw; // can't parse, return as-is
    const yearStr = year ? (year > 100 ? String(year).slice(2) : String(year).padStart(2,'0')) : '';
    const parts = [];
    if (day) parts.push(ordinal(day));
    if (month) parts.push(MONTH_SHORT[month]);
    if (yearStr) parts.push(yearStr);
    return parts.join(' ');
  };

  const [hexSnapPos, setHexSnapPos] = useState(null); // {x,y} snapped hex centre during drag

  // ── Hex grid utilities ────────────────────────────────────────────────────
  // Flat-top hexagonal grid
  const [gridStyle, setGridStyle] = useState('hex'); // 'hex' | 'hexSmall' | 'square'
  const HEX_SIZE = gridStyle === 'hexSmall' ? 65 : gridStyle === 'square' ? 90 : 110;

  const snapToHex = (x, y) => {
    if (gridStyle === 'square') {
      return { x: Math.round(x / HEX_SIZE) * HEX_SIZE, y: Math.round(y / HEX_SIZE) * HEX_SIZE };
    }
    const q = (2/3) * x / HEX_SIZE;
    const r = (-1/3) * x / HEX_SIZE + (Math.sqrt(3)/3) * y / HEX_SIZE;
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const hx = HEX_SIZE * (3/2) * rq;
    const hy = HEX_SIZE * (Math.sqrt(3)/2 * rq + Math.sqrt(3) * rr);
    return { x: hx, y: hy, q: rq, r: rr };
  };

  const hexCorners = (cx, cy) => {
    // 6 corners of a flat-top hex
    return Array.from({length: 6}, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i);
      return [cx + HEX_SIZE * Math.cos(angle), cy + HEX_SIZE * Math.sin(angle)];
    });
  };

  const hexNeighbours = (q, r) => {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
    return dirs.map(([dq, dr]) => {
      const nq = q + dq, nr = r + dr;
      const nx = HEX_SIZE * (3/2) * nq;
      const ny = HEX_SIZE * (Math.sqrt(3)/2 * nq + Math.sqrt(3) * nr);
      return { q: nq, r: nr, x: nx, y: ny };
    });
  };;

  // ── Auto-save to localStorage ─────────────────────────────────────────────
  // Debounced so photos (large base64) don't block on every render
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        // Strip photo data from localStorage — photos are stored in IndexedDB separately
        const nodesWithoutPhotos = nodes.map(n => {
          if (n.img && n.img.startsWith('data:image')) {
            const { img, ...rest } = n;
            return rest;
          }
          return n;
        });
        localStorage.setItem('ft_nodes', JSON.stringify(nodesWithoutPhotos));
      } catch(e) {
        console.warn('localStorage save failed:', e);
      }
    }, 500);
  }, [nodes]);
  useEffect(() => { try { localStorage.setItem('ft_links', JSON.stringify(links)); } catch {} }, [links]);
  useEffect(() => { try { localStorage.setItem('ft_dimensions', JSON.stringify(dimensions)); } catch {} }, [dimensions]);

  const exportData = () => {
    const data = { nodes, links, dimensions, version: 1, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `friendshiptree-${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📦 Tree exported!');
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.nodes) setNodes(data.nodes);
        if (data.links) setLinks(data.links);
        if (data.dimensions) setDimensions(prev => ({ ...prev, ...data.dimensions }));
        showToast('✅ Tree imported!');
      } catch { showToast('❌ Invalid file — could not import'); }
    };
    reader.readAsText(file);
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const requestNotifications = async () => {
    if (!('Notification' in window)) { showToast('Notifications not supported in this browser'); return; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') showToast('🔔 Notifications enabled!');
  };

  useEffect(() => {
    if (notifPermission !== 'granted') return;
    const check = () => {
      const neglected = nodes.filter(n => {
        if (n.type || n.id === 'me') return false;
        const log = n.interactionLog || [];
        if (log.length === 0) return false;
        const last = log[log.length - 1];
        const parts = (last.date || '').split(' ');
        if (parts.length < 2) return false;
        const daysSince = (Date.now() - new Date(last.date)) / 864e5;
        return daysSince > 21;
      });
      if (neglected.length > 0) {
        new Notification('FriendshipTree 🌳', {
          body: `You haven't logged anything with ${neglected[0].label}${neglected.length > 1 ? ` and ${neglected.length - 1} others` : ''} in over 3 weeks.`,
        });
      }
    };
    const iv = setInterval(check, 6 * 3600 * 1000);
    return () => clearInterval(iv);
  }, [notifPermission, nodes]);

  useEffect(() => {
    const checkWeekly = () => {
      const now = new Date();
      const weekKey = `${now.getFullYear()}-W${Math.floor(now.getDate() / 7)}`;
      setDimensions(prev => {
        const stored = prev._lastWeekKey;
        if (stored === weekKey) return prev;
        const updated = { ...prev, _lastWeekKey: weekKey };
        ['creativity','knowledge','health','growth','social'].forEach(key => {
          const dim = prev[key];
          if (!dim) return;
          const score = dim.weeklyScore || 0;
          const target = dim.weeklyTarget || 3;
          const ratio = Math.min(1, score / target);
          const delta = ratio >= 1 ? 0.08 : ratio >= 0.5 ? -0.02 : -0.06;
          updated[key] = { ...dim, health: Math.max(0, Math.min(1, (dim.health || 1) + delta)), weeklyScore: 0 };
        });
        // Auto-calc growth from average of creativity, knowledge, health
        const avg3 = ['creativity','knowledge','health'].reduce((s,k) => s + (updated[k]?.health || 0), 0) / 3;
        if (!updated.growth.manualOverride) {
          updated.growth = { ...updated.growth, health: Math.max(0, Math.min(1, avg3 * 1.05)) };
        }
        // Auto-calc social health from average friendship tier scores
        // (computed from nodes at check time — uses closure, approximate)
        if (!updated.social.manualOverride) {
          // We can't access nodes directly in this effect closure, so we use a ref approach:
          // social health nudges toward 1 if weeklyScore > 0, else decays slightly
          // The real social score feeds in from logActivity calls triggered by friendship interactions
          const socialRatio = Math.min(1, (updated.social.weeklyScore || 0) / (updated.social.weeklyTarget || 5));
          const socialDelta = socialRatio >= 1 ? 0.08 : socialRatio >= 0.3 ? -0.01 : -0.04;
          updated.social = { ...updated.social, health: Math.max(0, Math.min(1, (prev.social?.health || 1) + socialDelta)), weeklyScore: 0 };
        }
        return updated;
      });
    };
    checkWeekly();
    const iv = setInterval(checkWeekly, 1000 * 60 * 60);
    return () => clearInterval(iv);
  }, []);

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('Speech recognition not supported on this browser'); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-GB';
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setDiaryText(prev => (prev ? prev + ' ' + transcript : transcript));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  };

  // ── AI diary parsing ──────────────────────────────────────────────────────
  const parseDiaryWithAI = async () => {
    if (!diaryText.trim()) return;
    setDiaryLoading(true);
    setDiaryError('');
    setDiarySuggestions([]);

    const friendNames = nodes.filter(n => n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me').map(n => n.label);
    const dimInfo = ['creativity','knowledge','health','growth'].map(k => {
      const d = dimensions[k];
      return `${d.emoji} ${d.label} (${k}): categories = ${d.categories.join(', ')}`;
    }).join('\n');

    const prompt = `You are a life activity parser. The user has written a diary entry about their day.
Extract activities and return ONLY a JSON array (no markdown, no explanation).

Known friends: ${friendNames.join(', ')}

Life dimensions and their categories:
${dimInfo}

For each activity found, create an entry:
{
  "dim": "creativity|knowledge|health|growth",
  "category": "exact category name from the list above, or closest match",
  "note": "brief description of the activity (max 8 words)",
  "pts": 1-5 (1=brief/minor, 3=solid session, 5=major effort),
  "friendId": "friend name if a specific friend was mentioned, else null",
  "durationMins": estimated minutes if mentioned or guessable, else null
}

Diary entry:
"${diaryText}"

Return only the JSON array. If nothing trackable is found, return [].`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.map(c => c.text || '').join('').trim();
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setDiarySuggestions(parsed.map((s, i) => ({ ...s, id: `sug_${i}_${Date.now()}`, confirmed: false })));
      if (parsed.length === 0) setDiaryError('No trackable activities found — try being more specific.');
    } catch (err) {
      setDiaryError('Could not parse — check your connection or try rephrasing.');
    }
    setDiaryLoading(false);
  };

  // ── Confirm a diary suggestion ────────────────────────────────────────────
  const confirmSuggestion = (sug) => {
    // Log to dimension
    if (sug.dim && dimensions[sug.dim]) {
      setDimensions(prev => {
        const dim = prev[sug.dim];
        const newLog = [...(dim.log || []), {
          date: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
          category: sug.category,
          note: sug.note,
          pts: sug.pts || 1,
        }];
        const newScore = (dim.weeklyScore || 0) + (sug.pts || 1);
        const newHealth = Math.min(1, (dim.health || 0.5) + 0.04);
        return { ...prev, [sug.dim]: { ...dim, log: newLog, weeklyScore: newScore, health: newHealth } };
      });
    }
    // Log to friend if mentioned
    if (sug.friendId) {
      const friend = nodes.find(n => n.label?.toLowerCase().includes(sug.friendId?.toLowerCase()));
      if (friend) {
        const pts = sug.dim === 'health' ? 50 : 20;
        setNodes(prev => prev.map(n => n.id === friend.id
          ? { ...n, interactionScore: Math.min(MAX_SCORE, (n.interactionScore || 0) + pts),
              interactionLog: [...(n.interactionLog || []), {
                label: `${sug.note} (${sug.category})`,
                pts,
                date: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
              }] }
          : n
        ));
      }
    }
    // Mark as confirmed (hide from list)
    setDiarySuggestions(prev => prev.map(s => s.id === sug.id ? { ...s, confirmed: true } : s));
  };

  const confirmAllSuggestions = () => {
    diarySuggestions.filter(s => !s.confirmed).forEach(confirmSuggestion);
  };

  const updateSelectedNode = (key, value) => {
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, [key]: value } : n));
  };

  // Returns true if segments (p1→p2) and (p3→p4) intersect
  const segmentsIntersect = (p1, p2, p3, p4) => {
    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-10) return false;
    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };

  // Check if the slash trail's last segment crosses any active link's centre-line
  const checkSlashCuts = (trail) => {
    if (trail.length < 2) return;
    const p1 = trail[trail.length - 2];
    const p2 = trail[trail.length - 1];
    setLinks(prev => {
      const cut = [];
      const remaining = prev.filter(link => {
        const src = nodes.find(n => n.id === link.source);
        const tgt = nodes.find(n => n.id === link.target);
        if (!src || !tgt) return true;
        const crosses = segmentsIntersect(p1, p2,
          { x: src.x, y: src.y },
          { x: tgt.x, y: tgt.y }
        );
        if (crosses) { cut.push(link); return false; }
        return true;
      });
      if (cut.length > 0) {
        setArchivedLinks(arch => [...arch, ...cut.map(l => ({
          ...l,
          cutAt: Date.now(),
          score: nodes.find(n => n.id === l.source)?.interactionScore
               ?? nodes.find(n => n.id === l.target)?.interactionScore
               ?? 0,
        }))]);
        showToast(`✂️ ${cut.length} connection${cut.length > 1 ? 's' : ''} severed`);
      }
      return remaining;
    });
  };

  // All unique tags across all people
  const allTags = useMemo(() => {
    const tags = new Set();
    nodes.forEach(n => (n.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [nodes]);

  // IDs of people that pass the active tag filter (empty = show all)
  const tagFilteredIds = useMemo(() => {
    if (activeTags.length === 0) return null; // null = no filter
    return new Set(
      nodes.filter(n => activeTags.every(t => (n.tags || []).includes(t))).map(n => n.id)
    );
  }, [nodes, activeTags]);

  const isTagFiltered = (nodeId) => tagFilteredIds === null || tagFilteredIds.has(nodeId);

  const nodeTransition = (nodeId) =>
    liftedNodeId === nodeId ? 'transform 0.15s ease-out, opacity 0.15s ease-out' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease';

  const activeRenderNodes = viewMode === 'calendar' ? calendarRenderNodes : nodes.map(node => {
    return { ...node, renderX: node.x, renderY: node.y, radius: getNodeRadius(node) };
  });

  const svgGroupRef = useRef(null);

  // Apply transform directly to SVG group for smooth panning (bypasses React re-render)
  const applyTransform = useCallback((t) => {
    if (svgGroupRef.current) {
      svgGroupRef.current.setAttribute('transform', `translate(${t.x}, ${t.y}) scale(${t.scale})`);
    }
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const bgClass = theme.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';
  const sidebarBg = theme.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const panelBg = theme.darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700';

  let nextMessagePoints = 5;
  if (selectedNode && selectedNode.type !== 'hub') {
    const today = new Date().toDateString();
    const msgs = selectedNode.dailyMessages;
    if (msgs && msgs.date === today) {
      if (msgs.count >= 15) nextMessagePoints = 0;
      else if (msgs.count > 0) nextMessagePoints = 1;
    }
  }

  // --- FRIENDSHIP LEVELS ---
  const FRIENDSHIP_LEVELS = [
    { tier: 1, label: 'Acquaintance',  emoji: '🌱', color: '#84cc16',
      desc: 'You know their name and share a nod in passing. The seed is planted but roots have not formed yet.',
      scoreRange: '0 – 99' },
    { tier: 2, label: 'Friendly',      emoji: '🌿', color: '#22c55e',
      desc: 'You chat when you meet and might grab a coffee. Warmth without depth yet.',
      scoreRange: '100 – 299' },
    { tier: 3, label: 'Good Friend',   emoji: '🌳', color: '#16a34a',
      desc: 'You actively make plans, share laughs and some personal things. They would show up if you needed them.',
      scoreRange: '300 – 599' },
    { tier: 4, label: 'Close Friend',  emoji: '🌲', color: '#15803d',
      desc: 'Deep mutual trust. You know their fears and dreams. You would drop things for each other without thinking.',
      scoreRange: '600 – 999' },
    { tier: 5, label: 'Kindred Spirit',emoji: '✨', color: '#14532d',
      desc: 'A rare bond. They feel like family. History, honesty, and unconditional presence define this connection.',
      scoreRange: '1000+' },
    { tier: 'family', label: 'Family', emoji: '🏠', color: '#f59e0b',
      desc: 'Blood or chosen — these people are home. The bond exists independent of interaction frequency.',
      scoreRange: 'Always' },
    { tier: 'partner', label: 'Partner', emoji: '💗', color: '#f43f5e',
      desc: 'Your person. The highest level of connection — romantic or platonic soulmate.',
      scoreRange: 'Always' },
  ];
  const getTier = (score, node) => {
    if (node?.isPartner) return 'partner';
    if (node?.isFamily) return 'family';
    return score < 100 ? 1 : score < 300 ? 2 : score < 600 ? 3 : score < 1000 ? 4 : 5;
  };
  const TIER_SCORE_MAP = [0, 0, 100, 300, 600, 1000];
  // Safe level lookup — handles both numeric tiers and 'family'
  const getLevel = (score, node) => {
    const t = getTier(score, node);
    return FRIENDSHIP_LEVELS.find(l => l.tier === t) || FRIENDSHIP_LEVELS[0];
  };

  return (
    <div className={`fixed inset-0 font-sans overflow-hidden transition-colors duration-300 ${bgClass}`}
      style={{
        fontSize: `${fontSize}rem`,
        display:'flex', flexDirection:'column',
        background: theme.darkMode ? '#0f172a' : '#f8fafc',
        color: theme.darkMode ? '#f1f5f9' : '#1e293b',
      }}>
      
      {/* ── Draggable Edge-Snapping FAB ─────────────────────────────────────── */}
      {/* ── FAB ── */}
      {viewMode === "canvas" && <FabMenu
        theme={theme} viewMode={viewMode}
        fabOpen={fabOpen} setFabOpen={setFabOpen}
        fabPos={fabPos} setFabPos={setFabPos}
        draggingFab={draggingFab} setDraggingFab={setDraggingFab}
        heldTool={heldTool} setHeldTool={setHeldTool}
        fabDragStart={fabDragStart} fabRef={fabRef} holdTimer={holdTimer}
        historyLen={historyLen} futureLen={futureLen}
        vineDrawMode={vineDrawMode} macheteMode={macheteMode} pendingPaths={pendingPaths}
        undo={undo} redo={redo} setSearchOpen={setSearchOpen} setSettingsOpen={setSettingsOpen}
        commitAllPaths={commitAllPaths} setVineDrawMode={setVineDrawMode}
        setMacheteMode={setMacheteMode} setPendingPaths={setPendingPaths} setCurrentStroke={setCurrentStroke}
      />}
      {/* Settings panel — full height slide-in from right */}
      {settingsOpen && (
        <div
          onPointerDown={e=>{
            const panel = e.currentTarget.children[0];
            if (panel && !panel.contains(e.target)) {
              // Guard: ignore if opened within last 400ms (prevents same-tap close)
              if (Date.now() - settingsOpenTime.current > 400) {
                setSettingsOpen(false);
              }
            }
          }}
          style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:400,background:'rgba(0,0,0,0.4)'}}>
          <div
            style={{
            position:'absolute',top:0,right:0,bottom:56,width:'min(100vw,320px)',
            display:'flex',flexDirection:'column',
            background:theme.darkMode?'#0f172a':'white',
            boxShadow:'-4px 0 32px rgba(0,0,0,0.3)',
            overflow:'hidden',
          }}>
            {/* Fixed header */}
            <div style={{
              padding:'16px 20px',flexShrink:0,
              borderBottom:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),
              display:'flex',alignItems:'center',justifyContent:'space-between',
              background:theme.darkMode?'#0f172a':'white',
              zIndex:1,
            }}>
              <span style={{fontWeight:800,fontSize:16,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>⚙️ Settings</span>
              <button onClick={()=>setSettingsOpen(false)}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:22,lineHeight:1,color:theme.darkMode?'#64748b':'#94a3b8'}}>✕</button>
            </div>
            {/* Scrollable body — fills remaining space */}
            <div style={{
              flex:1,
              overflowY:'scroll',
              WebkitOverflowScrolling:'touch',
              padding:'12px 20px 32px',
              minHeight:0,
            }}>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {(()=>{
                  const tog=(k)=>setSettingsSections(p=>({...p,[k]:!p[k]}));
                  const SH=({k,label})=>(
                    <button onClick={()=>tog(k)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'12px 0',background:'none',border:'none',borderBottom:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),cursor:'pointer',color:theme.darkMode?'#e2e8f0':'#1e293b'}}>
                      <span style={{fontSize:13,fontWeight:800}}>{label}</span>
                      <span style={{fontSize:12,color:theme.darkMode?'#475569':'#94a3b8'}}>{settingsSections[k]?'▲':'▼'}</span>
                    </button>
                  );
                  return (<>

                  <SH k="appearance" label="🎨 Appearance"/>
                  {settingsSections.appearance&&<div style={{padding:'8px 0'}}>
                    {[{label:'Weathered Hubs',ctrl:<input type="checkbox" checked={theme.showWeathering} onChange={e=>setTheme(p=>({...p,showWeathering:e.target.checked}))} style={{width:18,height:18,accentColor:'#10b981'}}/>},{label:'🌙 Dark Mode',ctrl:<input type="checkbox" checked={theme.darkMode} onChange={e=>setTheme(p=>({...p,darkMode:e.target.checked}))} style={{width:18,height:18,accentColor:'#10b981'}}/>}].map((row,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}><span style={{fontSize:14,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>{row.label}</span>{row.ctrl}</div>
                    ))}
                    <div style={{padding:'12px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                      <div style={{fontSize:13,fontWeight:700,color:theme.darkMode?'#94a3b8':'#64748b',marginBottom:8}}>⬡ Grid Style</div>
                      <div style={{display:'flex',gap:6}}>{[{id:'hex',label:'Hex'},{id:'hexSmall',label:'Small Hex'},{id:'square',label:'Square'}].map(g=>(
                        <button key={g.id} onClick={()=>setGridStyle(g.id)} style={{flex:1,padding:'7px 2px',borderRadius:8,border:'2px solid '+(gridStyle===g.id?'#10b981':(theme.darkMode?'#334155':'#e2e8f0')),background:gridStyle===g.id?'#10b981':(theme.darkMode?'#1e293b':'#f8fafc'),color:gridStyle===g.id?'white':(theme.darkMode?'#94a3b8':'#64748b'),fontSize:11,fontWeight:700,cursor:'pointer'}}>{g.label}</button>
                      ))}</div>
                    </div>
                    <div style={{padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:14,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>🔤 Text size</span>
                        <span style={{fontSize:12,color:theme.darkMode?'#64748b':'#94a3b8',fontWeight:600}}>{fontSize===0.85?'Small':fontSize===1?'Default':fontSize===1.15?'Large':'X-Large'}</span>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        {[{v:0.85,l:'S'},{v:1,l:'M'},{v:1.15,l:'L'},{v:1.3,l:'XL'}].map(({v,l})=>(
                          <button key={v} onClick={()=>{setFontSize(v);try{localStorage.setItem('ft_fontSize',String(v));}catch{}}}
                            style={{flex:1,padding:'6px 0',borderRadius:8,fontWeight:700,cursor:'pointer',border:'1.5px solid '+(fontSize===v?'#10b981':(theme.darkMode?'#334155':'#e2e8f0')),background:fontSize===v?'#10b981':'transparent',color:fontSize===v?'white':(theme.darkMode?'#94a3b8':'#64748b'),fontSize:l==='S'?11:l==='M'?13:l==='L'?15:17}}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0'}}>
                      <span style={{fontSize:14,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>🔔 Notifications</span>
                      {notifPermission==='granted'?<span style={{fontSize:12,color:'#10b981',fontWeight:700}}>Enabled ✓</span>:<button onClick={requestNotifications} style={{padding:'5px 14px',borderRadius:99,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>Enable</button>}
                    </div>
                  </div>}

                  <SH k="filters" label="🏷 Filters"/>
                  {settingsSections.filters&&<div style={{padding:'8px 0'}}>
                    {activeTags.length>0&&activeTags.length<allTags.length&&<button onClick={()=>setActiveTags([])} style={{fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontWeight:700,marginBottom:6}}>Show all</button>}
                    {allTags.length===0?<p style={{fontSize:12,fontStyle:'italic',color:theme.darkMode?'#475569':'#94a3b8',margin:'0 0 8px'}}>No tags yet</p>
                    :<div style={{display:'flex',flexDirection:'column',gap:4}}>{allTags.map(tag=>{
                      const hidden=activeTags.length>0&&!activeTags.includes(tag);
                      const count=nodes.filter(n=>(n.tags||[]).includes(tag)).length;
                      return(<label key={tag} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'3px 0'}}>
                        <input type="checkbox" checked={!hidden} onChange={()=>{if(activeTags.length===0){setActiveTags(allTags.filter(t=>t!==tag));}else if(activeTags.includes(tag)){const nx=activeTags.filter(t=>t!==tag);setActiveTags(nx.length===allTags.length?[]:nx);}else{const nx=[...activeTags,tag];setActiveTags(nx.length===allTags.length?[]:nx);}}} style={{width:16,height:16,accentColor:'#10b981',cursor:'pointer',flexShrink:0}}/>
                        <span style={{flex:1,fontSize:13,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>{tag}</span>
                        <span style={{fontSize:11,color:theme.darkMode?'#475569':'#94a3b8'}}>{count}p</span>
                      </label>);
                    })}</div>}
                  </div>}

                  <SH k="data" label="💾 Data"/>
                  {settingsSections.data&&<div style={{padding:'8px 0'}}>
                    {[{label:'🌱 Start Blank',btnLabel:'Reset',btnBg:'#64748b',onClick:()=>{setSettingsOpen(false);const doReset=()=>{clearTimeout(saveTimer.current);setNodes(INITIAL_NODES);setLinks(INITIAL_LINKS);setDimensions(DEFAULT_DIMENSIONS);try{localStorage.removeItem('ft_nodes');localStorage.removeItem('ft_links');localStorage.removeItem('ft_dimensions');}catch{}clearPhotoDB();showToast('🌱 Fresh start!');};const run=()=>localStorage.getItem('ft_pin')?openPinModal('clear','Confirm Reset',doReset):doReset();setConfirmModal({title:'Start Blank?',message:'Removes all people, groups, photos and history.',danger:true,onConfirm:run});}},
                      {label:'✨ Demo Data',btnLabel:'Load',btnBg:'#10b981',onClick:()=>{setSettingsOpen(false);setConfirmModal({title:'Load Demo Data?',message:'Replaces your current tree with example data.',danger:false,onConfirm:()=>loadDemoData()});}},
                    ].map((row,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                        <span style={{fontSize:14,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>{row.label}</span>
                        <button onClick={row.onClick} style={{padding:'5px 14px',borderRadius:99,background:row.btnBg,color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>{row.btnLabel}</button>
                      </div>
                    ))}
                  </div>}

                  <SH k="reset" label="🗑️ Reset"/>
                  {settingsSections.reset&&<div style={{padding:'8px 0'}}>
                    {[
                      {label:'📋 Logs & history',desc:'Keeps tier, sets score to 50% in current tier',title:'Reset Logs?',msg:'Clears logs. Scores set to tier midpoints.',onConfirm:()=>{setNodes(prev=>prev.map(n=>{const s=n.interactionScore||0;const mid=s<100?50:s<300?200:s<600?450:s<1000?800:1200;return{...n,interactionScore:mid,prevScore:mid,log:[]};} ));setDimensions(prev=>{const r={};Object.keys(prev).forEach(k=>{r[k]={...prev[k],log:[],weeklyScore:0};});return r;});showToast('📋 Done');}},
                      {label:'📓 Diary entries',desc:'Clears all diary entries',title:'Clear Diaries?',msg:'Removes diary entries from all people.',onConfirm:()=>{setNodes(prev=>prev.map(n=>({...n,diaryEntries:[]})));showToast('📓 Diaries cleared');}},
                      {label:'⭐ Friendship scores',desc:"Reset scores — pick each person's tier on map",title:'Reset Scores?',msg:'Resets all scores. Each person shows tier picker on return.',onConfirm:()=>{setNodes(prev=>prev.map(n=>n.type==='friend'||n.id==='me'?{...n,interactionScore:0,prevScore:0}:n));setTierPickMode(true);showToast('⭐ Tap each person to set their level');}},
                      {label:'🔗 Connections',desc:'Removes all vines & groups, keeps people',title:'Remove Connections?',msg:'Removes all vines and groups. People and photos stay.',onConfirm:()=>{setNodes(prev=>prev.filter(n=>n.type!=='hub'));setLinks(INITIAL_LINKS);setArchivedLinks([]);try{localStorage.removeItem('ft_links');}catch{}showToast('🔗 Done');}},
                      {label:'👥 People',desc:'Removes all people, keeps Me',title:'Remove People?',msg:'Deletes all person nodes except Me.',onConfirm:()=>{setNodes(prev=>prev.filter(n=>n.type==='hub'||n.type==='flower'||n.id==='me'));setLinks(prev=>prev.filter(l=>{const sn=nodes.find(n=>n.id===l.source);const tn=nodes.find(n=>n.id===l.target);return(sn?.type==='hub'||sn?.type==='flower'||sn?.id==='me')&&(tn?.type==='hub'||tn?.type==='flower'||tn?.id==='me');}));clearPhotoDB();showToast('👥 Done');}},
                      {label:'📸 Photos',desc:'Replaces photos with blank avatars',title:'Remove Photos?',msg:'Replaces uploaded photos with default avatars.',onConfirm:()=>{clearPhotoDB();const ak=Object.keys(AVATARS);setNodes(prev=>prev.map(n=>n.type==='friend'||n.id==='me'?{...n,img:AVATARS[ak[Math.floor(Math.random()*ak.length)]]}:n));showToast('📸 Done');}},
                      {label:'🌳 Groups',desc:'Removes group hubs, keeps people',title:'Remove Groups?',msg:'Deletes all group hubs. People remain.',onConfirm:()=>{setNodes(prev=>prev.filter(n=>n.type!=='hub'));setLinks(prev=>prev.filter(l=>{const sn=nodes.find(n=>n.id===l.source);const tn=nodes.find(n=>n.id===l.target);return sn?.type!=='hub'&&tn?.type!=='hub';}));showToast('🌳 Done');}},
                    ].map((row,i)=>(
                      <div key={i} style={{padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>{row.label}</div>
                            <div style={{fontSize:11,color:theme.darkMode?'#475569':'#94a3b8',marginTop:1}}>{row.desc}</div>
                          </div>
                          <button onClick={()=>{setSettingsOpen(false);setConfirmModal({title:row.title,message:row.msg,danger:true,onConfirm:row.onConfirm});}} style={{flexShrink:0,padding:'4px 12px',borderRadius:99,background:'#ef4444',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>Reset</button>
                        </div>
                      </div>
                    ))}
                  </div>}

                  </>);
                })()}
                {/* Security */}
                <button onClick={()=>setSettingsSections(p=>({...p,security:!p.security}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'12px 0',background:'none',border:'none',borderBottom:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),cursor:'pointer',color:theme.darkMode?'#e2e8f0':'#1e293b'}}>
                  <span style={{fontSize:13,fontWeight:800}}>🔒 Security</span>
                  <span style={{fontSize:12,color:theme.darkMode?'#475569':'#94a3b8'}}>{settingsSections.security?'▲':'▼'}</span>
                </button>
                {settingsSections.security&&<div style={{padding:'8px 0'}}>

                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                  <span style={{fontSize:14,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>🔒 App PIN</span>
                  {localStorage.getItem('ft_pin')?(
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setSettingsOpen(false);openPinModal('verify','Current PIN',()=>openPinModal('set','New PIN'));}} style={{padding:'5px 10px',borderRadius:99,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>Change</button>
                      <button onClick={()=>{setSettingsOpen(false);openPinModal('verify','Remove PIN',()=>{localStorage.removeItem('ft_pin');showToast('🔓 PIN removed');});}} style={{padding:'5px 10px',borderRadius:99,background:'#64748b',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>Remove</button>
                    </div>
                  ):(
                    <button onClick={()=>{setSettingsOpen(false);openPinModal('set','Set App PIN');}} style={{padding:'5px 14px',borderRadius:99,background:'#6366f1',color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>Set PIN</button>
                  )}
                </div>

                {localStorage.getItem('ft_pin')&&(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid '+(theme.darkMode?'#1e293b':'#f1f5f9')}}>
                    <span style={{fontSize:13,color:theme.darkMode?'#94a3b8':'#64748b'}}>Lock after</span>
                    <select value={lockTimer} onChange={e=>{setLockTimerVal(e.target.value);localStorage.setItem('ft_lockTimer',e.target.value);}}
                      style={{fontSize:12,padding:'5px 8px',borderRadius:8,border:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),background:theme.darkMode?'#1e293b':'white',color:theme.darkMode?'#e2e8f0':'#1e293b',outline:'none'}}>
                      <option value="close">App close</option>
                      <option value="5min">5 minutes</option>
                      <option value="1hour">1 hour</option>
                      <option value="1day">1 day</option>
                    </select>
                  </div>
                )}
                </div>}

                {/* Version */}
                <div style={{textAlign:'center',paddingTop:16,paddingBottom:4}}>
                  <span style={{fontSize:11,color:theme.darkMode?'#334155':'#cbd5e1'}}>🌳 FriendshipTree v{APP_VERSION}</span>
                </div>

                {/* Future Updates */}
                <button onClick={()=>setSettingsSections(p=>({...p,future:!p.future}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'12px 0',background:'none',border:'none',borderBottom:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),cursor:'pointer',color:theme.darkMode?'#e2e8f0':'#1e293b'}}>
                  <span style={{fontSize:13,fontWeight:800}}>🚀 Future Updates</span>
                  <span style={{fontSize:12,color:theme.darkMode?'#475569':'#94a3b8'}}>{settingsSections.future?'▲':'▼'}</span>
                </button>
                {settingsSections.future&&<div style={{padding:'8px 0'}}>
                {(() => {
                  const plannedItems = [
                    'Notification reminders for neglected friendships',
                    'Photo quality improvement for contact sync',
                    'Corner-aware FAB fan layout',
                    'Diary AI analysis improvements',
                    'Export/share individual person profiles',
                    'Bulk import from contacts with preview',
                    'Friendship health decay tuning per person',
                    'Group colour themes',
                    'Search across notes and diary entries',
                  ];

                  const saveIdea = () => {
                    const trimmed = newIdea.trim();
                    if (!trimmed) return;
                    const updated = [...userIdeas, trimmed];
                    setUserIdeas(updated);
                    localStorage.setItem('ft_ideas', JSON.stringify(updated));
                    setNewIdea('');
                  };

                  const removeIdea = (i) => {
                    const updated = userIdeas.filter((_,idx)=>idx!==i);
                    setUserIdeas(updated);
                    localStorage.setItem('ft_ideas', JSON.stringify(updated));
                  };

                  return (
                    <div>
                      <button onClick={()=>setFutureOpen(p=>!p)} style={{
                        width:'100%',padding:'8px 12px',borderRadius:10,border:'none',cursor:'pointer',
                        background:theme.darkMode?'#1e293b':'#f1f5f9',
                        color:theme.darkMode?'#94a3b8':'#64748b',
                        fontSize:12,fontWeight:600,textAlign:'left',
                        display:'flex',justifyContent:'space-between',alignItems:'center',
                      }}>
                        <span>View planned features & ideas</span>
                        <span>{futureOpen?'▲':'▼'}</span>
                      </button>

                      {futureOpen && (
                        <div style={{marginTop:8,padding:'12px',borderRadius:10,background:theme.darkMode?'#0f172a':'#f8fafc',border:'1px solid '+(theme.darkMode?'#1e293b':'#e2e8f0')}}>
                          <div style={{fontSize:11,fontWeight:700,color:theme.darkMode?'#475569':'#94a3b8',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Planned</div>
                          {plannedItems.map((item,i)=>(
                            <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:5}}>
                              <span style={{color:'#10b981',flexShrink:0,marginTop:1}}>•</span>
                              <span style={{fontSize:12,color:theme.darkMode?'#94a3b8':'#475569',lineHeight:1.4}}>{item}</span>
                            </div>
                          ))}
                          {userIdeas.length>0&&(
                            <>
                              <div style={{fontSize:11,fontWeight:700,color:theme.darkMode?'#475569':'#94a3b8',margin:'12px 0 8px',textTransform:'uppercase',letterSpacing:0.5}}>Your Ideas</div>
                              {userIdeas.map((idea,i)=>(
                                <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:5}}>
                                  <span style={{color:'#6366f1',flexShrink:0,marginTop:1}}>•</span>
                                  <span style={{flex:1,fontSize:12,color:theme.darkMode?'#94a3b8':'#475569',lineHeight:1.4}}>{idea}</span>
                                  <button onClick={()=>removeIdea(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:14,padding:0,flexShrink:0,lineHeight:1}}>×</button>
                                </div>
                              ))}
                            </>
                          )}
                          <div style={{display:'flex',gap:6,marginTop:12}}>
                            <input value={newIdea} onChange={e=>setNewIdea(e.target.value)}
                              onKeyDown={e=>{if(e.key==='Enter')saveIdea();}}
                              placeholder="Add your idea…"
                              style={{flex:1,padding:'6px 10px',borderRadius:8,fontSize:12,outline:'none',
                                border:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),
                                background:theme.darkMode?'#1e293b':'white',
                                color:theme.darkMode?'#e2e8f0':'#1e293b'}}
                            />
                            <button onClick={saveIdea} style={{padding:'6px 12px',borderRadius:8,background:'#6366f1',color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                </div>}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add menu — triggered from bottom tab */}
      {showAddMenu && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setShowAddMenu(false)}/>
          <div style={{
            position:'fixed', bottom:68, right:8, zIndex:200,
            background:theme.darkMode?'#1e293b':'white',
            borderRadius:16, overflow:'hidden',
            boxShadow:'0 -4px 32px rgba(0,0,0,0.35)',
            border:'1px solid '+(theme.darkMode?'#334155':'#e2e8f0'),
            minWidth:190, width:'auto',
          }}>
            {[
              {icon:'👤', label:'Add Friend', onClick:()=>{ setAddFriendForms(prev=>[...prev,{id:`form_${Date.now()}`,name:'',parentId:null}]); setShowAddMenu(false); }},
              {icon:'🌳', label:'Add Group', onClick:()=>{addNewHub();setShowAddMenu(false);}},
              {icon:'📤', label:'Export Tree', onClick:()=>{exportData();setShowAddMenu(false);}},
            ].map((item,i,arr)=>(
              <React.Fragment key={item.label}>
                <button onClick={item.onClick}
                  style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'13px 18px',background:'none',border:'none',cursor:'pointer',fontSize:14,fontWeight:600,color:theme.darkMode?'#e2e8f0':'#1e293b',textAlign:'left',whiteSpace:'nowrap'}}>
                  <span style={{fontSize:18,width:24,textAlign:'center'}}>{item.icon}</span>{item.label}
                </button>
                {i<arr.length-1&&<div style={{height:1,background:theme.darkMode?'#334155':'#f1f5f9',marginLeft:54}}/>}
              </React.Fragment>
            ))}
            <div style={{height:1,background:theme.darkMode?'#334155':'#f1f5f9',marginLeft:54}}/>
            <label style={{display:'flex',alignItems:'center',gap:12,width:'100%',padding:'13px 18px',cursor:'pointer',fontSize:14,fontWeight:600,color:theme.darkMode?'#e2e8f0':'#1e293b',whiteSpace:'nowrap'}}>
              <span style={{fontSize:18,width:24,textAlign:'center'}}>📦</span>Import Tree
              <input type="file" accept=".json" style={{display:'none'}} onChange={e=>{ if(e.target.files[0]) importData(e.target.files[0]); setShowAddMenu(false); }}/>
            </label>
          </div>
        </>
      )}

      {/* Sidebar — fixed overlay, slides in from left */}
      <div className={`border-r shadow-2xl flex flex-col z-40 transition-all duration-300 ${sidebarBg}`}
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: '20rem',
          transform: selectedNode || addFriendForms.length > 0 ? 'translateX(0)' : 'translateX(-100%)',
          paddingBottom: 56,
        }}>
        <div className={`p-6 border-b flex justify-between items-center ${theme.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
          <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Friendship Tree</h1>
          {selectedNode && <button onClick={() => { setSelectedNodeId(null); setAddFriendForms([]); setShowPhotoOptions(false); }} className={`p-2 rounded-full ${theme.darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedNode ? (
            <div className="space-y-6">

              {/* ── Me Profile Panel ──────────────────────────────────── */}
              {selectedNode.id === 'me' && (
                <div className="space-y-5">
                  <div className="flex items-center space-x-4">
                    {/* Me photo */}
                    <button onClick={() => setShowPhotoOptions(p => !p)}
                      className={`w-20 h-20 rounded-full overflow-hidden border-4 cursor-pointer flex-shrink-0 ${theme.darkMode?'border-indigo-500':'border-indigo-400'}`}
                      style={{padding:0,background:'none'}}>
                      <img src={selectedNode.img} alt="Me" className="w-full h-full object-cover"/>
                    </button>
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{color:theme.darkMode?'#94a3b8':'#64748b'}}>Your name</div>
                      <input type="text" value={selectedNode.label || ''}
                        onChange={e => updateSelectedNode('label', e.target.value)}
                        placeholder="Your name"
                        className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none ${theme.darkMode?'bg-slate-700 border-slate-600 text-white':'bg-white border-slate-200'}`}
                      />
                      {selectedNode.contactName && selectedNode.contactName !== selectedNode.label && (
                        <div style={{fontSize:10,color:theme.darkMode?'#64748b':'#94a3b8',fontStyle:'italic',marginTop:2}}>
                          aka {selectedNode.contactName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo picker */}
                  {showPhotoOptions && (
                    <div className={`rounded-xl border overflow-hidden ${theme.darkMode?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>
                      <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm font-medium ${theme.darkMode?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-50 text-slate-700'}`}>
                        📷 Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files[0]; if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => { setPhotoCrop({ nodeId: 'me', src: ev.target.result, crop: { x:0, y:0, scale:1 } }); setShowPhotoOptions(false); };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      <div className={`border-t ${theme.darkMode?'border-slate-700':'border-slate-100'}`}/>
                      <button onClick={() => { setAvatarBuilder({ nodeId: 'me' }); setShowPhotoOptions(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left ${theme.darkMode?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-50 text-slate-700'}`}>
                        🎨 Build Avatar
                      </button>
                    </div>
                  )}

                  {/* Sync from contacts */}
                  {'contacts' in navigator && (
                    <button onClick={async () => {
                      try {
                        const contacts = await navigator.contacts.select(['name','email','tel','icon'], { multiple: false });
                        if (contacts.length > 0) {
                          const c = contacts[0];
                          const fullName = c.name?.[0] || '';
                          const firstName = fullName.split(' ')[0];
                          if (firstName) updateSelectedNode('label', firstName);
                          if (fullName && fullName !== firstName) updateSelectedNode('contactName', fullName);
                          if (c.tel?.[0]) updateSelectedNode('phone', c.tel[0]);
                          if (c.email?.[0]) updateSelectedNode('email', c.email[0]);
                          if (c.icon?.[0]) {
                            const reader = new FileReader();
                            reader.onload = ev => setPhotoCrop({ nodeId: 'me', src: ev.target.result, crop: { x:0, y:0, scale:1 } });
                            reader.readAsDataURL(c.icon[0]);
                          }
                          showToast('✅ Synced from contacts!');
                        }
                      } catch(e) { showToast('Could not access contacts'); }
                    }} className="w-full py-2 rounded-xl text-sm font-bold text-white" style={{background:'#6366f1'}}>
                      👤 Sync from Contacts
                    </button>
                  )}

                  {/* Birthday */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${theme.darkMode?'text-slate-400':'text-slate-500'}`}>🎂 Your Birthday</label>
                    <input type="text" value={selectedNode.birthday || ''} onChange={e => updateSelectedNode('birthday', e.target.value)}
                      placeholder="e.g. 15 March 1993"
                      className={`px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none ${theme.darkMode?'bg-slate-700 border-slate-600 text-white':'bg-white border-slate-200'}`}/>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${theme.darkMode?'text-slate-400':'text-slate-500'}`}>📝 About Me</label>
                    <textarea value={selectedNode.notes || ''} onChange={e => updateSelectedNode('notes', e.target.value)}
                      placeholder="A few words about yourself..."
                      rows={3}
                      className={`px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none ${theme.darkMode?'bg-slate-700 border-slate-600 text-white':'bg-white border-slate-200'}`}/>
                  </div>
                </div>
              )}

              {selectedNode.type !== 'hub' && selectedNode.id !== 'me' && (
                <>
                  <div className="flex items-center space-x-3">
                    {/* Photo — tap to open picker */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setShowPhotoOptions(p => !p)}
                        className={`w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer relative ${theme.darkMode ? 'border-slate-600' : 'border-emerald-100'}`}
                        style={{padding:0,background:'none'}}
                      >
                        <img src={selectedNode.img} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-40 transition-all rounded-full">
                          <span className="text-white text-lg opacity-0 hover:opacity-100">✎</span>
                        </div>
                      </button>
                      {/* Photo carousel dots — if multiple photos */}
                      {(selectedNode.photos?.length > 1) && (
                        <div style={{display:'flex',gap:4,marginTop:4,justifyContent:'center'}}>
                          {selectedNode.photos.map((p,pi)=>(
                            <button key={pi}
                              onClick={()=>setNodes(prev=>prev.map(n=>n.id===selectedNode.id?{...n,img:p.cropped,activePhotoIdx:pi}:n))}
                              style={{width:20,height:20,borderRadius:'50%',overflow:'hidden',border:'2px solid '+(selectedNode.activePhotoIdx===pi?'#10b981':'transparent'),padding:0,cursor:'pointer',background:'none'}}>
                              <img src={p.cropped} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Picker sheet */}
                      {showPhotoOptions && (
                        <div className={`absolute left-0 top-18 z-50 rounded-xl shadow-xl border overflow-hidden w-44 ${theme.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                          style={{top:'4.5rem'}}>
                          {/* Re-crop existing photo */}
                          {selectedNode?.img && !selectedNode.img.includes('svg') && (
                            <>
                              <button
                                onClick={async () => {
                                  // Load original (pre-crop) if available, else use current
                                  let origSrc = selectedNode.img;
                                  try {
                                    const db = idbRef.current || (idbRef.current = await openPhotoDB());
                                    const tx = db.transaction('photos','readonly');
                                    const stored = await new Promise((res,rej) => {
                                      const req = tx.objectStore('photos').get(selectedNodeId + '_orig');
                                      req.onsuccess = e => res(e.target.result);
                                      req.onerror = rej;
                                    });
                                    if (stored?.dataUrl) origSrc = stored.dataUrl;
                                  } catch {}
                                  setPhotoCrop({ nodeId: selectedNodeId, src: origSrc, originalSrc: origSrc, crop: { x:0, y:0, scale:1 } });
                                  setShowPhotoOptions(false);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-left ${theme.darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                                <span>✂️</span> Re-crop Photo
                              </button>
                              <div className={`border-t ${theme.darkMode ? 'border-slate-700' : 'border-slate-100'}`} />
                            </>
                          )}
                          <label className={`flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer ${theme.darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <span>📷</span> Upload Photo
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => {
                                setPhotoCrop({ nodeId: selectedNodeId, src: ev.target.result, originalSrc: ev.target.result, crop: { x: 0, y: 0, scale: 1 } });
                                setShowPhotoOptions(false);
                              };
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          <div className={`border-t ${theme.darkMode ? 'border-slate-700' : 'border-slate-100'}`} />
                          <button
                            onClick={() => {
                              const n = nodes.find(nd => nd.id === selectedNodeId);
                              setAvBg(n?._avBg || '#4f46e5');
                              setAvSkin(n?._avSkin || '#f4c2a1');
                              setAvHair(n?._avHair || '#2d1b00');
                              setAvStyle(n?._avStyle || 'medium');
                              setAvFace(n?._avFace || 'smile');
                              setAvatarBuilder({ nodeId: selectedNodeId });
                              setShowPhotoOptions(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-left ${theme.darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <span>🎨</span> Build Avatar
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={selectedNode.label === 'New Friend' ? '' : selectedNode.label || ''}
                        placeholder="New Friend"
                        autoCapitalize="words"
                        onChange={e => {
                          // Auto-capitalise first letter of each word
                          const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                          updateSelectedNode('label', val || 'New Friend');
                        }}
                        onFocus={e => {
                          // Select all so user can type straight over placeholder
                          if (selectedNode.label === 'New Friend') e.target.select();
                        }}
                        className={`w-full font-bold text-lg bg-transparent border-b outline-none focus:border-emerald-500 transition-colors ${theme.darkMode ? 'border-slate-600 text-slate-100 placeholder-slate-500' : 'border-slate-300 text-slate-900 placeholder-slate-400'}`}
                      />
                      {/* AKA bar — shown when contact name differs from display name */}
                      {selectedNode.contactName && selectedNode.contactName !== selectedNode.label && (
                        <div style={{
                          fontSize:10, color:theme.darkMode?'#64748b':'#94a3b8',
                          marginTop:2, fontStyle:'italic',
                        }}>aka {selectedNode.contactName}</div>
                      )}
                      {/* Friendship Level Badge — tap to expand log */}
                      {(() => {
                        const score = selectedNode.interactionScore || 0;
                        const lvl = getLevel(score, selectedNode);
                        return (
                          <button
                            onClick={() => { setShowLevelPanel(p => !p); setShowLevelSetter(false); }}
                            className="mt-1 flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                            style={{ backgroundColor: lvl.color + '33', color: lvl.color, border: `1px solid ${lvl.color}66` }}
                          >
                            <span>{lvl.emoji}</span>
                            <span>{lvl.label}</span>
                            <span className="opacity-60">· {score} pts</span>
                            <span className="opacity-50 ml-1">{showLevelPanel ? '▲' : '▼'}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sync banner — shown at top until dismissed or synced */}
                  {!selectedNode.syncDismissed && !selectedNode.phone && (
                    <div className={`relative flex items-center justify-between px-3 py-2 rounded-lg border ${theme.darkMode ? 'bg-indigo-900/40 border-indigo-800' : 'bg-indigo-50 border-indigo-100'}`}>
                      <button
                        onClick={() => {
                          handleImportContact();
                          updateSelectedNode('syncDismissed', true);
                        }}
                        className={`flex items-center space-x-2 text-sm font-medium ${theme.darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}
                      >
                        <BookUser className="w-4 h-4 flex-shrink-0" />
                        <span>Sync with Contacts</span>
                      </button>
                      <button
                        onClick={() => updateSelectedNode('syncDismissed', true)}
                        className={`ml-2 p-0.5 rounded-full flex-shrink-0 ${theme.darkMode ? 'text-indigo-400 hover:text-indigo-200' : 'text-indigo-400 hover:text-indigo-700'}`}
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Level panel: interaction log + set level */}
                  {showLevelPanel && (() => {
                    const score = selectedNode.interactionScore || 0;
                    const currentLvl = getLevel(score, selectedNode);
                    const currentTier = currentLvl.tier;
                    const interactions = selectedNode.interactionLog || [];
                    return (
                      <div className={`rounded-xl border overflow-hidden ${theme.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        {/* Level summary */}
                        <div className="p-3" style={{ background: currentLvl.color + '22' }}>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{currentLvl.emoji}</span>
                            <span className="font-bold text-sm" style={{ color: currentLvl.color }}>{currentLvl.label}</span>
                            <span className={`text-xs ml-auto opacity-60 ${theme.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{currentLvl.scoreRange} pts</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${theme.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{currentLvl.desc}</p>
                        </div>

                        {/* Score bar */}
                        <div className={`px-3 py-2 border-b ${theme.darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                          <div className="flex justify-between text-[10px] opacity-50 mb-1">
                            <span>Progress to next level</span>
                          <span>{score} / {currentTier === 'family' ? '∞' : currentTier < 5 ? TIER_SCORE_MAP[currentTier + 1] : 1000} pts</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${theme.darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: currentTier === 'family' ? '100%' : currentTier < 5
                                  ? `${Math.min(100, ((score - (TIER_SCORE_MAP[currentTier] || 0)) / ((TIER_SCORE_MAP[currentTier+1] || 1000) - (TIER_SCORE_MAP[currentTier] || 0))) * 100)}%`
                                  : '100%',
                                backgroundColor: currentLvl.color
                              }} />
                          </div>
                        </div>

                        {/* Interaction log */}
                        <div className="px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">Interaction History</p>
                          {interactions.length === 0
                            ? <p className="text-xs opacity-40 italic">No interactions logged yet.</p>
                            : <div className="space-y-1 max-h-28 overflow-y-auto">
                                {[...interactions].reverse().map((entry, ei) => (
                                  <div key={ei} className={`flex justify-between text-xs px-2 py-1 rounded ${theme.darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                    <span>{entry.label}</span>
                                    <span className="opacity-50">{entry.date}</span>
                                    <span className="font-bold" style={{ color: currentLvl.color }}>+{entry.pts}</span>
                                  </div>
                                ))}
                              </div>
                          }
                        </div>

                        {/* Set level button */}
                        <div className={`px-3 pb-3 border-t pt-2 ${theme.darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                          <button
                            onClick={() => setShowLevelSetter(p => !p)}
                            className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${theme.darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                          >
                            {showLevelSetter ? 'Hide levels ▲' : 'Set friendship level ▼'}
                          </button>

                          {showLevelSetter && (
                            <div className="mt-2 space-y-1.5">
                              {FRIENDSHIP_LEVELS.map(lvl => (
                                <button
                                  key={lvl.tier}
                                  onClick={() => {
                                    if (lvl.tier === 'partner') {
                                      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, isPartner: true, isFamily: false } : n));
                                      setPfSelectedPart('main'); setPfColorPickerFor(null); setPfTab('design');
                                      setPartnerFlowerEditor(selectedNodeId);
                                    } else if (lvl.tier === 'family') {
                                      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, isFamily: true, isPartner: false } : n));
                                    } else {
                                      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, isFamily: false, isPartner: false, interactionScore: TIER_SCORE_MAP[lvl.tier] || 0 } : n));
                                    }
                                    showToast(`${lvl.emoji} Set to ${lvl.label}`);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                                    getTier(score, selectedNode) === lvl.tier
                                      ? 'border-2'
                                      : theme.darkMode ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                  style={getTier(score, selectedNode) === lvl.tier ? { borderColor: lvl.color, background: lvl.color + '18' } : {}}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span>{lvl.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold" style={{ color: lvl.color }}>{lvl.label}</span>
                                        <span className="text-[9px] opacity-50">{lvl.scoreRange}</span>
                                      </div>
                                      <p className={`text-[10px] leading-tight mt-0.5 opacity-70 ${theme.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{lvl.desc}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {selectedNode.type !== 'hub' && selectedNode.isPartner && (
                <button onClick={()=>{setPfSelectedPart('main');setPfColorPickerFor(null);setPfTab('design');setPartnerFlowerEditor(selectedNodeId);}}
                  style={{width:'100%',padding:'8px',borderRadius:10,background:'#f43f5e',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,marginBottom:4}}>
                  💗 Customise Partner Flower
                </button>
              )}

              {selectedNode.type !== 'hub' && (
                <div className="flex items-center gap-3">
                  <label className={`flex items-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${theme.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <CalendarIcon className="w-3 h-3 mr-1" /> Birthday
                  </label>
                  <input type="text" value={selectedNode.birthday || ''}
                    onChange={e => updateSelectedNode('birthday', e.target.value)}
                    onBlur={e => updateSelectedNode('birthday', normaliseBirthday(e.target.value))}
                    className={`flex-1 px-2 py-1 border rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-xs ${panelBg}`}
                    placeholder="e.g. 11 Mar 93" />
                </div>
              )}

              {/* Tags */}
              {selectedNode.type !== 'hub' && selectedNode.type !== 'flower' && (
                <div className="flex flex-col gap-1.5">
                  <label className={`flex items-center text-xs font-semibold uppercase tracking-wider ${theme.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    🏷 Tags
                  </label>
                  {/* Personal colour — shown in group border mode */}
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:600,color:theme.darkMode?'#94a3b8':'#64748b',marginBottom:5}}>🎨 Personal colour (group border mode)</div>
                    <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
                      {[...PRIMARY_GROUP_COLORS,'#f1f5f9'].map(c=>(
                        <button key={c} onClick={()=>updateSelectedNode('personalColor', selectedNode.personalColor===c?null:c)}
                          style={{width:22,height:22,borderRadius:'50%',background:c,border:'3px solid '+(selectedNode.personalColor===c?'white':'transparent'),boxShadow:selectedNode.personalColor===c?'0 0 0 2px '+c:'none',cursor:'pointer',flexShrink:0}}/>
                      ))}
                      <button onClick={()=>updateSelectedNode('personalColor',null)}
                        style={{fontSize:10,color:theme.darkMode?'#64748b':'#94a3b8',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>clear</button>
                    </div>
                  </div>
                  {/* Existing tags */}
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {(selectedNode.tags || []).map(tag => (
                      <span key={tag} style={{
                        display:'flex',alignItems:'center',gap:4,
                        padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600,
                        background:theme.darkMode?'#334155':'#e2e8f0',
                        color:theme.darkMode?'#e2e8f0':'#334155',
                      }}>
                        {tag}
                        <button onClick={() => updateSelectedNode('tags', (selectedNode.tags||[]).filter(t=>t!==tag))}
                          style={{background:'none',border:'none',cursor:'pointer',padding:0,lineHeight:1,fontSize:12,color:theme.darkMode?'#94a3b8':'#64748b'}}>✕</button>
                      </span>
                    ))}
                  </div>
                  {/* Add tag input */}
                  <div style={{display:'flex',gap:6}}>
                    <input
                      type="text" value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key==='Enter'||e.key===',') && tagInput.trim()) {
                          const t = tagInput.trim().replace(/,$/,'');
                          if (t && !(selectedNode.tags||[]).includes(t)) {
                            updateSelectedNode('tags', [...(selectedNode.tags||[]), t]);
                          }
                          setTagInput('');
                          e.preventDefault();
                        }
                      }}
                      placeholder="Add tag…"
                      className={`flex-1 px-2 py-1 border rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-xs ${panelBg}`}
                    />
                    <button onClick={() => {
                      const t = tagInput.trim();
                      if (t && !(selectedNode.tags||[]).includes(t)) {
                        updateSelectedNode('tags', [...(selectedNode.tags||[]), t]);
                      }
                      setTagInput('');
                    }} style={{padding:'2px 10px',borderRadius:8,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>+</button>
                  </div>
                  {/* Suggest existing tags */}
                  {allTags.filter(t=>!(selectedNode.tags||[]).includes(t)).length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {allTags.filter(t=>!(selectedNode.tags||[]).includes(t)).map(t=>(
                        <button key={t} onClick={()=>updateSelectedNode('tags',[...(selectedNode.tags||[]),t])}
                          style={{padding:'1px 7px',borderRadius:99,fontSize:10,border:`1px dashed ${theme.darkMode?'#475569':'#cbd5e1'}`,background:'transparent',cursor:'pointer',color:theme.darkMode?'#94a3b8':'#64748b'}}>
                          +{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedNode.type !== 'hub' && selectedNode.id !== 'me' && (
                <div className={`pt-4 border-t ${theme.darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center text-emerald-600"><Activity className="w-4 h-4 mr-1" /> Log Interaction</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => logActivity(1, 'message')} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${theme.darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-emerald-50'}`}>
                      <MessageCircle className="w-5 h-5 mb-1 text-slate-400" />
                      <span className="text-[10px] font-bold">Message (+{nextMessagePoints})</span>
                    </button>
                    <button onClick={() => logActivity(50, 'hangout')} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${theme.darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-emerald-50'}`}>
                      <Coffee className="w-5 h-5 mb-1 text-amber-500" />
                      <span className="text-[10px] font-bold">Hangout (+50)</span>
                    </button>
                    <button onClick={() => logActivity(80, 'nightout')} className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${theme.darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-emerald-50'}`}>
                      <PartyPopper className="w-5 h-5 mb-1 text-purple-500" />
                      <span className="text-[10px] font-bold">Night Out (+80)</span>
                    </button>
                    <button onClick={() => logActivity(150, 'trip')} className={`flex flex-col items-center p-2 rounded-lg border border-emerald-500 transition-colors ${theme.darkMode ? 'bg-emerald-900/40 hover:bg-emerald-900/60' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                      <Plane className="w-5 h-5 mb-1 text-emerald-500" />
                      <span className="text-[10px] font-bold">Trip Away (+150)</span>
                    </button>
                    <button onClick={() => logActivity(80, 'gesture')} className={`col-span-2 flex flex-col items-center p-2 rounded-lg border transition-colors ${theme.darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-emerald-50'}`}>
                      <HeartHandshake className="w-5 h-5 mb-1 text-rose-500" />
                      <span className="text-[10px] font-bold">Meaningful Gesture (+80)</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedNode.type === 'hub' && (
                <>
                  <div className="text-center p-4 rounded-xl border" style={{ backgroundColor: theme.darkMode ? 'rgba(16,185,129,0.1)' : '#f0fdf4', borderColor: theme.darkMode ? 'rgba(16,185,129,0.3)' : '#bbf7d0' }}>
                    <TreePine className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                    <input type="text"
                      value={selectedNode.label === 'New Group' ? '' : selectedNode.label || ''}
                      placeholder="New Group"
                      autoCapitalize="words"
                      onChange={e => {
                        const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                        updateSelectedNode('label', val || 'New Group');
                      }}
                      onFocus={e => { if (selectedNode.label === 'New Group') e.target.select(); }}
                      className={`w-full text-center font-bold text-lg bg-transparent border-b outline-none focus:border-emerald-500 ${theme.darkMode ? 'text-slate-100 placeholder-slate-500 border-slate-600' : 'text-slate-900 placeholder-slate-400 border-slate-300'}`}
                    />
                  </div>
                  {(() => {
                    const severed = archivedLinks.filter(l => l.source === selectedNode.id || l.target === selectedNode.id);
                    if (severed.length === 0) return null;
                    return (
                      <div className={`pt-4 border-t ${theme.darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center" style={{ color: '#f97316' }}>
                          ✂ Severed Members
                        </h3>
                        <div className="space-y-2">
                          {severed.map((l, i) => {
                            const otherId = l.source === selectedNode.id ? l.target : l.source;
                            const other = nodes.find(n => n.id === otherId);
                            const cutDate = new Date(l.cutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            return (
                              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${theme.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center space-x-2 min-w-0">
                                  {other?.img && <img src={other.img} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate">{other?.label ?? otherId}</p>
                                    <p className="text-[10px] opacity-50">Cut {cutDate}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => restoreLink(l)}
                                  className="ml-2 flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-600 border border-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                >Restore</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Severed connections relevant to this node */}
              {(() => {
                const severed = archivedLinks.filter(l => l.source === selectedNode.id || l.target === selectedNode.id);
                if (severed.length === 0) return null;
                return (
                  <div className={`pt-4 border-t ${theme.darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center" style={{ color: '#f97316' }}>
                      ✂ Severed Connections
                    </h3>
                    <div className="space-y-2">
                      {severed.map((l, i) => {
                        const otherId = l.source === selectedNode.id ? l.target : l.source;
                        const other = nodes.find(n => n.id === otherId);
                        const cutDate = new Date(l.cutAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        return (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${theme.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center space-x-2 min-w-0">
                              {other?.img && <img src={other.img} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{other?.label ?? otherId}</p>
                                <p className="text-[10px] opacity-50">Cut {cutDate}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => restoreLink(l)}
                              className="ml-2 flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-600 border border-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            >Restore</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {selectedNode.id !== 'me' && (
                <div className={`pt-4 border-t space-y-2 ${theme.darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  {/* Sync button at bottom — shown when dismissed from top or already synced */}
                  {selectedNode.type !== 'hub' && (selectedNode.syncDismissed || selectedNode.phone) && (
                    <button onClick={handleImportContact} className={`w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-xs border opacity-60 hover:opacity-100 transition-opacity ${theme.darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <BookUser className="w-3 h-3" /><span>{selectedNode.phone ? 'Re-sync with Contacts' : 'Sync with Contacts'}</span>
                    </button>
                  )}
                  <button onClick={() => {
                    snapshot();
                    setNodes(p => p.filter(n => n.id !== selectedNodeId));
                    setLinks(p => p.filter(l => l.source !== selectedNodeId && l.target !== selectedNodeId));
                    setSelectedNodeId(null);
                  }} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors font-medium">
                    <Trash2 className="w-4 h-4" /><span>Remove {selectedNode.type === 'hub' ? 'Group' : 'Friend'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className={`p-4 border-t space-y-2 ${theme.darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
          {/* One row per queued friend */}
          {addFriendForms.map((form, fi) => (
            <div key={form.id} className={`rounded-xl border p-2.5 space-y-1.5 ${theme.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              <input
                autoFocus={fi === addFriendForms.length - 1}
                type="text"
                value={form.name}
                onChange={e => {
                  const val = e.target.value.replace(/\b\w/g, c => c.toUpperCase());
                  setAddFriendForms(prev => prev.map(f => f.id === form.id ? { ...f, name: val } : f));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') createFriendFromForm(form.id, null);
                  if (e.key === 'Escape') setAddFriendForms(prev => prev.filter(f => f.id !== form.id));
                }}
                placeholder="Name…"
                autoCapitalize="words"
                className={`w-full px-3 py-1.5 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 ${theme.darkMode ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
              />
              {/* Friendship level selector */}
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {[
                  {label:'New',    score:0,   color:'#bef264'},
                  {label:'Friend', score:100, color:'#84cc16'},
                  {label:'Good',   score:300, color:'#166534'},
                  {label:'Close',  score:600, color:'#3b82f6'},
                  {label:'Family', score:800, color:'#9333ea'},
                  {label:'💑 Partner', score:1500, color:'#f43f5e'},
                ].map(tier => (
                  <button key={tier.score}
                    onClick={() => setAddFriendForms(prev => prev.map(f => f.id === form.id ? { ...f, initialScore: tier.score } : f))}
                    style={{
                      flex:1, padding:'3px 4px', borderRadius:6, border:'2px solid',
                      borderColor: form.initialScore === tier.score ? tier.color : 'transparent',
                      background: form.initialScore === tier.score ? tier.color+'22' : (theme.darkMode?'#1e293b':'#f8fafc'),
                      color: tier.color, fontSize:10, fontWeight:700, cursor:'pointer',
                    }}>{tier.label}</button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => createFriendFromForm(form.id, null)}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
                  ✓ Add
                </button>
                <button onClick={async () => {
                  try {
                    if ('contacts' in navigator && 'ContactsManager' in window) {
                      const contacts = await navigator.contacts.select(['name','tel','icon'], { multiple: false });
                      if (contacts.length > 0) {
                        const c = contacts[0];
                        const name = c.name?.[0] || form.name;
                        const blob = c.icon?.[0] || null;
                        let img = null;
                        if (blob) {
                          const br = new FileReader();
                          await new Promise(res => { br.onload = e => { img = e.target.result; res(); }; br.readAsDataURL(blob); });
                        }
                        setAddFriendForms(prev => prev.map(f => f.id === form.id ? { ...f, name } : f));
                        createFriendFromForm(form.id, img, blob);
                        return;
                      }
                    }
                  } catch {}
                  createFriendFromForm(form.id, null);
                }} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold ${theme.darkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <BookUser className="w-3 h-3" /> Sync
                </button>
                <button onClick={() => setAddFriendForms(prev => prev.filter(f => f.id !== form.id))}
                  className={`px-2 py-1.5 rounded-lg border text-xs ${theme.darkMode ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}>
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Add another friend row button — always visible */}
          <button
            onClick={() => {
              const parentId = selectedNodeId && selectedNodeId !== 'me' && nodes.find(n => n.id === selectedNodeId && n.type !== 'flower')
                ? selectedNodeId
                : 'flower_social';
              setAddFriendForms(prev => [...prev, { id: `form_${Date.now()}`, name: '', parentId }]);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>
              {selectedNodeId && selectedNodeId !== 'me' && nodes.find(n => n.id === selectedNodeId && n.type !== 'flower')
                ? `Add Friend via ${nodes.find(n => n.id === selectedNodeId)?.label}`
                : 'Add Friend'}
            </span>
          </button>
          {selectedNodeId === 'me' && (
            <>
              <button onClick={addNewHub} className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 font-medium border ${theme.darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}>
                <TreePine className="w-4 h-4 text-emerald-500" /><span>Add Group</span>
              </button>
              <button onClick={()=>{setPfSelectedPart('main');setPfColorPickerFor(null);setPfTab('design');setPartnerFlowerEditor('me');}}
                style={{width:'100%',padding:'8px',borderRadius:10,background:'linear-gradient(135deg,#f43f5e,#a855f7)',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,marginTop:4}}>
                🌸 My Flower
              </button>
            </>
          )}
          {selectedNodeId && selectedNodeId !== 'me' && nodes.find(n => n.id === selectedNodeId && n.type !== 'flower' && n.type !== 'hub') && (
            <div>
              <button onClick={() => setShowAddToGroup(p => !p)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 font-medium border ${theme.darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}>
                <TreePine className="w-4 h-4 text-emerald-500" />
                <span>Add to Group</span>
              </button>
              {showAddToGroup && (
                <div className={`mt-2 rounded-xl border overflow-hidden ${theme.darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  {nodes.filter(n => n.type === 'hub').map(hub => {
                    const alreadyLinked = links.some(l =>
                      (l.source === hub.id && l.target === selectedNodeId) ||
                      (l.source === selectedNodeId && l.target === hub.id)
                    );
                    return (
                      <button key={hub.id}
                        onClick={() => {
                          if (!alreadyLinked) {
                            snapshot();
                            setLinks(prev => [...prev, { source: hub.id, target: selectedNodeId }]);
                            showToast(`Added to ${hub.label}`);
                          }
                          setShowAddToGroup(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between
                          ${alreadyLinked
                            ? theme.darkMode ? 'text-slate-500 bg-slate-800' : 'text-slate-400 bg-slate-50'
                            : theme.darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}>
                        <span>🌳 {hub.label}</span>
                        {alreadyLinked && <span className="text-xs opacity-50">already in</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          bottom: 56, // leave room for bottom tab bar
          cursor: macheteMode ? 'crosshair' : vineDrawMode ? 'cell' : (isPanning ? 'grabbing' : 'grab'),
          background: theme.darkMode ? '#0f172a' : '#f8fafc',
          overflow: 'hidden',
        }}
        onPointerDown={e => {
          // Capture ALL pointer events at the canvas level
          e.currentTarget.setPointerCapture(e.pointerId);
          if (vineDrawMode) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e.clientX - rect.left - transform.x) / transform.scale;
            const sy = (e.clientY - rect.top - transform.y) / transform.scale;
            isDrawing.current = true;
            setCurrentStroke([{ x: sx, y: sy }]);
            return;
          }
          if (macheteMode) {
            snapshot();
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e.clientX - rect.left - transform.x) / transform.scale;
            const sy = (e.clientY - rect.top - transform.y) / transform.scale;
            isSlashing.current = true;
            setSlashTrail([{ x: sx, y: sy }]);
            return;
          }
          // Always capture the pointer so move/up events route here
          e.currentTarget.setPointerCapture(e.pointerId);
          // Only handle as canvas touch if node handlers haven't registered this pointer yet
          if (!activePointers.current.has(e.pointerId)) {
            handlePointerDown(e, null);
          }
        }}
        onPointerMove={e => {
          if (vineDrawMode && isDrawing.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e.clientX - rect.left - transform.x) / transform.scale;
            const sy = (e.clientY - rect.top - transform.y) / transform.scale;
            setCurrentStroke(prev => [...prev, { x: sx, y: sy }]);
            return;
          }
          if (macheteMode && isSlashing.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e.clientX - rect.left - transform.x) / transform.scale;
            const sy = (e.clientY - rect.top - transform.y) / transform.scale;
            setSlashTrail(prev => {
              const next = [...prev, { x: sx, y: sy }];
              checkSlashCuts(next);
              return next;
            });
            return;
          }
          handlePointerMove(e);
        }}
        onPointerUp={e => {
          if (vineDrawMode && isDrawing.current) {
            isDrawing.current = false;
            // Save this stroke to pendingPaths — don't render yet
            setCurrentStroke(prev => {
              if (prev.length >= 4) {
                setPendingPaths(pp => [...pp, { pts: prev }]);
              }
              return [];
            });
            return;
          }
          if (macheteMode) {
            isSlashing.current = false;
            setSlashTrail([]);
            return;
          }
          handlePointerUp(e);
        }}
        onPointerCancel={e => {
          if (vineDrawMode) { isDrawing.current = false; setCurrentStroke([]); return; }
          if (macheteMode) { isSlashing.current = false; setSlashTrail([]); return; }
          handlePointerUp(e);
        }}
        onPointerLeave={e => {
          if (vineDrawMode) { isDrawing.current = false; setCurrentStroke([]); return; }
          if (macheteMode) { isSlashing.current = false; setSlashTrail([]); return; }
          handlePointerUp(e);
        }}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      >
        <svg ref={svgRef} className="w-full h-full absolute inset-0 touch-none" onContextMenu={e => e.preventDefault()}>
          <defs>
            <pattern id="bg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-grid)" />

          <g ref={svgGroupRef} transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Background fill */}
            <rect x="-50000" y="-50000" width="100000" height="100000"
              fill={theme.darkMode ? '#0f172a' : '#f8fafc'} />

            {/* Hex grid — visible only while dragging, shows held hex + neighbours */}
            {viewMode === 'canvas' && liftedNodeId && hexSnapPos && (() => {
              const dm = theme.darkMode;
              const strokeCol = dm ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.3)';
              const heldCol   = dm ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)';

              if (gridStyle === 'square') {
                // Square grid
                const S = HEX_SIZE;
                const squares = [];
                for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
                  const sx = hexSnapPos.x + di * S;
                  const sy = hexSnapPos.y + dj * S;
                  squares.push({ x: sx, y: sy, held: di === 0 && dj === 0 });
                }
                return (
                  <g style={{pointerEvents:'none'}}>
                    {squares.map((sq, i) => (
                      <rect key={i} x={sq.x - S/2} y={sq.y - S/2} width={S} height={S}
                        fill={sq.held ? heldCol : 'none'}
                        stroke={strokeCol} strokeWidth={sq.held ? 1.5 : 1}
                        strokeDasharray={sq.held ? 'none' : '6 4'} />
                    ))}
                    <circle cx={hexSnapPos.x} cy={hexSnapPos.y} r={5} fill="#10b981" opacity={0.7}/>
                  </g>
                );
              }

              const hexes = [
                { ...hexSnapPos, held: true },
                ...hexNeighbours(hexSnapPos.q, hexSnapPos.r).map(h => ({ ...h, held: false })),
              ];
              return (
                <g style={{pointerEvents:'none'}}>
                  {hexes.map((h, hi) => {
                    const corners = hexCorners(h.x, h.y);
                    const d = 'M ' + corners.map(c => c.join(',')).join(' L ') + ' Z';
                    return (
                      <path key={hi} d={d}
                        fill={h.held ? heldCol : 'none'}
                        stroke={strokeCol}
                        strokeWidth={h.held ? 1.5 : 1}
                        strokeDasharray={h.held ? 'none' : '6 4'}
                      />
                    );
                  })}
                  <circle cx={hexSnapPos.x} cy={hexSnapPos.y} r={5} fill="#10b981" opacity={0.7} />
                </g>
              );
            })()}
            {viewMode === 'calendar' && (
              <g>
                {/* Shadow under vine */}
                <path d={calendarPath} fill="none"
                  stroke={theme.darkMode ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.12)"}
                  strokeWidth="140" strokeLinecap="round" />

                {(calendarStrandSegments || []).map((seg, mi) => {
                  const { tStart, tEnd, strands } = seg;
                  const todayT = calendarTodayT;
                  const monthCol = MONTH_COLORS[mi];
                  const widths    = [24, 36, 24];
                  const opacities = [0.72, 1, 0.72];
                  const GREEN_DARK  = ['#14532d', '#166534', '#15803d'];
                  const GREEN_LIGHT = ['#15803d', '#16a34a', '#22c55e'];
                  const BROWN_DARK  = '#3d1a00';
                  const BROWN_MID   = '#7c3500';
                  const BROWN_AMB   = '#c47a1e';

                  return (strands || []).map((strand, si) => {
                    if (!strand || !strand.pts || strand.pts.length < 2) return null;
                    const pts = strand.pts;

                    // Split pts into grown (t <= todayT) and ungrown (t >= todayT)
                    const grownPts   = pts.filter(p => p.t <= todayT + 0.001);
                    const ungrownPts = pts.filter(p => p.t >= todayT - 0.001);

                    const toD = (arr) => arr.length > 1
                      ? `M ${arr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
                      : '';

                    const dGrown   = toD(grownPts);
                    const dUngrown = toD(ungrownPts);
                    const baseGreen = theme.darkMode ? GREEN_DARK[si] : GREEN_LIGHT[si];

                    return (
                      <g key={`seg-${mi}-${si}`}>
                        {/* Grown section — green multi-strand with month tint */}
                        {dGrown && <>
                          <path d={dGrown} fill="none" stroke={baseGreen}
                            strokeWidth={widths[si]} strokeLinecap="round" strokeLinejoin="round"
                            opacity={opacities[si]} />
                          <path d={dGrown} fill="none" stroke={monthCol}
                            strokeWidth={widths[si]} strokeLinecap="round" strokeLinejoin="round"
                            opacity={0.15} />
                        </>}
                        {/* Ungrown section — brown woody branch */}
                        {dUngrown && si === 1 && <>
                          <path d={dUngrown} fill="none" stroke={BROWN_DARK}
                            strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
                          <path d={dUngrown} fill="none" stroke={BROWN_MID}
                            strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                          <path d={dUngrown} fill="none" stroke={BROWN_AMB}
                            strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"
                            strokeDasharray="55 45" opacity={0.55} />
                        </>}
                      </g>
                    );
                  });
                })}

                {/* Leaves along vine up to today */}
                {(calendarLeaves || []).map((leaf, i) => {
                  const LW = (330 + 120 * Math.sin(i * 2.3 + 1.1)) * leaf.scale;
                  const LH = LW * 0.28;
                  const leafD = `M 0,0 C ${LW*0.25},${-LH} ${LW*0.75},${-LH} ${LW},0 C ${LW*0.75},${LH} ${LW*0.25},${LH} 0,0 Z`;
                  const midribD = `M ${LW*0.05},0 L ${LW*0.9},0`;
                  const vein1 = `M ${LW*0.25},${-LH*0.55} L ${LW*0.6},${-LH*0.15}`;
                  const vein2 = `M ${LW*0.25},${LH*0.55} L ${LW*0.6},${LH*0.15}`;
                  const vein3 = `M ${LW*0.45},${-LH*0.65} L ${LW*0.72},${-LH*0.18}`;
                  const vein4 = `M ${LW*0.45},${LH*0.65} L ${LW*0.72},${LH*0.18}`;
                  const baseCol  = theme.darkMode ? '#16a34a' : '#22c55e';
                  const darkCol  = theme.darkMode ? '#14532d' : '#15803d';
                  const monthCol = MONTH_COLORS[leaf.mi] || darkCol;
                  return (
                    <g key={`leaf-${i}`}
                      transform={`translate(${leaf.x},${leaf.y}) rotate(${leaf.angle + leaf.side * 45})`}
                      opacity={0.88}
                      style={{ pointerEvents: 'none' }}
                    >
                      {/* Month-coloured border — rendered first (underneath) */}
                      <path d={leafD} fill="none" stroke={monthCol} strokeWidth={22} />
                      {/* Green fill on top */}
                      <path d={leafD} fill={baseCol} stroke="none" />
                      {/* Veins and midrib */}
                      <path d={midribD} fill="none" stroke={darkCol} strokeWidth={4} opacity={0.6} />
                      <path d={vein1}   fill="none" stroke={darkCol} strokeWidth={2.5} opacity={0.4} />
                      <path d={vein2}   fill="none" stroke={darkCol} strokeWidth={2.5} opacity={0.4} />
                      <path d={vein3}   fill="none" stroke={darkCol} strokeWidth={2} opacity={0.3} />
                      <path d={vein4}   fill="none" stroke={darkCol} strokeWidth={2} opacity={0.3} />
                    </g>
                  );
                })}

                {/* Flower month markers — same rounded petal style as map page flowers */}
                {(calendarMonthMarkers || []).map((m, mi) => {
                  const PETALS = 6;
                  // Just under photo size: photos are CALENDAR_NODE_SCALE*80 ≈ 672 units radius
                  // Flower petal tip at ~500 units, centre disc at ~220 units
                  const flowerR = 500;
                  const petalL  = flowerR * 0.72;
                  const petalW  = petalL  * 0.68;
                  const centreR = flowerR * 0.44;

                  const buildPetals = (scale = 1) => Array.from({length: PETALS}, (_, pi) => {
                    const pa = (pi / PETALS) * Math.PI * 2;
                    const L = petalL * scale, W = petalW * scale;
                    const tx = Math.cos(pa) * L, ty = Math.sin(pa) * L;
                    const perpA = pa + Math.PI * 0.5;
                    const cp1x = Math.cos(pa)*L*0.35 + Math.cos(perpA)*W*0.6;
                    const cp1y = Math.sin(pa)*L*0.35 + Math.sin(perpA)*W*0.6;
                    const cp2x = Math.cos(pa)*L*0.85 + Math.cos(perpA)*W*0.5;
                    const cp2y = Math.sin(pa)*L*0.85 + Math.sin(perpA)*W*0.5;
                    const cp3x = Math.cos(pa)*L*0.85 - Math.cos(perpA)*W*0.5;
                    const cp3y = Math.sin(pa)*L*0.85 - Math.sin(perpA)*W*0.5;
                    const cp4x = Math.cos(pa)*L*0.35 - Math.cos(perpA)*W*0.6;
                    const cp4y = Math.sin(pa)*L*0.35 - Math.sin(perpA)*W*0.6;
                    return `M 0,0 C ${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty} C ${cp3x},${cp3y} ${cp4x},${cp4y} 0,0`;
                  }).join(' ');

                  return (
                    <g key={`month-${mi}`} transform={`translate(${m.x}, ${m.y})`}>
                      {/* Back petals rotated for depth */}
                      <g transform={`rotate(${360/PETALS/2})`} opacity={0.5}>
                        <path d={buildPetals()} fill={m.color} />
                      </g>
                      {/* Front petals */}
                      <path d={buildPetals()} fill={m.color} opacity={0.9} />
                      {/* White accent inner petals */}
                      <g transform={`rotate(${360/PETALS/2})`} opacity={0.22}>
                        <path d={buildPetals(0.55)} fill="white" />
                      </g>
                      <path d={buildPetals(0.45)} fill="white" opacity={0.15} />
                      {/* Centre disc with month-colour border ring */}
                      <circle r={centreR} fill="white" opacity={0.95} />
                      <circle r={centreR} fill="none" stroke={m.color} strokeWidth={18} opacity={0.9} />
                      <circle r={centreR * 0.78} fill={m.color} />
                      {/* Month label */}
                      <text textAnchor="middle" dominantBaseline="middle"
                        fontSize={centreR * 0.62} fontWeight="900" fill="white"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}>
                        {m.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {viewMode === 'canvas' && (
              <g>
                {/* ── Hub stakes — drawn BEFORE links so vines appear in front ── */}
                {activeRenderNodes.filter(n=>n.type==='hub').map(node=>{
                  const scaleRatio = node.radius ? node.radius / 40 : 1;
                  return (
                    <g key={'stake-'+node.id} transform={`translate(${node.renderX}, ${node.renderY}) scale(${scaleRatio})`} style={{pointerEvents:'none'}}>
                      <ellipse cx="0" cy="20" rx="30" ry="10" fill="rgba(0,0,0,0.15)" />
                      <rect x="-10" y="-40" width="20" height="60" fill="#8B5A2B" rx="2" />
                      {theme.showWeathering && <>
                        <line x1="-7" y1="-35" x2="-7" y2="15" stroke="#5C3A1A" strokeWidth="1" opacity="0.4"/>
                        <line x1="-2" y1="-38" x2="-2" y2="18" stroke="#7A4A22" strokeWidth="0.5" opacity="0.3"/>
                        <line x1="4" y1="-33" x2="4" y2="16" stroke="#5C3A1A" strokeWidth="0.8" opacity="0.35"/>
                        <ellipse cx="-4" cy="-10" rx="4" ry="3" fill="none" stroke="#5C3A1A" strokeWidth="0.8" opacity="0.4"/>
                      </>}
                    </g>
                  );
                })}
              </g>
            )}

            {viewMode === 'canvas' && (
              <g>
                {links.map((link, i) => {
                  const src = activeRenderNodes.find(n => n.id === link.source);
                  const tgt = activeRenderNodes.find(n => n.id === link.target);
                  if (!src || !tgt) return null;

                  const isMainTrunk = (src.id === 'me' && tgt.type === 'hub') || (tgt.id === 'me' && src.type === 'hub') || (src.type === 'flower' && tgt.type === 'hub') || (tgt.type === 'flower' && src.type === 'hub') || (src.id === 'me' && tgt.type === 'flower') || (tgt.id === 'me' && src.type === 'flower');
                  let score = 0;
                  if (isMainTrunk) {
                    const hubId = src.type === 'hub' ? src.id : tgt.id;
                    score = calculateHubStrength(hubId);
                  } else {
                    score = (src.type !== 'hub' ? src.interactionScore : tgt.interactionScore) || 0;
                  }
                  const tier = score < 100 ? 1 : score < 300 ? 2 : score < 600 ? 3 : score < 1000 ? 4 : 5;

                  // Growing animation state for drawn vines
                  const growingVine = link.drawnLinkId
                    ? growingVines.find(v => v.id === link.drawnLinkId)
                    : null;
                  const dashOffset = growingVine
                    ? growingVine.totalLen * (1 - growingVine.progress)
                    : null;

                  const dx = tgt.renderX - src.renderX;
                  const dy = tgt.renderY - src.renderY;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist === 0) return null;

                  const perpX = -dy / dist;
                  const perpY =  dx / dist;
                  const STEPS = link.customPathPts
                    ? link.customPathPts.length - 1
                    : Math.max(60, Math.floor(dist / 5));

                  // --- ORGANIC BASE WIGGLE for the whole vine ---
                  // Used as the spine reference; strands wrap around this.
                  const OCTAVES_MAP = [
                    { freq: 1.0,          amp: 0.5,  phase: 0.0 + i * 0.7 },
                    { freq: 1.6180339887, amp: 0.22, phase: 2.1 + i * 0.4 },
                    { freq: 2.7182818284, amp: 0.10, phase: 4.7 + i * 0.2 },
                    { freq: 4.236,        amp: 0.05, phase: 1.3             },
                  ];
                  const spineWiggle = (t) => {
                    let w = 0;
                    for (const o of OCTAVES_MAP) w += Math.sin(t * 2.8 * o.freq * Math.PI * 2 + o.phase) * o.amp;
                    return w * dist * 0.045;
                  };

                  // --- STRAND DEFINITIONS per tier ---
                  // Each tier accumulates strands. The last strand is always the "growing" one.
                  // Role:  0=core, 1=wrapped, 2=wrapped, 3=wrapped, 4=growing
                  //
                  // Properties per strand:
                  //   width       — stroke width
                  //   wrapFreq    — how many coils along the vine (higher = tighter wrap)
                  //   wrapAmp     — max perpendicular excursion as fraction of coreRadius
                  //   coreRadius  — radius of the core vine (perpendicular offset of center)
                  //   color dark/light
                  //   role: 'core' | 'wrapped' | 'growing'

                  const coreRadius = 1.5 + tier * 0.8; // how thick the bundle is

                  // Strand table — index 0 is always the core, grows darker/thicker each tier
                  // subsequent indices are increasingly lighter, wrapping tighter
                  const STRAND_DEFS = [
                    // T1 strands:
                    { width: 3.2,  wrapFreq: 0,   wrapAmp: 0,    colorDark: '#14532d', colorLight: '#15803d', role: 'core'    },  // 0: core
                    { width: 1.2,  wrapFreq: 2.5, wrapAmp: 1.0,  colorDark: '#16a34a', colorLight: '#4ade80', role: 'growing' },  // 1: T1 growing
                    // T2 adds:
                    { width: 2.0,  wrapFreq: 1.4, wrapAmp: 0.7,  colorDark: '#15803d', colorLight: '#22c55e', role: 'wrapped' },  // 2: T2 wrapped (replaces T1 growing, T1 growing moves up)
                    // T3 adds:
                    { width: 1.6,  wrapFreq: 1.9, wrapAmp: 0.85, colorDark: '#16a34a', colorLight: '#4ade80', role: 'wrapped' },  // 3: T3 wrapped
                    // T4 adds:
                    { width: 1.3,  wrapFreq: 2.2, wrapAmp: 0.95, colorDark: '#22c55e', colorLight: '#86efac', role: 'wrapped' },  // 4: T4 wrapped
                    // T5 growing strand always at end — thinnest, tightest wrap
                  ];

                  // Per tier: which strand indices are active, in render order (core first)
                  // The growing strand is always the last in the list
                  const TIER_STRAND_SETS = [
                    null,
                    [0, 1],          // T1: core + growing
                    [0, 2, 1],       // T2: thicker core + wrapped + growing (growing is thinner new one)
                    [0, 2, 3, 1],    // T3: core + 2 wrapped + growing
                    [0, 2, 3, 4, 1], // T4: core + 3 wrapped + growing
                    [0, 2, 3, 4, 1], // T5: same as T4 but core is thickest — differentiated by width scale
                  ];

                  // Scale core width with tier
                  const coreWidthScale = [0, 1, 1.4, 1.9, 2.5, 3.2][tier];

                  const activeStrands = TIER_STRAND_SETS[tier].map((si, renderIdx) => {
                    const def = { ...STRAND_DEFS[si] };
                    if (def.role === 'core') def.width *= coreWidthScale;
                    const phaseBase = (renderIdx / TIER_STRAND_SETS[tier].length) * Math.PI * 2 + i * 1.3;

                    const pts = [];
                    for (let s = 0; s <= STEPS; s++) {
                      const t = s / STEPS;

                      // For custom-path links, interpolate along the drawn pts directly
                      let bx, by;
                      if (link.customPathPts && link.customPathPts.length > 1) {
                        const cpPts = link.customPathPts;
                        const cpIdx = Math.min(cpPts.length - 2, Math.floor(t * (cpPts.length - 1)));
                        const frac = t * (cpPts.length - 1) - cpIdx;
                        bx = cpPts[cpIdx].x + (cpPts[cpIdx+1].x - cpPts[cpIdx].x) * frac;
                        by = cpPts[cpIdx].y + (cpPts[cpIdx+1].y - cpPts[cpIdx].y) * frac;
                        // Local tangent-based perp for this segment
                        const tdx = cpPts[Math.min(cpIdx+1, cpPts.length-1)].x - cpPts[cpIdx].x;
                        const tdy = cpPts[Math.min(cpIdx+1, cpPts.length-1)].y - cpPts[cpIdx].y;
                        const tlen = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
                        const lpx = -tdy / tlen, lpy = tdx / tlen;
                        const coil = def.role === 'core' ? 0
                          : Math.sin(t * def.wrapFreq * Math.PI * 2 + phaseBase) * coreRadius * def.wrapAmp
                            + Math.sin(t * 4.1 * Math.PI * 2 + phaseBase * 0.9) * coreRadius * 0.10;
                        pts.push({ x: bx + lpx * coil, y: by + lpy * coil, t });
                      } else {
                        const spine = spineWiggle(t);
                        bx = src.renderX + dx * t;
                        by = src.renderY + dy * t;
                        let offset;
                        if (def.role === 'core') {
                          offset = spine;
                        } else {
                          const coil = Math.sin(t * def.wrapFreq * Math.PI * 2 + phaseBase) * coreRadius * def.wrapAmp;
                          const jitter = def.role === 'growing'
                            ? Math.sin(t * 7.3 * Math.PI * 2 + phaseBase * 1.7) * coreRadius * 0.18
                            : Math.sin(t * 4.1 * Math.PI * 2 + phaseBase * 0.9) * coreRadius * 0.10;
                          offset = spine + coil + jitter;
                        }
                        pts.push({ x: bx + perpX * offset, y: by + perpY * offset, t });
                      }
                    }

                    return {
                      ...def,
                      pts,
                      d: `M ${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`,
                      renderIdx,
                    };
                  });

                  // --- LEAVES per strand ---
                  // Leaf character maps to strand role:
                  //   core    → largest, darkest, fully open
                  //   wrapped → medium, mid-green, open
                  //   growing → tiny, lightest, budding (narrow/closed shape)
                  // ── Leaf lifecycle from score history ────────────────────
                  // Each leaf position t (0=root, 1=tip) maps to an age in hours
                  const srcNode = nodes.find(n => n.id === link.source);
                  const tgtNode = nodes.find(n => n.id === link.target);
                  const scoreHistory = tgtNode?.scoreHistory || srcNode?.scoreHistory || [];
                  const now = Date.now();
                  const HOUR = 3600000;

                  // Score 48h ago vs now
                  const scoreThen48 = scoreHistory.length > 0
                    ? (scoreHistory.find(h => (now - h.ts) >= 48 * HOUR) || scoreHistory[0]).score
                    : score;
                  const scoreThen24 = scoreHistory.length > 0
                    ? (scoreHistory.find(h => (now - h.ts) >= 24 * HOUR) || scoreHistory[0]).score
                    : score;
                  const delta48 = score - scoreThen48;
                  const delta24 = score - scoreThen24;

                  // Get leaf visual state from its position along vine (t: 0=root, 1=tip)
                  // and recent score delta
                  const getLeafState = (t) => {
                    // Tip leaves are newest. If score is rising, tip leaves bud first.
                    // If score is falling, tip leaves shrivel first, root leaves fall last.
                    const ageHrs = (1 - t) * 48; // root=48h old, tip=just born

                    if (delta48 < -60 && ageHrs < 12) {
                      // Losing significantly — tip leaves fallen
                      return 'fallen';
                    }
                    if (delta48 < -30 && ageHrs < 24) {
                      // Losing — newer leaves shrivelling
                      return ageHrs < 12 ? 'fallen' : 'brown';
                    }
                    if (delta24 < -20) {
                      // Declining recently — tip shrivelling
                      return ageHrs < 6 ? 'shrivelling' : ageHrs < 18 ? 'brown' : 'full';
                    }
                    if (delta48 > 60) {
                      // Gaining significantly — tip leaves budding/growing
                      return ageHrs < 6 ? 'budding' : ageHrs < 24 ? 'growing' : 'full';
                    }
                    if (delta24 > 20) {
                      return ageHrs < 12 ? 'budding' : 'growing';
                    }
                    return 'full';
                  };

                  const LIFECYCLE_STYLES = {
                    budding:     { scale: 0.2, wScale: 0.2,  lScale: 0.2,  color: '#bbf7d0', opacity: 0.9,  curl: 0.5 },
                    growing:     { scale: 0.55,wScale: 0.55, lScale: 0.55, color: '#4ade80', opacity: 0.85, curl: 0.2 },
                    full:        { scale: 1.0, wScale: 1.0,  lScale: 1.0,  color: null,       opacity: null, curl: 0 },
                    shrivelling: { scale: 1.0, wScale: 0.60, lScale: 0.90, color: '#ca8a04', opacity: 0.8,  curl: 0.4 },
                    brown:       { scale: 1.0, wScale: 0.55, lScale: 0.85, color: '#78350f', opacity: 0.65, curl: 0.7 },
                    fallen:      { scale: 0,   wScale: 0,    lScale: 0,    color: null,       opacity: 0,    curl: 0 },
                  };

                  const LEAF_CHARS = {
                    // 1:4:9 length and width progression (bud=1, wrapped=4, core=9)
                    core:    { sizeBase: 27, sizeVar: 4.5, colorDark: '#14532d', colorLight: '#15803d', aspectW: 0.32, bud: false },
                    wrapped: { sizeBase: 12, sizeVar: 2.4, colorDark: '#166534', colorLight: '#22c55e', aspectW: 0.32, bud: false },
                    growing: { sizeBase: 3,  sizeVar: 0.9, colorDark: '#16a34a', colorLight: '#4ade80', aspectW: 0.32, bud: true  },
                  };
                  const leafTierScale = 0.7 + tier * 0.18;
                  // Double spacing = half as many leaves
                  const leafSpacing = Math.max(24, 76 - tier * 8);

                  const allLeaves = [];
                  activeStrands.forEach(({ pts, role, renderIdx }) => {
                    const lc = LEAF_CHARS[role];
                    const leafCount = Math.max(2, Math.floor(dist / leafSpacing));
                    for (let li = 0; li < leafCount; li++) {
                      const t = (li + 0.5 + renderIdx * 0.3) / leafCount;
                      if (t > 1) continue;
                      const ptIdx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
                      const p  = pts[ptIdx];
                      const p2 = pts[Math.min(pts.length - 1, ptIdx + 1)];
                      if (!p || !p2) continue;
                      const tangAngle = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
                      const side = ((li + renderIdx) % 2 === 0) ? 1 : -1;
                      const sv = 0.7 + 0.6 * Math.abs(Math.sin(li * 3.7 + renderIdx * 1.9 + i));

                      // Lifecycle state
                      const leafState = getLeafState(t);
                      const ls = LIFECYCLE_STYLES[leafState];
                      if (ls.scale === 0) continue; // fallen — skip

                      const baseLw = (lc.sizeBase + lc.sizeVar * sv) * leafTierScale;
                      const lw = baseLw * ls.lScale;        // length
                      const lh = lw * lc.aspectW * (ls.wScale / ls.lScale); // width independently scaled
                      const fill = ls.color || (theme.darkMode ? lc.colorDark : lc.colorLight);
                      const stroke = leafState === 'full' || leafState === 'growing' || leafState === 'budding'
                        ? (theme.darkMode ? '#0f2d1a' : '#14532d')
                        : '#78350f';
                      const opacity = ls.opacity ?? (lc.bud ? 0.7 : 0.88);
                      // Curl: shrivelling/brown leaves tilt inward more
                      const curlAngle = tangAngle + side * (42 + ls.curl * 35);
                      allLeaves.push({ x: p.x, y: p.y, angle: curlAngle, lw, lh, fill, stroke, bud: lc.bud || leafState === 'budding', opacity, shrivelled: ls.curl > 0.3 });
                    }
                  });

                  return (
                    <g key={`link-${i}`}>
                      {/* Render core first, then wrapped strands, growing strand last (on top) */}
                      {activeStrands.map(({ d, width, role, colorDark, colorLight }, si) => {
                        // Compute total path length for dasharray when animating
                        const pathLen = dist * 1.1; // approximate
                        return (
                          <path key={`s-${si}`} d={d} fill="none"
                            stroke={theme.darkMode ? colorDark : colorLight}
                            strokeWidth={width}
                            strokeLinejoin="round" strokeLinecap="round"
                            opacity={role === 'growing' ? 0.78 : role === 'core' ? 1 : 0.9}
                            {...(dashOffset !== null ? {
                              strokeDasharray: pathLen * 3,
                              strokeDashoffset: (pathLen * 3) * (1 - growingVine.progress),
                            } : {})}
                          />
                        );
                      })}
                      {/* Leaves — drawn after strands */}
                      {allLeaves.map((lf, li) => {
                        const leafD = (lf.bud || lf.shrivelled)
                          ? `M 0,0 C ${lf.lw*0.15},${-lf.lh*0.4} ${lf.lw*0.7},${-lf.lh*0.35} ${lf.lw},0 C ${lf.lw*0.7},${lf.lh*0.35} ${lf.lw*0.15},${lf.lh*0.4} 0,0 Z`
                          : `M 0,0 C ${lf.lw*0.25},${-lf.lh} ${lf.lw*0.75},${-lf.lh} ${lf.lw},0 C ${lf.lw*0.75},${lf.lh} ${lf.lw*0.25},${lf.lh} 0,0 Z`;
                        const midrib = `M ${lf.lw*0.05},0 L ${lf.lw*0.82},0`;
                        return (
                          <g key={`lf-${li}`}
                            transform={`translate(${lf.x},${lf.y}) rotate(${lf.angle})`}
                            opacity={lf.opacity}
                            style={{ pointerEvents: 'none' }}
                          >
                            <path d={leafD} fill={lf.fill} stroke={lf.stroke} strokeWidth={0.5} />
                            {!lf.bud && <path d={midrib} fill="none" stroke={lf.stroke} strokeWidth={0.35} opacity={0.5} />}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            )}


            <g className="nodes-layer">
              {activeRenderNodes.flatMap(node => {
                const isLifted = liftedNodeId === node.id && viewMode === 'canvas';
                const scaleRatio = node.radius / 45;
                const plateWidth = Math.max(100, node.radius * 2.2);
                const baseScale = viewMode === 'calendar' ? CALENDAR_NODE_SCALE : 1;

                // Hide members of collapsed groups
                if (viewMode === 'canvas' && node.type !== 'hub' && node.type !== 'flower' && node.id !== 'me') {
                  const parentLink = links.find(l => (l.source === node.id || l.target === node.id) &&
                    (nodes.find(n => n.id === (l.source === node.id ? l.target : l.source))?.type === 'hub'));
                  if (parentLink) {
                    const hubId = parentLink.source === node.id ? parentLink.target : parentLink.source;
                    if (collapsedGroups.includes(hubId)) return [];
                  }
                }
                // Flower nodes are rendered separately in the flower type branch
                if (node.type === 'flower' && viewMode === 'calendar') return [];

                if (viewMode !== 'canvas' || node.type === 'hub' || node.type === 'flower' || node.id === 'me') {
                  // Hub / Me / flower / calendar: render once normally
                  const isSelected = selectedNodeId === node.id;
                  const isHoverTarget = hoverTarget === node.id;
                  return [(
                    <g key={node.id}
                      transform={`translate(${node.renderX}, ${node.renderY}) scale(${isLifted ? baseScale * 1.1 : baseScale})`}
                      style={{transition: nodeTransition(node.id), WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none'}}
                      opacity={isLifted ? 0.72 : (node.type==='flower'||node.type==='hub'||node.id==='me'||isTagFiltered(node.id) ? 1 : 0.15)}
                      className="cursor-pointer"
                      onPointerDown={e => handlePointerDown(e, node.id)}
                    >
                      {/* Selection ring in select-for-group mode */}
                      {selectForGroupMode && selectedForGroup.includes(node.id) && (
                        <circle cx={0} cy={0} r={node.radius + 14} fill="rgba(22,163,74,0.2)" stroke="#16a34a" strokeWidth="5" style={{pointerEvents:'none'}}/>
                      )}
                      {/* Dim unselected in select mode */}
                      {selectForGroupMode && !selectedForGroup.includes(node.id) && node.type !== 'hub' && node.type !== 'flower' && (
                        <circle cx={0} cy={0} r={node.radius} fill="rgba(0,0,0,0.5)" style={{pointerEvents:'none'}}/>
                      )}
                      {node.type === 'flower' && viewMode === 'canvas' ? (
                        (() => {
                          const dim = dimensions[node.dimKey];
                          if (!dim) return null;
                          const h = dim.health ?? 1;
                          const PETALS = 6;
                          const flowerR = node.radius;
                          const petalL = flowerR * (0.45 + h * 0.25);
                          const petalW = petalL * 0.70;
                          const mainColor = h > 0.5 ? dim.color : `hsl(30,${Math.round(h*60)}%,${30+Math.round(h*20)}%)`;
                          const centreR = flowerR * 0.50;
                          const buildPetals = (scale = 1) => Array.from({length: PETALS}, (_, pi) => {
                            const pa = (pi / PETALS) * Math.PI * 2;
                            const L = petalL * scale, W = petalW * scale;
                            const tx = Math.cos(pa) * L, ty = Math.sin(pa) * L;
                            const perpA = pa + Math.PI * 0.5;
                            const cp1x = Math.cos(pa)*L*0.35 + Math.cos(perpA)*W*0.6;
                            const cp1y = Math.sin(pa)*L*0.35 + Math.sin(perpA)*W*0.6;
                            const cp2x = Math.cos(pa)*L*0.85 + Math.cos(perpA)*W*0.5;
                            const cp2y = Math.sin(pa)*L*0.85 + Math.sin(perpA)*W*0.5;
                            const cp3x = Math.cos(pa)*L*0.85 - Math.cos(perpA)*W*0.5;
                            const cp3y = Math.sin(pa)*L*0.85 - Math.sin(perpA)*W*0.5;
                            const cp4x = Math.cos(pa)*L*0.35 - Math.cos(perpA)*W*0.6;
                            const cp4y = Math.sin(pa)*L*0.35 - Math.sin(perpA)*W*0.6;
                            return `M 0,0 C ${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty} C ${cp3x},${cp3y} ${cp4x},${cp4y} 0,0`;
                          }).join(' ');
                          return (
                            <g onPointerDown={e => handlePointerDown(e, node.id)}
                              style={{cursor:'pointer'}}>
                              {isSelected && <circle r={flowerR + 10} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4 3" />}
                              {/* Hover ring when drag target */}
                              {isHoverTarget && <circle r={flowerR + 14} fill="none" stroke="#3B82F6" strokeWidth="5" strokeDasharray="8 4" opacity={0.9}/>}
                              {/* Back petals rotated for depth */}
                              <g transform={`rotate(${360/PETALS/2})`} opacity={0.55}>
                                <path d={buildPetals(0.88)} fill={mainColor} />
                              </g>
                              {/* Main petals */}
                              <path d={buildPetals()} fill={mainColor} opacity={0.92} />
                              {/* White accent tips — small inner petals */}
                              <g transform={`rotate(${360/PETALS/2})`} opacity={0.35}>
                                <path d={buildPetals(0.55)} fill="white" />
                              </g>
                              <path d={buildPetals(0.45)} fill="white" opacity={0.25} />
                              {/* Centre — name in the disc */}
                              <circle r={centreR} fill="white" opacity={0.92} />
                              <circle r={centreR * 0.88} fill={mainColor} />
                              {/* White SVG icon for each dimension */}
                              {(() => {
                                const ic = centreR * 0.55; // icon half-size
                                const icons = {
                                  social: ( // three overlapping head silhouettes
                                    <g fill="white" style={{pointerEvents:'none',userSelect:'none'}}>
                                      {/* left person */}
                                      <circle cx={-ic*0.52} cy={-ic*0.22} r={ic*0.28}/>
                                      <ellipse cx={-ic*0.52} cy={ic*0.42} rx={ic*0.38} ry={ic*0.28}/>
                                      {/* right person */}
                                      <circle cx={ic*0.52} cy={-ic*0.22} r={ic*0.28}/>
                                      <ellipse cx={ic*0.52} cy={ic*0.42} rx={ic*0.38} ry={ic*0.28}/>
                                      {/* centre person — on top */}
                                      <circle cx={0} cy={-ic*0.32} r={ic*0.32}/>
                                      <ellipse cx={0} cy={ic*0.5} rx={ic*0.42} ry={ic*0.3}/>
                                    </g>
                                  ),
                                  creativity: ( // palette with dots
                                    <g fill="white" style={{pointerEvents:'none',userSelect:'none'}}>
                                      <ellipse cx={0} cy={ic*0.05} rx={ic*0.82} ry={ic*0.72}/>
                                      {/* thumb hole */}
                                      <ellipse cx={ic*0.35} cy={ic*0.55} rx={ic*0.22} ry={ic*0.18} fill={mainColor}/>
                                      {/* colour dots */}
                                      <circle cx={-ic*0.42} cy={-ic*0.28} r={ic*0.13} fill={mainColor}/>
                                      <circle cx={0} cy={-ic*0.52} r={ic*0.13} fill={mainColor}/>
                                      <circle cx={ic*0.42} cy={-ic*0.28} r={ic*0.13} fill={mainColor}/>
                                      <circle cx={-ic*0.55} cy={ic*0.1} r={ic*0.13} fill={mainColor}/>
                                    </g>
                                  ),
                                  knowledge: ( // stack of books
                                    <g fill="white" style={{pointerEvents:'none',userSelect:'none'}}>
                                      {/* bottom book */}
                                      <rect x={-ic*0.82} y={ic*0.25} width={ic*1.64} height={ic*0.38} rx={ic*0.06}/>
                                      {/* middle book - slightly narrower, rotated hint */}
                                      <rect x={-ic*0.72} y={-ic*0.12} width={ic*1.44} height={ic*0.35} rx={ic*0.06}/>
                                      {/* top book */}
                                      <rect x={-ic*0.78} y={-ic*0.48} width={ic*1.56} height={ic*0.35} rx={ic*0.06}/>
                                      {/* spine lines on each book */}
                                      <rect x={-ic*0.82} y={ic*0.25} width={ic*0.12} height={ic*0.38} rx={ic*0.03} fill={mainColor}/>
                                      <rect x={-ic*0.72} y={-ic*0.12} width={ic*0.12} height={ic*0.35} rx={ic*0.03} fill={mainColor}/>
                                      <rect x={-ic*0.78} y={-ic*0.48} width={ic*0.12} height={ic*0.35} rx={ic*0.03} fill={mainColor}/>
                                    </g>
                                  ),
                                  growth: ( // sprouting plant with two leaves
                                    <g fill="white" style={{pointerEvents:'none',userSelect:'none'}}>
                                      {/* stem */}
                                      <path d={`M 0,${ic*0.75} L 0,${-ic*0.2}`} stroke="white" strokeWidth={ic*0.12} fill="none" strokeLinecap="round"/>
                                      {/* left leaf */}
                                      <path d={`M 0,${ic*0.1} C ${-ic*0.7},${ic*0.1} ${-ic*0.75},${-ic*0.45} ${-ic*0.1},${-ic*0.2} Z`}/>
                                      {/* right leaf */}
                                      <path d={`M 0,${-ic*0.1} C ${ic*0.7},${-ic*0.1} ${ic*0.75},${-ic*0.55} ${ic*0.05},${-ic*0.3} Z`}/>
                                      {/* top bud */}
                                      <ellipse cx={0} cy={-ic*0.52} rx={ic*0.18} ry={ic*0.24}/>
                                      {/* roots */}
                                      <path d={`M 0,${ic*0.75} Q ${-ic*0.35},${ic*0.88} ${-ic*0.5},${ic*0.9}`} stroke="white" strokeWidth={ic*0.08} fill="none" strokeLinecap="round"/>
                                      <path d={`M 0,${ic*0.75} Q ${ic*0.35},${ic*0.88} ${ic*0.5},${ic*0.92}`} stroke="white" strokeWidth={ic*0.08} fill="none" strokeLinecap="round"/>
                                    </g>
                                  ),
                                  health: ( // rounder smoother heart
                                    <g fill="white" style={{pointerEvents:'none',userSelect:'none'}}>
                                      <path d={`
                                        M 0,${ic*0.55}
                                        C ${-ic*0.4},${ic*0.2} ${-ic*0.95},${-ic*0.05} ${-ic*0.82},${-ic*0.48}
                                        C ${-ic*0.7},${-ic*0.78} ${-ic*0.3},${-ic*0.82} 0,${-ic*0.5}
                                        C ${ic*0.3},${-ic*0.82} ${ic*0.7},${-ic*0.78} ${ic*0.82},${-ic*0.48}
                                        C ${ic*0.95},${-ic*0.05} ${ic*0.4},${ic*0.2} 0,${ic*0.55}
                                        Z`}/>
                                    </g>
                                  ),
                                };
                                return icons[node.dimKey] || null;
                              })()}
                              {/* + button bottom-right of flower */}
                              <g transform={`translate(${centreR * 0.7}, ${centreR * 0.7})`}
                                style={{cursor:'pointer', pointerEvents:'all'}}
                                onPointerDown={e => { e.stopPropagation(); setFlowerPanel(node.dimKey); }}>
                                <circle r={centreR * 0.32} fill="#16a34a" stroke="white" strokeWidth="1.5"/>
                                <text textAnchor="middle" dominantBaseline="middle"
                                  fontSize={centreR * 0.38} fontWeight="900" fill="white"
                                  style={{userSelect:'none', pointerEvents:'none'}}>+</text>
                              </g>
                            </g>
                          );
                        })()
                      ) : node.type === 'hub' && viewMode === 'canvas' ? (
                        <g transform={`scale(${scaleRatio})`}>
                          {isSelected && <rect x="-60" y="-80" width="120" height="100" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" rx="8" />}
                          {isHoverTarget && <rect x="-65" y="-85" width="130" height="110" fill="none" stroke="#3B82F6" strokeWidth="4" strokeDasharray="8 4" rx="10" />}

                          {/* ── SIGN — on top ── */}
                          <rect x="-55" y="-50" width="110" height="32" fill="#A0522D" rx="4" />
                          <rect x="-55" y="-50" width="110" height="32" fill="none" stroke="#5C3A21" strokeWidth="2" rx="4" />
                          {theme.showWeathering && <>
                            <line x1="-50" y1="-44" x2="50" y2="-44" stroke="#7A3A18" strokeWidth="0.6" opacity="0.3"/>
                            <line x1="-50" y1="-36" x2="50" y2="-36" stroke="#7A3A18" strokeWidth="0.6" opacity="0.25"/>
                            <rect x="-55" y="-50" width="110" height="32" fill="rgba(0,0,0,0.08)" rx="4"/>
                          </>}
                          <text y="-28" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">
                            {node.label.length > 12 ? node.label.substring(0, 11) + '...' : node.label}
                          </text>

                          {/* Collapsed badge */}
                          {collapsedGroups.includes(node.id) && (() => {
                            const mc = links.filter(l=>(l.source===node.id||l.target===node.id)&&nodes.find(n=>n.id===(l.source===node.id?l.target:l.source)&&n.type!=='flower'&&n.id!=='me')).length;
                            return <g transform="translate(28,-50)">
                              <circle r={14} fill="#10b981"/><text textAnchor="middle" y={5} fontSize="12" fontWeight="900" fill="white" style={{userSelect:'none'}}>{mc}</text>
                            </g>;
                          })()}
                        </g>
                      ) : (
                        // Me node or calendar person
                        <g>
                          {isSelected && !isHoverTarget && !isLifted && <circle r={node.radius + 6} fill="none" stroke="#10B981" strokeWidth="3" />}
                          {isHoverTarget && <circle r={node.radius + 10} fill="none" stroke="#3B82F6" strokeWidth="6" strokeDasharray="6 4" />}

                          {/* Me flower — behind image */}
                          {node.id === 'me' && node.partnerFlower && (() => {
                            const pf = node.partnerFlower;
                            const r2 = node.radius;
                            const PETALS = pf.petals || 6;
                            const petalLen = pf.petalLength ?? 0.55;
                            const pr = r2 * (1 + petalLen), pw = pr * 0.65;
                            const buildPF = (scale=1) => Array.from({length:PETALS},(_,pi)=>{
                              const pa=(pi/PETALS)*Math.PI*2;
                              const L=pr*scale,W=pw*scale,tx=Math.cos(pa)*L,ty=Math.sin(pa)*L,perpA=pa+Math.PI*0.5;
                              const c1x=Math.cos(pa)*L*0.35+Math.cos(perpA)*W*0.6,c1y=Math.sin(pa)*L*0.35+Math.sin(perpA)*W*0.6;
                              const c2x=Math.cos(pa)*L*0.85+Math.cos(perpA)*W*0.5,c2y=Math.sin(pa)*L*0.85+Math.sin(perpA)*W*0.5;
                              const c3x=Math.cos(pa)*L*0.85-Math.cos(perpA)*W*0.5,c3y=Math.sin(pa)*L*0.85-Math.sin(perpA)*W*0.5;
                              const c4x=Math.cos(pa)*L*0.35-Math.cos(perpA)*W*0.6,c4y=Math.sin(pa)*L*0.35-Math.sin(perpA)*W*0.6;
                              return `M 0,0 C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty} C ${c3x},${c3y} ${c4x},${c4y} 0,0`;
                            }).join(' ');
                            const pid = `pf-me`;
                            const mainFill = pf.pattern==='radial'?`url(#${pid}-radial)`:pf.petalColor;
                            return (
                              <g style={{pointerEvents:'none'}}>
                                <defs>
                                  <pattern id={`${pid}-tiger`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="12" fill={pf.patternColor||'#1e293b'} opacity="0.7"/></pattern>
                                  <pattern id={`${pid}-dots`} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill={pf.patternColor||pf.subPetalColor}/></pattern>
                                  <radialGradient id={`${pid}-radial`} cx="0" cy="0" r={pr} gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={pf.radialColor2||'#ffffff'}/><stop offset="100%" stopColor={pf.petalColor}/></radialGradient>
                                </defs>
                                {(pf.subPetals??6)>0&&(()=>{
                                  const SP=pf.subPetals??6,spl=pf.subPetalLength??0.47;
                                  const spr=r2*(1+spl),spw=spr*0.65;
                                  const spPath=Array.from({length:SP},(_,pi)=>{const pa=(pi/SP)*Math.PI*2,L=spr,W=spw,tx=Math.cos(pa)*L,ty=Math.sin(pa)*L,perpA=pa+Math.PI*0.5;const c1x=Math.cos(pa)*L*0.35+Math.cos(perpA)*W*0.6,c1y=Math.sin(pa)*L*0.35+Math.sin(perpA)*W*0.6,c2x=Math.cos(pa)*L*0.85+Math.cos(perpA)*W*0.5,c2y=Math.sin(pa)*L*0.85+Math.sin(perpA)*W*0.5,c3x=Math.cos(pa)*L*0.85-Math.cos(perpA)*W*0.5,c3y=Math.sin(pa)*L*0.85-Math.sin(perpA)*W*0.5,c4x=Math.cos(pa)*L*0.35-Math.cos(perpA)*W*0.6,c4y=Math.sin(pa)*L*0.35-Math.sin(perpA)*W*0.6;return `M 0,0 C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty} C ${c3x},${c3y} ${c4x},${c4y} 0,0`;}).join(' ');
                                  return <g transform={`rotate(${360/SP/2})`} opacity={0.55}><path d={spPath} fill={pf.subPetalColor} stroke={pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?pf.subPetalBorderColor:'none'} strokeWidth={pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?1:0}/></g>;
                                })()}
                                <path d={buildPF()} fill={mainFill} opacity={0.9} stroke={pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?pf.petalBorderColor:'none'} strokeWidth={pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?1:0}/>
                                {pf.pattern&&pf.pattern!=='solid'&&pf.pattern!=='radial'&&<path d={buildPF()} fill={`url(#${pid}-${pf.pattern})`} opacity={0.4}/>}
                              </g>
                            );
                          })()}

                          <circle r={node.radius} fill={theme.darkMode ? "#1e293b" : "white"} stroke={viewMode === 'calendar' ? node.monthColor : "none"} strokeWidth={viewMode === 'calendar' ? 8 : 0} />
                          <clipPath id={`clip-${node.id}`}><circle r={node.radius - (viewMode === 'calendar' ? 8 : 4)} /></clipPath>
                          <image href={node.img} x={-node.radius} y={-node.radius} width={node.radius * 2} height={node.radius * 2} clipPath={`url(#clip-${node.id})`} preserveAspectRatio="xMidYMid slice" />
                          {/* Me centre border ring on top */}
                          {node.id === 'me' && node.partnerFlower && (
                            <circle r={node.radius+2} fill="none" stroke={node.partnerFlower.borderColor||'#a855f7'} strokeWidth="3" opacity={0.9}/>
                          )}
                          {/* Photo border — drawn after image so it's visible on top */}
                          {photoBorderMode !== 'none' && node.type !== 'hub' && node.type !== 'flower' && node.id !== 'me' && getPhotoBorderColor(node) && (
                            <circle r={node.radius + 3} fill="none" stroke={getPhotoBorderColor(node)} strokeWidth="4" opacity="0.95"/>
                          )}

                          {/* Diary + button — bottom-left of Me photo */}
                          {node.id === 'me' && viewMode === 'canvas' && (
                            <g transform={`translate(${-node.radius * 0.7}, ${node.radius * 0.7})`}
                              style={{cursor:'pointer', pointerEvents:'all'}}
                              onPointerDown={e => { e.stopPropagation(); setDiaryOpen(true); }}
                            >
                              <circle r={12} fill="#16a34a" stroke={theme.darkMode ? '#0f172a' : 'white'} strokeWidth={2} />
                              <text textAnchor="middle" dominantBaseline="middle"
                                fontSize="16" fontWeight="bold" fill="white"
                                style={{userSelect:'none', pointerEvents:'none'}}>+</text>
                            </g>
                          )}

                          {viewMode === 'canvas' && (
                            <>
                              {/* Name label — arc-shaped grey band at bottom of circle */}
                              {(() => {
                                const r = node.radius - 3; // clip inside the border
                                // The label band starts at y = r * 0.52 (roughly bottom third)
                                const bandTop = r * 0.52;
                                // Arc path: go from left edge of circle at bandTop,
                                // arc along the bottom of the circle, close back up as a chord
                                const halfW = Math.sqrt(Math.max(0, r*r - bandTop*bandTop));
                                const arcPath = [
                                  `M ${-halfW},${bandTop}`,
                                  `A ${r},${r} 0 0,0 ${halfW},${bandTop}`,
                                  `L ${halfW},${bandTop}`,
                                  // Arc back down around the bottom of the circle
                                  `A ${r},${r} 0 0,1 ${-halfW},${bandTop}`,
                                  'Z'
                                ].join(' ');
                                // Simpler: use a rect clipped by the photo clipPath
                                const labelY = r * 0.55;
                                const bandH = r * 0.48;
                                const fs = Math.max(8, r * 0.26);
                                return (
                                  <g clipPath={`url(#clip-${node.id})`} style={{pointerEvents:'none'}}>
                                    <rect x={-r} y={labelY} width={r * 2} height={bandH}
                                      fill="rgba(55,65,81,0.78)" />
                                    <text y={labelY + bandH * 0.62} textAnchor="middle"
                                      fontSize={fs} fontWeight="700" fill="white"
                                      style={{userSelect:'none'}}>
                                      {node.label.length > 12 ? node.label.substring(0, 11) + '…' : node.label}
                                    </text>
                                  </g>
                                );
                              })()}
                            </>
                          )}
                          {viewMode === 'calendar' && (
                            <>
                              {/* Arc name label inside circle at bottom */}
                              <g clipPath={`url(#clip-${node.id})`} style={{pointerEvents:'none'}}>
                                <rect x={-node.radius} y={node.radius * 0.52}
                                  width={node.radius * 2} height={node.radius * 0.52}
                                  fill="rgba(0,0,0,0.65)" />
                                <text y={node.radius * 0.83} textAnchor="middle"
                                  fontSize={Math.max(7, node.radius * 0.22)} fontWeight="700" fill="white"
                                  style={{userSelect:'none'}}>
                                  {node.label.length > 12 ? node.label.substring(0, 11) + '…' : node.label}
                                </text>
                              </g>
                              {/* Age badge — top-right corner circle */}
                              <g transform={`translate(${node.radius * 0.62}, ${-node.radius * 0.62})`}>
                                <circle r={node.radius * 0.28}
                                  fill={node.isMilestone ? '#FBBF24' : (theme.darkMode ? '#1e293b' : 'white')}
                                  stroke={node.isMilestone ? '#B45309' : node.monthColor}
                                  strokeWidth={node.radius * 0.04} />
                                <text textAnchor="middle" dominantBaseline="middle"
                                  fontSize={Math.max(6, node.radius * 0.2)}
                                  fontWeight="900"
                                  fill={node.isMilestone ? '#451a03' : (theme.darkMode ? '#e2e8f0' : '#1e293b')}
                                  style={{userSelect:'none'}}>
                                  {node.age}
                                </text>
                              </g>
                              {/* Star for milestone birthdays — top-left */}
                              {node.isMilestone && (
                                <g transform={`translate(${-node.radius * 0.62}, ${-node.radius * 0.62})`}>
                                  <text textAnchor="middle" dominantBaseline="middle"
                                    fontSize={node.radius * 0.35} style={{userSelect:'none'}}>⭐</text>
                                </g>
                              )}
                            </>
                          )}
                        </g>
                      )}
                    </g>
                  )];
                }

                // ── Canvas person node: render one copy per group membership ──
                const gv = node.groupVisibility || {};
                const groupEntries = Object.entries(gv).filter(([, vis]) => vis >= 2); // vis 2=small, 3=full

                if (groupEntries.length === 0) {
                  // No group memberships set — render once at own position (unaffiliated)
                  const isSelected = selectedNodeId === node.id;
                  const isHoverTarget = hoverTarget === node.id;
                  const r = node.radius;
                  const pw = Math.max(100, r * 2.2);
                  return [(
                    <g key={node.id}
                      transform={`translate(${node.renderX}, ${node.renderY}) scale(${isLifted ? 1.1 : 1})`}
                      style={{transition: nodeTransition(node.id), WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none'}}
                      opacity={isLifted ? 0.72 : (isTagFiltered(node.id) ? 1 : 0.15)}
                      className="cursor-pointer"
                      onPointerDown={e => handlePointerDown(e, node.id)}
                    >
                      {isSelected && !isHoverTarget && !isLifted && <circle r={r + 6} fill="none" stroke="#10B981" strokeWidth="3" />}
                      {isHoverTarget && <circle r={r + 10} fill="none" stroke="#3B82F6" strokeWidth="6" strokeDasharray="6 4" />}

                      {/* Partner flower — drawn BEFORE image so it's behind the photo */}
                      {node.isPartner && (() => {
                        const pf = node.partnerFlower || {petals:6,petalColor:'#f43f5e',subPetalColor:'#fda4af',petalBorderColor:'#9f1239',subPetalBorderColor:'#fecdd3',borderColor:'#9f1239',pattern:'solid',petalLength:0.55};
                        const PETALS = pf.petals || 6;
                        const petalLen = pf.petalLength ?? 0.55;
                        const pr = r * (1 + petalLen), pw = pr * 0.65;
                        const buildPF = (scale=1) => Array.from({length:PETALS},(_,pi)=>{
                          const pa=(pi/PETALS)*Math.PI*2;
                          const L=pr*scale,W=pw*scale,tx=Math.cos(pa)*L,ty=Math.sin(pa)*L,perpA=pa+Math.PI*0.5;
                          const c1x=Math.cos(pa)*L*0.35+Math.cos(perpA)*W*0.6,c1y=Math.sin(pa)*L*0.35+Math.sin(perpA)*W*0.6;
                          const c2x=Math.cos(pa)*L*0.85+Math.cos(perpA)*W*0.5,c2y=Math.sin(pa)*L*0.85+Math.sin(perpA)*W*0.5;
                          const c3x=Math.cos(pa)*L*0.85-Math.cos(perpA)*W*0.5,c3y=Math.sin(pa)*L*0.85-Math.sin(perpA)*W*0.5;
                          const c4x=Math.cos(pa)*L*0.35-Math.cos(perpA)*W*0.6,c4y=Math.sin(pa)*L*0.35-Math.sin(perpA)*W*0.6;
                          return `M 0,0 C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty} C ${c3x},${c3y} ${c4x},${c4y} 0,0`;
                        }).join(' ');
                        const pid = `pf-${node.id}`;
                        const mainFill = pf.pattern==='radial' ? `url(#${pid}-radial)` : pf.petalColor;
                        return (
                          <g style={{pointerEvents:'none'}}>
                            <defs>
                              <pattern id={`${pid}-tiger`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="12" fill={pf.patternColor||'#1e293b'} opacity="0.7"/></pattern>
                              <pattern id={`${pid}-dots`} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill={pf.patternColor||pf.subPetalColor}/></pattern>
                              <radialGradient id={`${pid}-radial`} cx="0" cy="0" r={pr} gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={pf.radialColor2||'#ffffff'}/><stop offset="100%" stopColor={pf.petalColor}/></radialGradient>
                            </defs>
                            {(pf.subPetals??6)>0&&(()=>{
                              const SP=pf.subPetals??6,spl=pf.subPetalLength??0.47;
                              const spr=r*(1+spl),spw=spr*0.65;
                              const spPath=Array.from({length:SP},(_,pi)=>{const pa=(pi/SP)*Math.PI*2,L=spr,W=spw,tx=Math.cos(pa)*L,ty=Math.sin(pa)*L,perpA=pa+Math.PI*0.5;const c1x=Math.cos(pa)*L*0.35+Math.cos(perpA)*W*0.6,c1y=Math.sin(pa)*L*0.35+Math.sin(perpA)*W*0.6,c2x=Math.cos(pa)*L*0.85+Math.cos(perpA)*W*0.5,c2y=Math.sin(pa)*L*0.85+Math.sin(perpA)*W*0.5,c3x=Math.cos(pa)*L*0.85-Math.cos(perpA)*W*0.5,c3y=Math.sin(pa)*L*0.85-Math.sin(perpA)*W*0.5,c4x=Math.cos(pa)*L*0.35-Math.cos(perpA)*W*0.6,c4y=Math.sin(pa)*L*0.35-Math.sin(perpA)*W*0.6;return `M 0,0 C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty} C ${c3x},${c3y} ${c4x},${c4y} 0,0`;}).join(' ');
                              return <g transform={`rotate(${360/SP/2})`} opacity={0.55}><path d={spPath} fill={pf.subPetalColor} stroke={pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?pf.subPetalBorderColor:'none'} strokeWidth={pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?1:0}/></g>;
                            })()}
                            <path d={buildPF()} fill={mainFill} opacity={0.9} stroke={pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?pf.petalBorderColor:'none'} strokeWidth={pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?1:0}/>
                            {pf.pattern&&pf.pattern!=='solid'&&pf.pattern!=='radial'&&(
                              <path d={buildPF()} fill={`url(#${pid}-${pf.pattern})`} opacity={0.4}/>
                            )}
                          </g>
                        );
                      })()}

                      <circle r={r} fill={theme.darkMode ? "#1e293b" : "white"} />
                      <clipPath id={`clip-${node.id}`}><circle r={r - 4} /></clipPath>
                      <image href={node.img} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#clip-${node.id})`} preserveAspectRatio="xMidYMid slice" />

                      {/* Centre border ring — drawn after image, on top */}
                      {node.isPartner && (
                        <circle r={r+2} fill="none" stroke={(node.partnerFlower?.borderColor)||'#9f1239'} strokeWidth="3" opacity={0.9}/>
                      )}
                      {photoBorderMode !== 'none' && getPhotoBorderColor(node) && (
                        <circle r={r + 3} fill="none" stroke={getPhotoBorderColor(node)} strokeWidth="4" opacity="0.95"/>
                      )}
                      {/* Tier picker in tierPickMode */}
                      {tierPickMode && (() => {
                        const scored = node.interactionScore > 0 || node.isFamily || node.isPartner;
                        const tiers = [
                          {label:'Acquaint.',score:50,color:'#84cc16'},
                          {label:'Friendly',score:200,color:'#22c55e'},
                          {label:'Good',score:450,color:'#16a34a'},
                          {label:'Close',score:800,color:'#15803d'},
                          {label:'Kindred',score:1200,color:'#14532d'},
                          {label:'Family',score:1500,color:'#f59e0b'},
                        ];
                        if (scored) {
                          // Already picked — show single pill with reset tap
                          const picked = tiers.reduce((best,t) => Math.abs(t.score-(node.interactionScore||0)) < Math.abs(best.score-(node.interactionScore||0)) ? t : best, tiers[0]);
                          const bw=r*1.4, bh=r*0.5;
                          return (
                            <g transform={`translate(${-bw/2},${r+4})`}
                              style={{cursor:'pointer',pointerEvents:'all'}}
                              onPointerDown={e=>{
                                e.stopPropagation();
                                setNodes(prev=>{
                                  const updated = prev.map(n=>n.id===node.id?{...n,interactionScore:0,isFamily:false}:n);
                                  // Check if all people are now scored — if so exit tier mode
                                  const remaining = updated.filter(n=>n.type==='friend'&&!(n.interactionScore>0||n.isFamily||n.isPartner));
                                  if (remaining.length===0) setTierPickMode(false);
                                  return updated;
                                });
                              }}>
                              <rect width={bw} height={bh} rx={4} fill={picked.color} opacity={0.95}/>
                              <text x={bw/2} y={bh*0.68} textAnchor="middle"
                                fontSize={Math.max(6,r*0.2)} fontWeight="800" fill="white"
                                style={{userSelect:'none',pointerEvents:'none'}}>✓ {picked.label}</text>
                            </g>
                          );
                        }
                        // Not yet picked — show all options
                        const bw=r*0.42, bh=r*0.52, gap=2;
                        const totalW=6*bw+5*gap;
                        return (
                          <g>
                            {tiers.map((t,ti)=>{
                              const sx=-totalW/2+ti*(bw+gap);
                              return (
                                <g key={t.label} transform={`translate(${sx},${r+6})`}
                                  style={{cursor:'pointer',pointerEvents:'all'}}
                                  onPointerDown={e=>{
                                    e.stopPropagation();
                                    setNodes(prev=>{
                                      const isFamily = t.score===1500;
                                      const updated = prev.map(n=>n.id===node.id?{...n,interactionScore:isFamily?0:t.score,isFamily}:n);
                                      // Auto-exit if all people are now scored
                                      const remaining = updated.filter(n=>n.type==='friend'&&!(n.interactionScore>0||n.isFamily||n.isPartner));
                                      if (remaining.length===0) setTierPickMode(false);
                                      return updated;
                                    });
                                  }}>
                                  <rect width={bw} height={bh} rx={3} fill={t.color}/>
                                  <text x={bw/2} y={bh*0.65} textAnchor="middle"
                                    fontSize={Math.max(6,r*0.18)} fontWeight="800" fill="white"
                                    style={{userSelect:'none',pointerEvents:'none'}}>{t.label}</text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
                      {/* Name label — grey arc band inside circle bottom */}
                      <g clipPath={`url(#clip-${node.id})`} style={{pointerEvents:'none'}}>
                        <rect x={-r} y={r * 0.52} width={r * 2} height={r * 0.52}
                          fill="rgba(55,65,81,0.78)" />
                        <text y={r * 0.82} textAnchor="middle"
                          fontSize={Math.max(8, r * 0.26)} fontWeight="700" fill="white"
                          style={{userSelect:'none'}}>
                          {node.label.length > 12 ? node.label.substring(0, 11) + '…' : node.label}
                        </text>
                      </g>
                    </g>
                  )];
                }

                // One copy per group
                return groupEntries.map(([hubId, vis]) => {
                  const hub = nodes.find(n => n.id === hubId);
                  if (!hub) return null;

                  const isSmall = vis === 2;
                  const copyScale = isSmall ? 0.35 : 1;
                  const isSelected = selectedNodeId === node.id;

                  // Position this copy near the hub — offset slightly so multiple people don't stack
                  // Use a deterministic angle based on node+hub ids
                  const seed = (node.id + hubId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                  const angle = ((seed % 16) / 16) * Math.PI * 2;
                  const dist = 80 + (node.radius * copyScale);
                  const rx = hub.x + Math.cos(angle) * dist;
                  const ry = hub.y + Math.sin(angle) * dist;

                  const r = node.radius;
                  const pw = Math.max(80, r * 2);
                  const copyKey = `${node.id}-copy-${hubId}`;

                  return (
                    <g key={copyKey}
                      transform={`translate(${rx}, ${ry}) scale(${copyScale})`}
                      style={{transition: nodeTransition(node.id), transformOrigin: `${rx}px ${ry}px`}}
                      className="cursor-pointer"
                      onPointerDown={e => handlePointerDown(e, node.id)}
                      style={{
                        WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none',
                        filter: isSmall ? 'grayscale(80%) opacity(0.7)' : 'none'
                      }}
                    >
                      {isSelected && <circle r={r + 8} fill="none" stroke="#10B981" strokeWidth="3" />}
                      <circle r={r} fill={theme.darkMode ? "#1e293b" : "white"} />
                      <clipPath id={`clip-${copyKey}`}><circle r={r - 4} /></clipPath>
                      <image href={node.img} x={-r} y={-r} width={r * 2} height={r * 2} clipPath={`url(#clip-${copyKey})`} preserveAspectRatio="xMidYMid slice" />
                      {!isSmall && (
                        <g clipPath={`url(#clip-${copyKey})`} style={{pointerEvents:'none'}}>
                          <rect x={-r} y={r * 0.55} width={r * 2} height={r * 0.48}
                            fill="rgba(55,65,81,0.78)" />
                          <text y={r * 0.82} textAnchor="middle"
                            fontSize={Math.max(8, r * 0.26)} fontWeight="700" fill="white"
                            style={{userSelect:'none'}}>
                            {node.label.length > 12 ? node.label.substring(0, 11) + '…' : node.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }).filter(Boolean);
              })}
            </g>

            {/* Vine draw: ghost of all pending paths while mode is active */}
            {vineDrawMode && pendingPaths.map((p, pi) => p.pts.length > 1 && (
              <polyline key={pi}
                points={p.pts.map(pt => `${pt.x},${pt.y}`).join(' ')}
                fill="none" stroke="#22c55e" strokeWidth={2 / transform.scale}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={`${6 / transform.scale} ${5 / transform.scale}`}
                opacity={0.35}
                style={{ pointerEvents: 'none' }}
              />
            ))}
            {/* Current stroke being drawn — slightly more visible */}
            {vineDrawMode && currentStroke.length > 1 && (
              <g style={{ pointerEvents: 'none' }}>
                <polyline
                  points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke="#22c55e" strokeWidth={2.5 / transform.scale}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={`${7 / transform.scale} ${4 / transform.scale}`}
                  opacity={0.6}
                />
                <circle cx={currentStroke[0].x} cy={currentStroke[0].y}
                  r={9 / transform.scale} fill="#22c55e" opacity={0.35} />
              </g>
            )}

            {/* Pending vine connection — dotted preview line */}
            {vineConnectPrompt && (() => {
              const src = nodes.find(n => n.id === vineConnectPrompt.srcId);
              const tgt = nodes.find(n => n.id === vineConnectPrompt.tgtId);
              if (!src || !tgt) return null;
              return (
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke="#10b981" strokeWidth={3/transform.scale}
                  strokeDasharray={(12/transform.scale)+' '+(6/transform.scale)}
                  opacity="0.9" style={{pointerEvents:'none'}}
                />
              );
            })()}

            {/* Spawn popup — dotted circle at loop end with Friend / Group options */}
            {spawnPopup && (() => {
              // Use the actual drawn loop radius — buttons fill the circle
              const R = spawnPopup.r;
              // Buttons fill ~70% of the circle width, stacked vertically with a small gap
              const btnW = R * 1.3;
              const btnH = R * 0.55;
              const gap  = R * 0.12;
              const fs   = Math.max(8, R * 0.28);
              const sw   = Math.max(1, R * 0.04);
              const { x, y } = spawnPopup;
              const totalH = btnH * 2 + gap;
              return (
                <g style={{ pointerEvents: 'all' }} key="spawn-popup">
                  {/* Dotted circle outline */}
                  <circle cx={x} cy={y} r={R}
                    fill={theme.darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)'}
                    stroke="#22c55e" strokeWidth={sw}
                    strokeDasharray={`${R * 0.18} ${R * 0.12}`} />
                  {/* Source label — show who this will connect to */}
                  {spawnPopup.sourceLabel && (
                    <text x={x} y={y - totalH/2 - R * 0.18}
                      textAnchor="middle" fontSize={Math.max(7, R * 0.22)}
                      fill={theme.darkMode ? '#94a3b8' : '#64748b'}
                      style={{ userSelect:'none', pointerEvents:'none' }}>
                      connects to {spawnPopup.sourceLabel}
                    </text>
                  )}
                  {/* Friend button — upper half */}
                  <g transform={`translate(${x - btnW/2}, ${y - totalH/2})`}
                    className="cursor-pointer"
                    onClick={() => {
                      const newId = `node_${Date.now()}`;
                      const avatarKeys = Object.keys(AVATARS);
                      snapshot();
                      setNodes(prev => [...prev, {
                        id: newId, label: 'New Friend',
                        img: AVATARS[avatarKeys[Math.floor(Math.random() * avatarKeys.length)]],
                        x: spawnPopup.x, y: spawnPopup.y,
                        interactionScore: 0, pinned: false, type: 'friend',
                      }]);
                      if (spawnPopup.sourceNodeId) {
                        setLinks(prev => [...prev, { source: spawnPopup.sourceNodeId, target: newId }]);
                      }
                      setSelectedNodeId(newId);
                      setSpawnPopup(null);
                    }}
                  >
                    <rect width={btnW} height={btnH} rx={btnH * 0.45} fill="#16a34a" opacity={0.92} />
                    <text x={btnW/2} y={btnH * 0.64} textAnchor="middle"
                      fontSize={fs} fontWeight="700" fill="white"
                      style={{ userSelect:'none', pointerEvents:'none' }}>🌱 Friend</text>
                  </g>
                  {/* Group button — lower half */}
                  <g transform={`translate(${x - btnW/2}, ${y - totalH/2 + btnH + gap})`}
                    className="cursor-pointer"
                    onClick={() => {
                      const newId = `hub_${Date.now()}`;
                      snapshot();
                      setNodes(prev => [...prev, {
                        id: newId, type: 'hub', label: 'New Group',
                        x: spawnPopup.x, y: spawnPopup.y, pinned: false,
                      }]);
                      // Connect to source node if drawn from one, otherwise connect to Me
                      const linkSrc = spawnPopup.sourceNodeId || 'flower_social';
                      setLinks(prev => [...prev, { source: linkSrc, target: newId }]);
                      setGroupModal({ hubId: newId });
                      setSpawnPopup(null);
                    }}
                  >
                    <rect width={btnW} height={btnH} rx={btnH * 0.45} fill="#0f766e" opacity={0.92} />
                    <text x={btnW/2} y={btnH * 0.64} textAnchor="middle"
                      fontSize={fs} fontWeight="700" fill="white"
                      style={{ userSelect:'none', pointerEvents:'none' }}>🌳 Group</text>
                  </g>
                  {/* Dismiss ✕ */}
                  <g transform={`translate(${x + R * 0.68}, ${y - R * 0.68})`}
                    className="cursor-pointer"
                    onClick={() => setSpawnPopup(null)}
                  >
                    <circle r={R * 0.22} fill={theme.darkMode ? '#334155' : '#e2e8f0'} />
                    <text textAnchor="middle" dominantBaseline="middle"
                      fontSize={R * 0.2} fill={theme.darkMode ? '#e2e8f0' : '#334155'}
                      style={{ userSelect:'none', pointerEvents:'none' }}>✕</text>
                  </g>
                </g>
              );
            })()}
            {macheteMode && slashTrail.length > 1 && (
              <polyline
                points={slashTrail.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth={3 / transform.scale}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        </svg>

        {/* ── Restore banner after reset ────────────────────────────────────────── */}
      {dataSnapshot && (
        <div style={{position:'fixed',bottom:68,left:8,right:8,zIndex:450,
          background:'#1e3a5f',borderRadius:14,padding:'12px 16px',
          display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,
          boxShadow:'0 4px 24px rgba(0,0,0,0.4)',border:'1px solid #3b82f6'}}>
          <span style={{fontSize:13,fontWeight:600,color:'white'}}>↩ Undo last reset?</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={restoreSnapshot}
              style={{padding:'6px 14px',borderRadius:8,background:'#3b82f6',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>Restore</button>
            <button onClick={()=>{snapshotRef.current=null;setDataSnapshot(null);}}
              style={{padding:'6px 10px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'#94a3b8',border:'none',cursor:'pointer',fontSize:13}}>Dismiss</button>
          </div>
        </div>
      )}

      {/* ── Tier Pick Mode overlay ───────────────────────────────────────────── */}
      {tierPickMode && (() => {
        const remaining = nodes.filter(n=>n.type==='friend'&&!(n.interactionScore>0||n.isFamily||n.isPartner)).length;
        return (
          <div style={{position:'fixed',top:0,left:0,right:0,zIndex:300,
            padding:'10px 16px',background:'#1e3a5f',borderBottom:'3px solid #3b82f6',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
            <span style={{fontSize:13,fontWeight:700,color:'white'}}>
              ⭐ Set friendship levels {remaining>0?`— ${remaining} left`:'— all done!'}
            </span>
            <button onClick={()=>setTierPickMode(false)}
              style={{padding:'6px 14px',borderRadius:8,background:'#3b82f6',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>Done</button>
          </div>
        );
      })()}
      {selectForGroupMode && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, zIndex:300,
          display:'flex', flexDirection:'column', gap:6,
          padding:'12px 16px',
          background:'#064e3b',
          borderBottom:'3px solid #16a34a',
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,fontWeight:700,color:'white'}}>
              🫂 Tap people to add to group
            </span>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => {
                setLinks(prev => {
                  const toAdd = selectedForGroupRef.current;
                  const newLinks = [];
                  toAdd.forEach(id => {
                    const alreadyLinked = prev.some(l =>
                      (l.source === selectForGroupMode && l.target === id) ||
                      (l.source === id && l.target === selectForGroupMode)
                    );
                    if (!alreadyLinked) {
                      if (id === 'me') {
                        // Connect Me to social node, not the group hub
                        const meAlreadyLinkedToSocial = prev.some(l =>
                          (l.source === 'me' && l.target === 'flower_social') ||
                          (l.source === 'flower_social' && l.target === 'me')
                        );
                        if (!meAlreadyLinkedToSocial) {
                          newLinks.push({ source: 'me', target: 'flower_social' });
                        }
                      } else {
                        newLinks.push({ source: selectForGroupMode, target: id });
                      }
                    }
                  });
                  return [...prev, ...newLinks];
                });
                showToast('Added ' + selectedForGroupRef.current.length + ' people to group');
                setSelectForGroupMode(null);
                setSelectedForGroup([]);
                selectedForGroupRef.current = [];
              }} style={{padding:'6px 16px',borderRadius:8,background:'#16a34a',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>
                Confirm ({selectedForGroup.length})
              </button>
              <button onClick={() => { setSelectForGroupMode(null); setSelectedForGroup([]); }}
                style={{padding:'6px 12px',borderRadius:8,background:'#ef4444',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
                Cancel
              </button>
            </div>
          </div>
          {selectedForGroup.length > 0 && (
            <div style={{fontSize:11,color:'#86efac',display:'flex',gap:6,flexWrap:'wrap'}}>
              {selectedForGroup.map(id => {
                const n = nodes.find(x => x.id === id);
                return n ? <span key={id} style={{background:'rgba(255,255,255,0.15)',borderRadius:4,padding:'1px 6px'}}>{n.label}</span> : null;
              })}
            </div>
          )}
        </div>
      )}
        {showTutorial && viewMode === 'canvas' && (
          <div style={{
            position:'absolute', top:80, left:16, zIndex:60, width:240,
            background: theme.darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
            border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,
            borderRadius:16, padding:16,
            boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontWeight:800,fontSize:14,color:'#10b981'}}>🌳 Welcome!</span>
              <button onClick={()=>setShowTutorial(false)}
                style={{background:'none',border:'none',cursor:'pointer',color:theme.darkMode?'#94a3b8':'#64748b',fontSize:16}}>✕</button>
            </div>
            <ul style={{margin:0,padding:'0 0 0 16px',fontSize:12,color:theme.darkMode?'#94a3b8':'#64748b',lineHeight:1.8}}>
              <li><strong style={{color:theme.darkMode?'#e2e8f0':'#1e293b'}}>Double-tap</strong> a face to open profile</li>
              <li><strong style={{color:theme.darkMode?'#e2e8f0':'#1e293b'}}>Hold</strong> to drag and reposition</li>
              <li><strong style={{color:theme.darkMode?'#e2e8f0':'#1e293b'}}>➕</strong> to add friends or groups</li>
              <li><strong style={{color:theme.darkMode?'#e2e8f0':'#1e293b'}}>✨ Demo</strong> to see it in action</li>
            </ul>
          </div>
        )}

        {/* Active tag filter indicator — only shown when filters are on */}
        {viewMode === 'canvas' && activeTags.length > 0 && (
          <div style={{
            position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', zIndex:60,
            display:'flex', gap:6, alignItems:'center',
            background: theme.darkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.92)',
            borderRadius:99, padding:'6px 12px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
            border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,
          }}>
            <span style={{fontSize:11, fontWeight:700, color:'#10b981'}}>🏷 Filtering:</span>
            {activeTags.map(tag => (
              <span key={tag} style={{
                padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700,
                background:'#10b981', color:'white',
              }}>{tag}</span>
            ))}
            <button onClick={() => setActiveTags([])}
              style={{padding:'3px 8px', borderRadius:99, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, background:'#ef4444', color:'white'}}>✕</button>
          </div>
        )}
        {viewMode === 'calendar' && (
          <div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',zIndex:60,
            display:'flex',gap:6,background:theme.darkMode?'rgba(15,23,42,0.92)':'rgba(255,255,255,0.92)',
            borderRadius:99,padding:'6px 10px',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
            border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`}}>
            {[
              { id:'circle', label:'⭕ Circle' },
              { id:'spiral', label:'🌀 Spiral' },
              { id:'line',   label:'➡ Line' },
              { id:'wave',   label:'〰 Wave' },
              { id:'arc',    label:'🌈 Arc' },
            ].map(opt => (
              <button key={opt.id} onClick={() => setCalendarLayout(opt.id)}
                style={{
                  padding:'5px 12px', borderRadius:99, border:'none', cursor:'pointer',
                  fontSize:12, fontWeight:calendarLayout===opt.id?700:500,
                  background: calendarLayout===opt.id ? '#10b981' : 'transparent',
                  color: calendarLayout===opt.id ? 'white' : (theme.darkMode?'#94a3b8':'#64748b'),
                  transition:'all 0.15s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <div className={`absolute bottom-6 right-6 flex items-center space-x-2 p-2 rounded-xl shadow-lg border ${theme.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.01, p.scale / 1.3) }))} className={`p-2 rounded-lg transition-colors ${theme.darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><ZoomOut className="w-5 h-5" /></button>
          <span className={`text-xs font-semibold w-12 text-center ${theme.darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{Math.round(transform.scale * 100)}%</span>
          <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(3, p.scale * 1.3) }))} className={`p-2 rounded-lg transition-colors ${theme.darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><ZoomIn className="w-5 h-5" /></button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 z-50 pointer-events-none">
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
      </div>

      {/* ── Quick undo X button for new links ───────────────────────────────── */}
      {lastCreatedLink && (() => {
        const src = nodes.find(n => n.id === lastCreatedLink.source);
        const tgt = nodes.find(n => n.id === lastCreatedLink.target);
        if (!src || !tgt) return null;
        const midSvgX = (src.x + tgt.x) / 2;
        const midSvgY = (src.y + tgt.y) / 2;
        const sx = midSvgX * transform.scale + transform.x;
        const sy = midSvgY * transform.scale + transform.y;
        return (
          <div style={{
            position:'fixed',
            left: Math.max(8, Math.min(window.innerWidth-52, sx-22)),
            top: Math.max(8, Math.min(window.innerHeight-80, sy-22)),
            zIndex:500,
          }}>
            <button onClick={() => {
              setLinks(prev => prev.filter(l =>
                !(l.source===lastCreatedLink.source && l.target===lastCreatedLink.target) &&
                !(l.source===lastCreatedLink.target && l.target===lastCreatedLink.source)
              ));
              clearTimeout(lastLinkTimer.current);
              setLastCreatedLink(null);
              showToast('↩ Connection removed');
            }} style={{
              width:44, height:44, borderRadius:'50%',
              background:'#ef4444', border:'3px solid white',
              color:'white', fontSize:20, fontWeight:900,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
              lineHeight:1,
            }}>×</button>
          </div>
        );
      })()}
      {vineConnectPrompt && (() => {
        const src = nodes.find(n => n.id === vineConnectPrompt.srcId);
        const tgt = nodes.find(n => n.id === vineConnectPrompt.tgtId);
        if (!src || !tgt) return null;

        // Convert SVG coords to screen coords for the popup
        const midSvgX = (src.x + tgt.x) / 2;
        const midSvgY = (src.y + tgt.y) / 2;
        const screenX = midSvgX * transform.scale + transform.x;
        const screenY = midSvgY * transform.scale + transform.y;

        const tiers = [
          {label:'New',    score:0,   color:'#bef264'},
          {label:'Friend', score:100, color:'#84cc16'},
          {label:'Good',   score:300, color:'#166534'},
          {label:'Close',  score:600, color:'#3b82f6'},
          {label:'Family', score:800, color:'#9333ea'},
          {label:'💑 Partner', score:1500, color:'#f43f5e'},
        ];

        const confirmConnection = (score) => {
          setLinks(prev => [...prev, { source: vineConnectPrompt.srcId, target: vineConnectPrompt.tgtId }]);
          showLinkUndo(vineConnectPrompt.srcId, vineConnectPrompt.tgtId);
          // Apply score to the target (further from Me)
          setNodes(prev => prev.map(n =>
            n.id === vineConnectPrompt.tgtId
              ? { ...n, interactionScore: Math.max(n.interactionScore || 0, score) }
              : n
          ));
          showToast('🌱 Connected ' + src.label + ' → ' + tgt.label);
          setVineConnectPrompt(null);
        };

        return (
          <div style={{
            position:'fixed',
            left: Math.max(8, Math.min(window.innerWidth-220, screenX-100)),
            top: Math.max(8, Math.min(window.innerHeight-200, screenY-80)),
            zIndex:500,
            background:theme.darkMode?'#0f172a':'white',
            borderRadius:16,
            padding:'14px 16px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            border:'2px solid #10b981',
            width:200,
          }}>
            <div style={{fontSize:12,fontWeight:700,color:theme.darkMode?'#e2e8f0':'#1e293b',marginBottom:4,textAlign:'center'}}>
              {src.label} ↔ {tgt.label}
            </div>
            <div style={{fontSize:11,color:theme.darkMode?'#64748b':'#94a3b8',marginBottom:10,textAlign:'center'}}>
              What's their friendship?
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {tiers.map(t => (
                <button key={t.score} onClick={()=>confirmConnection(t.score)}
                  style={{
                    padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
                    background:t.color+'22', color:t.color,
                    fontSize:13, fontWeight:700, textAlign:'left',
                    borderLeft:'4px solid '+t.color,
                  }}>{t.label}</button>
              ))}
            </div>
            <button onClick={()=>setVineConnectPrompt(null)}
              style={{marginTop:10,width:'100%',padding:'6px',borderRadius:8,border:'none',
                background:'none',color:theme.darkMode?'#475569':'#94a3b8',
                cursor:'pointer',fontSize:12}}>Cancel</button>
          </div>
        );
      })()}
      {appLocked && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:900,
          background:theme.darkMode?'#0f172a':'#f8fafc',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
          <div style={{fontSize:48}}>🔒</div>
          <div style={{fontSize:20,fontWeight:800,color:theme.darkMode?'#e2e8f0':'#1e293b'}}>FriendshipTree</div>
          <div style={{fontSize:14,color:theme.darkMode?'#94a3b8':'#64748b'}}>Enter PIN to unlock</div>
          {/* PIN dots */}
          <div style={{display:'flex',gap:12,margin:'8px 0'}}>
            {Array.from({length:6}).map((_,i)=>(
              <div key={i} style={{width:14,height:14,borderRadius:'50%',
                background:i<pinInput.length?'#10b981':(theme.darkMode?'#334155':'#e2e8f0'),
                transition:'background 0.15s'}}/>
            ))}
          </div>
          {pinError && <div style={{color:'#ef4444',fontSize:12,fontWeight:600}}>{pinError}</div>}
          {/* Numpad */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,72px)',gap:10}}>
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i)=>(
              <button key={i} onClick={()=>{
                if(d==='') return;
                if(d==='⌫'){handlePinBackspace();return;}
                const next=(pinInput+String(d)).slice(0,6);
                setPinInput(next);setPinError('');
                if(next.length>=4){
                  setTimeout(()=>{
                    const stored=localStorage.getItem('ft_pin');
                    if(next===stored){setAppLocked(false);setPinInput('');}
                    else{setPinError('Wrong PIN');setPinInput('');}
                  },150);
                }
              }}
              style={{height:64,borderRadius:12,border:'none',cursor:d===''?'default':'pointer',
                background:d===''?'transparent':(theme.darkMode?'#1e293b':'white'),
                fontSize:d==='⌫'?20:22,fontWeight:600,
                color:theme.darkMode?'#e2e8f0':'#1e293b',
                boxShadow:d===''?'none':'0 2px 8px rgba(0,0,0,0.15)',
              }}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm Modal ───────────────────────────────────────────────────── */}
      {confirmModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:900,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e=>{if(e.target===e.currentTarget)setConfirmModal(null);}}>
          <div style={{background:theme.darkMode?'#0f172a':'white',borderRadius:20,padding:28,width:'min(90vw,300px)',textAlign:'center',boxShadow:'0 25px 60px rgba(0,0,0,0.4)'}}>
            <div style={{fontSize:36,marginBottom:10}}>{confirmModal.danger?'⚠️':'❓'}</div>
            <div style={{fontSize:17,fontWeight:800,color:theme.darkMode?'#e2e8f0':'#1e293b',marginBottom:8}}>{confirmModal.title}</div>
            <div style={{fontSize:13,color:theme.darkMode?'#94a3b8':'#64748b',marginBottom:22,lineHeight:1.5}}>{confirmModal.message}</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmModal(null)}
                style={{flex:1,padding:'11px',borderRadius:12,border:'none',cursor:'pointer',background:theme.darkMode?'#1e293b':'#f1f5f9',color:theme.darkMode?'#94a3b8':'#64748b',fontSize:14,fontWeight:700}}>
                Cancel
              </button>
              <button onClick={()=>{saveSnapshot();confirmModal.onConfirm();setConfirmModal(null);}}
                style={{flex:1,padding:'11px',borderRadius:12,border:'none',cursor:'pointer',background:confirmModal.danger?'#ef4444':'#10b981',color:'white',fontSize:14,fontWeight:700}}>
                {confirmModal.danger?'Yes, delete':'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PIN Modal ───────────────────────────────────────────────────────── */}
      {pinModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:800,background:'rgba(0,0,0,0.6)',
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e=>{if(e.target===e.currentTarget){setPinModal(null);setPinInput('');}}}>
          <div style={{background:theme.darkMode?'#0f172a':'white',borderRadius:20,padding:28,
            width:'min(90vw,320px)',textAlign:'center',boxShadow:'0 25px 60px rgba(0,0,0,0.4)'}}>
            <div style={{fontSize:32,marginBottom:8}}>{pinModal.mode==='set'?'🔐':'🔒'}</div>
            <div style={{fontSize:16,fontWeight:800,color:theme.darkMode?'#e2e8f0':'#1e293b',marginBottom:4}}>{pinModal.title}</div>
            <div style={{fontSize:12,color:theme.darkMode?'#64748b':'#94a3b8',marginBottom:16}}>
              {pinModal.mode==='set'?'Choose a 4–6 digit PIN':'Enter your PIN to continue'}
            </div>
            {/* PIN dots */}
            <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:8}}>
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} style={{width:12,height:12,borderRadius:'50%',
                  background:i<pinInput.length?'#10b981':(theme.darkMode?'#334155':'#e2e8f0'),transition:'background 0.15s'}}/>
              ))}
            </div>
            {pinError && <div style={{color:'#ef4444',fontSize:12,fontWeight:600,marginBottom:8}}>{pinError}</div>}
            {/* Numpad */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:8}}>
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i)=>(
                <button key={i} onClick={()=>{
                  if(d==='') return;
                  if(d==='⌫'){handlePinBackspace();return;}
                  handlePinDigit(String(d));
                }}
                  style={{padding:'14px 0',borderRadius:10,border:'none',cursor:d===''?'default':'pointer',
                    background:d===''?'transparent':(theme.darkMode?'#1e293b':'#f8fafc'),
                    fontSize:d==='⌫'?18:20,fontWeight:600,
                    color:theme.darkMode?'#e2e8f0':'#1e293b',
                    boxShadow:d===''?'none':'0 1px 4px rgba(0,0,0,0.1)',
                  }}>{d}</button>
              ))}
            </div>
            <button onClick={()=>{setPinModal(null);setPinInput('');}}
              style={{marginTop:16,padding:'8px 24px',borderRadius:99,border:'none',cursor:'pointer',
                background:'transparent',color:theme.darkMode?'#64748b':'#94a3b8',fontSize:13}}>Cancel</button>
          </div>
        </div>
      )}
      {mergePrompt && (() => {
        const nodeA = nodes.find(n => n.id === mergePrompt.a);
        const nodeB = nodes.find(n => n.id === mergePrompt.b);
        if (!nodeA || !nodeB) { setMergePrompt(null); return null; }
        const isGroup = mergePrompt.type === 'group';
        const dm = theme.darkMode;
        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:500,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}
            onClick={e => { if(e.target===e.currentTarget) setMergePrompt(null); }}>
            <div style={{background:dm?'#0f172a':'white',borderRadius:16,padding:24,width:'min(90vw,340px)',boxShadow:'0 25px 60px rgba(0,0,0,0.5)',border:`1px solid ${dm?'#334155':'#e2e8f0'}`}}>
              <div style={{fontSize:32,textAlign:'center',marginBottom:8}}>{isGroup ? '🌳' : '🤝'}</div>
              <h3 style={{textAlign:'center',fontWeight:800,fontSize:16,color:dm?'#e2e8f0':'#1e293b',marginBottom:6}}>
                {isGroup ? 'Merge Groups?' : 'Connect Friends?'}
              </h3>
              <p style={{textAlign:'center',fontSize:13,color:dm?'#94a3b8':'#64748b',marginBottom:20}}>
                {isGroup
                  ? `Merge "${nodeA.label}" into "${nodeB.label}"? All members will move to ${nodeB.label}.`
                  : `Add a connection between ${nodeA.label} and ${nodeB.label}?`}
              </p>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => {
                  snapshot();
                  if (isGroup) {
                    // Move all of A's members to B
                    const aMembers = links.filter(l => l.source === mergePrompt.a || l.target === mergePrompt.a)
                      .map(l => l.source === mergePrompt.a ? l.target : l.source)
                      .filter(id => id !== 'me' && id !== mergePrompt.b);
                    setLinks(prev => [
                      ...prev.filter(l => l.source !== mergePrompt.a && l.target !== mergePrompt.a),
                      ...aMembers.map(id => ({ source: mergePrompt.b, target: id })),
                    ]);
                    setNodes(prev => prev.filter(n => n.id !== mergePrompt.a));
                    showToast(`✅ Groups merged into ${nodeB.label}`);
                  } else {
                    setLinks(prev => [...prev, { source: mergePrompt.a, target: mergePrompt.b }]);
                    showToast(`🌱 ${nodeA.label} and ${nodeB.label} connected!`);
                  }
                  setMergePrompt(null);
                }} style={{flex:1,padding:'10px',borderRadius:10,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}>
                  {isGroup ? '✓ Merge' : '✓ Connect'}
                </button>
                <button onClick={() => setMergePrompt(null)}
                  style={{flex:1,padding:'10px',borderRadius:10,background:dm?'#334155':'#e2e8f0',color:dm?'#e2e8f0':'#334155',border:'none',cursor:'pointer',fontWeight:600,fontSize:14}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Search Overlay ───────────────────────────────────────────────────── */}
      {searchOpen && (() => {
        const dm = theme.darkMode;
        const q = searchQuery.toLowerCase();
        const results = q.length > 0 ? nodes.filter(n =>
          n.label?.toLowerCase().includes(q) && n.id !== 'me' && n.type !== 'flower'
        ) : [];
        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:500,background:'rgba(0,0,0,0.5)'}}
            onClick={e => { if(e.target===e.currentTarget) { setSearchOpen(false); setSearchQuery(''); } }}>
            <div style={{
              position:'absolute',top:20,left:'50%',transform:'translateX(-50%)',
              width:'min(90vw,420px)',background:dm?'#0f172a':'white',
              borderRadius:16,boxShadow:'0 20px 50px rgba(0,0,0,0.4)',
              border:`1px solid ${dm?'#334155':'#e2e8f0'}`,overflow:'hidden',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:`1px solid ${dm?'#334155':'#e2e8f0'}`}}>
                <span style={{fontSize:18}}>🔍</span>
                <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search people and groups…"
                  style={{flex:1,background:'none',border:'none',outline:'none',fontSize:15,color:dm?'#e2e8f0':'#1e293b'}}
                  onKeyDown={e=>e.key==='Escape'&&(setSearchOpen(false),setSearchQuery(''))} />
                <button onClick={()=>{setSearchOpen(false);setSearchQuery('');}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:dm?'#94a3b8':'#64748b'}}>✕</button>
              </div>
              {results.length > 0 && (
                <div style={{maxHeight:320,overflowY:'auto'}}>
                  {results.map(n => {
                    const tier = getTier(n.interactionScore||0, n);
                    const lvl = FRIENDSHIP_LEVELS.find(l=>l.tier===tier)||FRIENDSHIP_LEVELS[0];
                    return (
                      <div key={n.id} onClick={()=>{
                        setSelectedNodeId(n.id);
                        setViewMode('canvas');
                        setSearchOpen(false); setSearchQuery('');
                      }} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',borderBottom:`1px solid ${dm?'#1e293b':'#f8fafc'}`}}
                        onMouseEnter={e=>e.currentTarget.style.background=dm?'#1e293b':'#f8fafc'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {n.img && <img src={n.img} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:`2px solid ${lvl.color}`}} />}
                        {n.type==='hub' && <span style={{width:36,height:36,borderRadius:'50%',background:dm?'#334155':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🌳</span>}
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:dm?'#e2e8f0':'#1e293b'}}>{n.label}</div>
                          <div style={{fontSize:11,color:lvl.color}}>{lvl.emoji} {lvl.label}</div>
                        </div>
                        {(n.tags||[]).map(t=>(
                          <span key={t} style={{fontSize:10,padding:'2px 6px',borderRadius:99,background:dm?'#334155':'#e2e8f0',color:dm?'#94a3b8':'#64748b'}}>{t}</span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              {q.length > 0 && results.length === 0 && (
                <div style={{padding:'20px 16px',textAlign:'center',color:dm?'#475569':'#94a3b8',fontSize:13}}>No results for "{searchQuery}"</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Partner Flower Customiser ─────────────────────────────────────────── */}
      {partnerFlowerEditor && (() => {
        const pn = nodes.find(n=>n.id===partnerFlowerEditor);
        if (!pn) return null;
        const DEFAULT_PF = {petals:6,subPetals:6,petalColor:'#f43f5e',subPetalColor:'#fda4af',petalBorderColor:'#9f1239',subPetalBorderColor:'#fecdd3',borderColor:'#9f1239',pattern:'solid',petalLength:0.55,subPetalLength:0.47};
        const pf = {...DEFAULT_PF,...(pn.partnerFlower||{})};
        const dm = theme.darkMode;
        const bg = dm?'#0f172a':'#fafafa';
        const brd = dm?'#334155':'#e2e8f0';
        const sub = dm?'#94a3b8':'#64748b';
        const txt = dm?'#e2e8f0':'#1e293b';

        const update = (key,val) => setNodes(prev=>prev.map(n=>n.id===partnerFlowerEditor?{...n,partnerFlower:{...DEFAULT_PF,...(n.partnerFlower||{}),[key]:val}}:n));

        const COLORS = ['#f43f5e','#ec4899','#a855f7','#8b5cf6','#3b82f6','#06b6d4','#10b981','#84cc16','#f59e0b','#ef4444','#ffffff','#000000'];
        const PATTERNS = [{id:'solid',label:'Solid'},{id:'dots',label:'Dots'},{id:'radial',label:'Radial'}];

        const PRESETS = [
          {name:'Rose',     petals:5,  subPetals:5,  petalLength:0.65, subPetalLength:0.38, petalColor:'#f43f5e', subPetalColor:'#fda4af', borderColor:'#9f1239', pattern:'solid', radialColor2:'#fda4af'},
          {name:'Daisy',    petals:12, subPetals:0,  petalLength:0.85, subPetalLength:0.40, petalColor:'#fefce8', subPetalColor:'#fde047', borderColor:'#a16207', pattern:'solid', radialColor2:'#fde047'},
          {name:'Sunflower',petals:12, subPetals:8,  petalLength:0.95, subPetalLength:0.42, petalColor:'#f59e0b', subPetalColor:'#7c2d12', borderColor:'#78350f', pattern:'dots',  patternColor:'#d97706', radialColor2:'#92400e'},
          {name:'Lotus',    petals:9,  subPetals:9,  petalLength:0.72, subPetalLength:0.52, petalColor:'#ec4899', subPetalColor:'#fda4af', borderColor:'#9d174d', pattern:'radial', radialColor2:'#ffffff'},
          {name:'Cherry',   petals:5,  subPetals:5,  petalLength:0.48, subPetalLength:0.32, petalColor:'#fda4af', subPetalColor:'#fce7f3', borderColor:'#f43f5e', pattern:'solid', radialColor2:'#fce7f3'},
          {name:'Lavender', petals:6,  subPetals:6,  petalLength:0.62, subPetalLength:0.44, petalColor:'#a855f7', subPetalColor:'#d8b4fe', borderColor:'#7e22ce', pattern:'solid', radialColor2:'#e9d5ff'},
          {name:'Tiger Lily',petals:6, subPetals:0,  petalLength:0.80, subPetalLength:0.40, petalColor:'#f97316', subPetalColor:'#fca5a5', borderColor:'#9a3412', pattern:'dots', patternColor:'#1e293b', radialColor2:'#fbbf24'},
          {name:'Iris',     petals:6,  subPetals:6,  petalLength:0.78, subPetalLength:0.52, petalColor:'#6366f1', subPetalColor:'#818cf8', borderColor:'#3730a3', pattern:'radial', radialColor2:'#c7d2fe'},
          {name:'Poppy',    petals:4,  subPetals:0,  petalLength:0.88, subPetalLength:0.40, petalColor:'#ef4444', subPetalColor:'#fca5a5', borderColor:'#7f1d1d', pattern:'radial', radialColor2:'#fee2e2'},
          {name:'Magnolia', petals:8,  subPetals:4,  petalLength:0.70, subPetalLength:0.38, petalColor:'#f5f0ff', subPetalColor:'#e9d5ff', borderColor:'#a855f7', pattern:'solid', radialColor2:'#ddd6fe'},
        ];

        const isLight = hex => { if(!hex||hex.length<7)return true; const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return (r*299+g*587+b*114)/1000>128; };

        // Build SVG petal path
        const buildPath = (count, len, radius) => {
          const pr = radius*(1+len), pw = pr*0.65;
          return Array.from({length:count},(_,pi)=>{
            const pa=(pi/count)*Math.PI*2,L=pr,W=pw,tx=Math.cos(pa)*L,ty=Math.sin(pa)*L,perpA=pa+Math.PI*0.5;
            const c1x=Math.cos(pa)*L*0.35+Math.cos(perpA)*W*0.6,c1y=Math.sin(pa)*L*0.35+Math.sin(perpA)*W*0.6;
            const c2x=Math.cos(pa)*L*0.85+Math.cos(perpA)*W*0.5,c2y=Math.sin(pa)*L*0.85+Math.sin(perpA)*W*0.5;
            const c3x=Math.cos(pa)*L*0.85-Math.cos(perpA)*W*0.5,c3y=Math.sin(pa)*L*0.85-Math.sin(perpA)*W*0.5;
            const c4x=Math.cos(pa)*L*0.35-Math.cos(perpA)*W*0.6,c4y=Math.sin(pa)*L*0.35-Math.sin(perpA)*W*0.6;
            return `M 0,0 C ${c1x},${c1y} ${c2x},${c2y} ${tx},${ty} C ${c3x},${c3y} ${c4x},${c4y} 0,0`;
          }).join(' ');
        };

        // selectedPart: 'main' | 'sub' | 'centre' | null
        const selectedPart = pfSelectedPart;
        const setSelectedPart = setPfSelectedPart;
        const colorPickerFor = pfColorPickerFor;
        const setColorPickerFor = setPfColorPickerFor;
        const tab = pfTab;
        const setTab = setPfTab;

        const PREVIEW_R = 38;
        const mainPath = buildPath(pf.petals, pf.petalLength, PREVIEW_R);
        const subPath = pf.subPetals>0 ? buildPath(pf.subPetals, pf.subPetalLength, PREVIEW_R) : null;

        const patId = 'pfp';
        const mainFill = pf.pattern==='radial'?`url(#${patId}-radial)`:pf.petalColor;

        // Part option rows
        const partOptions = {
          main: [
            {label:'Fill colour', key:'petalColor'},
            {label:'Border colour', key:'petalBorderColor', toggleKey:'petalBorder'},
            {label:'Pattern colour', key:'patternColor', show: pf.pattern!=='solid'&&pf.pattern!=='radial'},
          ].filter(o=>o.show!==false),
          sub: [
            {label:'Fill colour', key:'subPetalColor'},
            {label:'Border colour', key:'subPetalBorderColor', toggleKey:'subPetalBorder'},
          ],
          centre: [
            {label:'Border colour', key:'borderColor'},
          ],
        };

        const ColorPicker = ({forKey}) => (
          <div style={{position:'absolute',bottom:'100%',right:0,zIndex:10,background:dm?'#1e293b':'white',borderRadius:12,padding:10,boxShadow:'0 8px 32px rgba(0,0,0,0.35)',border:'1px solid '+brd,display:'flex',flexWrap:'wrap',gap:5,width:180}}>
            {COLORS.map(c=>{
              const sel = pf[forKey]===c;
              const isBlack = c==='#000000';
              return <button key={c} onClick={()=>{update(forKey,c);setColorPickerFor(null);}}
                style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',
                  border:'2.5px solid '+(isBlack?'#6b7280':sel?(isLight(c)?'#1e293b':'white'):'transparent'),
                  boxShadow:sel?'0 0 0 2px '+(isLight(c)?'#1e293b':'white'):'none',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                {sel&&<span style={{fontSize:11,color:isLight(c)?'#1e293b':'white'}}>✓</span>}
              </button>;
            })}
          </div>
        );

        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:600,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}
            onClick={e=>{if(e.target===e.currentTarget){setPartnerFlowerEditor(null);setColorPickerFor(null);}}}>
            <div onClick={e=>e.stopPropagation()} style={{background:bg,borderRadius:'24px 24px 0 0',width:'100%',maxWidth:520,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 -8px 48px rgba(0,0,0,0.4)'}}>

              {/* Header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px 8px',flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:800,color:txt}}>🌸 {pn.label}&apos;s Flower</span>
                <button onClick={()=>setPartnerFlowerEditor(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:sub}}>✕</button>
              </div>

              {/* Tabs */}
              <div style={{display:'flex',gap:4,padding:'0 20px 8px',flexShrink:0}}>
                {[{id:'design',label:'✏️ Design'},{id:'presets',label:'🌺 Presets'}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    style={{padding:'7px 18px',borderRadius:99,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',
                      background:tab===t.id?pf.petalColor:(dm?'#1e293b':'#f1f5f9'),
                      color:tab===t.id?'white':sub}}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{overflowY:'auto',flex:1,padding:'0 20px 40px'}}>

                {tab==='presets' ? (
                  /* ── Presets grid ── */
                  <div style={{paddingTop:4}}>

                    {/* Edit mode toggle + save current */}
                    <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
                      <button onClick={()=>setPfEditingPresetIdx(pfEditingPresetIdx!=null?null:-1)}
                        style={{padding:'7px 14px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
                          background:pfEditingPresetIdx!=null?pf.petalColor:(dm?'#334155':'#e2e8f0'),
                          color:pfEditingPresetIdx!=null?'white':(dm?'#94a3b8':'#64748b')}}>
                        ✏️ {pfEditingPresetIdx!=null?'Done editing':'Edit presets'}
                      </button>
                      <button onClick={()=>{
                        const name = prompt('Name this preset:');
                        if (!name?.trim()) return;
                        const updated = [...customPresets, {...pf, name:name.trim()}];
                        setCustomPresets(updated);
                        localStorage.setItem('ft_flower_presets', JSON.stringify(updated));
                        showToast('🌸 Saved: '+name.trim());
                      }} style={{flex:1,padding:'7px 8px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',background:dm?'#1e293b':'#f1f5f9',color:sub}}>
                        + Save current
                      </button>
                    </div>

                    {pfEditingPresetIdx!=null&&(
                      <div style={{padding:'8px 10px',borderRadius:10,background:pf.petalColor+'22',border:'1px solid '+pf.petalColor+'66',marginBottom:10,fontSize:12,color:txt}}>
                        Tap a preset to select it, then go to Design tab to adjust it. Come back here to save changes over it.
                      </div>
                    )}

                    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                      {[...PRESETS, ...customPresets].map((preset, pi)=>{
                        const isCustom = pi >= PRESETS.length;
                        const isSelected = pfEditingPresetIdx === pi;
                        const pR=28;
                        const pMain=buildPath(preset.petals,preset.petalLength,pR);
                        const pSub=(preset.subPetals||0)>0?buildPath(preset.subPetals,preset.subPetalLength||0.47,pR):null;
                        return (
                          <div key={preset.name+pi} style={{position:'relative',display:'flex',flexDirection:'column',gap:4}}>
                            <button onClick={()=>{
                              if (pfEditingPresetIdx!=null) {
                                // In edit mode: select this preset
                                setPfEditingPresetIdx(isSelected?-1:pi);
                              } else {
                                // Normal mode: apply preset
                                setNodes(prev=>prev.map(n=>n.id===partnerFlowerEditor?{...n,partnerFlower:{...DEFAULT_PF,...preset}}:n));
                                setTab('design');
                              }
                            }} style={{background:dm?'#1e293b':'white',border:'2px solid '+(isSelected?pf.petalColor:brd),borderRadius:14,padding:'10px 6px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'border-color 0.15s'}}>
                              <svg width={66} height={66} viewBox="-50 -50 100 100">
                                <defs>
                                  <radialGradient id={`pre-${pi}-rg`} cx="0" cy="0" r={pR} gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor={preset.radialColor2||'#ffffff'}/>
                                    <stop offset="100%" stopColor={preset.petalColor}/>
                                  </radialGradient>
                                  <pattern id={`pre-${pi}-d`} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill={preset.patternColor||preset.subPetalColor||'#fff'}/></pattern>
                                </defs>
                                {pSub&&<g transform={`rotate(${360/(preset.subPetals||6)/2})`} opacity={0.5}><path d={pSub} fill={preset.subPetalColor}/></g>}
                                <path d={pMain} fill={preset.pattern==='radial'?`url(#pre-${pi}-rg)`:preset.petalColor} opacity={0.9}/>
                                {preset.pattern==='dots'&&<path d={pMain} fill={`url(#pre-${pi}-d)`} opacity={0.5}/>}
                                <circle r={pR*0.52} fill={dm?'#0f172a':'#fafafa'} stroke={preset.borderColor&&preset.borderColor!=='transparent'?preset.borderColor:'none'} strokeWidth="2"/>
                              </svg>
                              <span style={{fontSize:11,fontWeight:700,color:txt}}>{preset.name}</span>
                              {isCustom&&<span style={{fontSize:9,color:sub,marginTop:-2}}>custom</span>}
                            </button>

                            {/* Edit actions when selected in edit mode */}
                            {pfEditingPresetIdx===pi&&(
                              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                                <button onClick={()=>{
                                  // Load this preset into flower then switch to design
                                  setNodes(prev=>prev.map(n=>n.id===partnerFlowerEditor?{...n,partnerFlower:{...DEFAULT_PF,...preset}}:n));
                                  setTab('design');
                                  showToast('Adjust in Design tab, then come back to save');
                                }} style={{padding:'5px',borderRadius:8,background:'#3b82f6',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>
                                  ↗ Load to edit
                                </button>
                                <button onClick={()=>{
                                  if (isCustom) {
                                    const idx = pi - PRESETS.length;
                                    const updated = [...customPresets];
                                    updated[idx] = {...pf, name:preset.name};
                                    setCustomPresets(updated);
                                    localStorage.setItem('ft_flower_presets', JSON.stringify(updated));
                                    showToast('✅ '+preset.name+' updated');
                                  } else {
                                    // Save as new custom with same name
                                    const updated = [...customPresets, {...pf, name:preset.name+' (edited)'}];
                                    setCustomPresets(updated);
                                    localStorage.setItem('ft_flower_presets', JSON.stringify(updated));
                                    showToast('✅ Saved as custom: '+preset.name);
                                  }
                                  setPfEditingPresetIdx(-1);
                                }} style={{padding:'5px',borderRadius:8,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>
                                  ↩ Save current here
                                </button>
                                {isCustom&&<button onClick={()=>{
                                  const idx = pi - PRESETS.length;
                                  const updated = customPresets.filter((_,i)=>i!==idx);
                                  setCustomPresets(updated);
                                  localStorage.setItem('ft_flower_presets', JSON.stringify(updated));
                                  setPfEditingPresetIdx(-1);
                                  showToast('🗑️ Deleted');
                                }} style={{padding:'5px',borderRadius:8,background:'#ef4444',color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>
                                  🗑 Delete
                                </button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                ) : (
                  /* ── Design tab ── */
                  <>
                    {/* Top row: flower left + options right */}
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',margin:'8px 0 12px'}}>

                      {/* Flower preview — left, fixed size */}
                      <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                        <svg width={160} height={160} viewBox="-90 -90 180 180" style={{overflow:'visible'}}>
                          <defs>
                            <pattern id={`${patId}-tiger`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                              <rect width="6" height="12" fill={pf.patternColor||'#1e293b'} opacity="0.7"/>
                              <rect x="6" width="6" height="12" fill="transparent"/>
                            </pattern>
                            <pattern id={`${patId}-dots`} width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill={pf.patternColor||pf.subPetalColor}/></pattern>
                            <radialGradient id={`${patId}-radial`} cx="0" cy="0" r={PREVIEW_R} gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor={pf.radialColor2||'#ffffff'}/>
                              <stop offset="100%" stopColor={pf.petalColor}/>
                            </radialGradient>
                          </defs>

                          {subPath&&(
                            <g transform={`rotate(${360/(pf.subPetals||6)/2})`} opacity={selectedPart==='sub'?1:0.55}
                              style={{cursor:'pointer'}} onClick={()=>setSelectedPart(selectedPart==='sub'?null:'sub')}>
                              <path d={subPath} fill={pf.subPetalColor}
                                stroke={selectedPart==='sub'?'white':(pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?pf.subPetalBorderColor:'none')}
                                strokeWidth={selectedPart==='sub'?2.5:(pf.subPetalBorderColor&&pf.subPetalBorderColor!=='transparent'?1:0)}
                                strokeDasharray={selectedPart==='sub'?'4 2':'none'}/>
                            </g>
                          )}

                          <g opacity={selectedPart==='main'?1:0.88}
                            style={{cursor:'pointer'}} onClick={()=>setSelectedPart(selectedPart==='main'?null:'main')}>
                            <path d={mainPath} fill={mainFill}
                              stroke={selectedPart==='main'?'white':(pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?pf.petalBorderColor:'none')}
                              strokeWidth={selectedPart==='main'?2.5:(pf.petalBorderColor&&pf.petalBorderColor!=='transparent'?1:0)}
                              strokeDasharray={selectedPart==='main'?'4 2':'none'}/>
                            {pf.pattern&&pf.pattern!=='solid'&&pf.pattern!=='radial'&&(
                              <path d={mainPath} fill={`url(#${patId}-${pf.pattern})`} opacity={0.4}/>
                            )}
                          </g>

                          <g style={{cursor:'pointer'}} onClick={()=>setSelectedPart(selectedPart==='centre'?null:'centre')}>
                            <circle r={PREVIEW_R*0.52} fill={dm?'#1e293b':'white'}
                              stroke={selectedPart==='centre'?'white':(pf.borderColor&&pf.borderColor!=='transparent'?pf.borderColor:'none')}
                              strokeWidth={selectedPart==='centre'?3:2}
                              strokeDasharray={selectedPart==='centre'?'4 2':'none'}/>
                            <text textAnchor="middle" dominantBaseline="middle" fontSize="20">{partnerFlowerEditor==='me'?'🌸':'💗'}</text>
                          </g>

                          {selectedPart&&<circle r={PREVIEW_R*1.85} fill="none" stroke={pf.petalColor} strokeWidth="1" opacity="0.15"/>}
                        </svg>
                        <span style={{fontSize:10,color:sub,textAlign:'center'}}>Tap to select</span>
                      </div>

                      {/* Options panel — right, scrollable */}
                      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:8}}>

                        {/* Part selector buttons */}
                        <div style={{display:'flex',gap:4}}>
                          {[
                            {id:'main',label:'Petals'},
                            ...(subPath?[{id:'sub',label:'Sub'}]:[]),
                            {id:'centre',label:'Centre'},
                          ].map(p=>(
                            <button key={p.id} onClick={()=>setSelectedPart(selectedPart===p.id?null:p.id)}
                              style={{flex:1,padding:'5px 4px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',border:'1.5px solid '+(selectedPart===p.id?pf.petalColor:brd),background:selectedPart===p.id?pf.petalColor:'transparent',color:selectedPart===p.id?'white':sub}}>
                              {p.label}
                            </button>
                          ))}
                        </div>

                        {/* Options for selected part */}
                        {selectedPart ? (
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {/* Fill colour */}
                            {selectedPart!=='centre'&&(
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:dm?'#1e293b':'#f8fafc',borderRadius:10}}>
                                <span style={{fontSize:12,fontWeight:600,color:txt}}>Fill</span>
                                <div style={{position:'relative'}}>
                                  <button onClick={()=>setColorPickerFor(colorPickerFor===(selectedPart==='main'?'petalColor':'subPetalColor')?null:(selectedPart==='main'?'petalColor':'subPetalColor'))}
                                    style={{width:26,height:26,borderRadius:'50%',background:selectedPart==='main'?pf.petalColor:pf.subPetalColor,border:'2px solid rgba(128,128,128,0.3)',cursor:'pointer'}}>
                                  </button>
                                  {colorPickerFor===(selectedPart==='main'?'petalColor':'subPetalColor')&&<ColorPicker forKey={selectedPart==='main'?'petalColor':'subPetalColor'}/>}
                                </div>
                              </div>
                            )}
                            {/* Border colour — always on, transparent = no border */}
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:dm?'#1e293b':'#f8fafc',borderRadius:10}}>
                              <span style={{fontSize:12,fontWeight:600,color:txt}}>Border</span>
                              <div style={{position:'relative'}}>
                                {(() => {
                                  const bKey = selectedPart==='main'?'petalBorderColor':selectedPart==='sub'?'subPetalBorderColor':'borderColor';
                                  const bVal = pf[bKey]||'transparent';
                                  return <>
                                    <button onClick={()=>setColorPickerFor(colorPickerFor===bKey?null:bKey)}
                                      style={{width:26,height:26,borderRadius:'50%',
                                        background:bVal==='transparent'?'none':bVal,
                                        border:'2px solid '+(bVal==='transparent'?brd:'rgba(128,128,128,0.3)'),
                                        cursor:'pointer',
                                        backgroundImage:bVal==='transparent'?'repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,white 0,white 50%)':undefined,
                                        backgroundSize:bVal==='transparent'?'6px 6px':undefined}}>
                                    </button>
                                    {colorPickerFor===bKey&&(
                                      <div style={{position:'absolute',bottom:'100%',right:0,zIndex:10,background:dm?'#1e293b':'white',borderRadius:12,padding:10,boxShadow:'0 8px 32px rgba(0,0,0,0.35)',border:'1px solid '+brd,display:'flex',flexWrap:'wrap',gap:5,width:185}}>
                                        {/* Transparent option */}
                                        <button onClick={()=>{update(bKey,'transparent');setColorPickerFor(null);}}
                                          style={{width:26,height:26,borderRadius:'50%',background:'none',border:'2px solid '+(bVal==='transparent'?'#3b82f6':brd),cursor:'pointer',backgroundImage:'repeating-linear-gradient(45deg,#ccc 0,#ccc 2px,white 0,white 50%)',backgroundSize:'6px 6px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                          {bVal==='transparent'&&<span style={{fontSize:10}}>✓</span>}
                                        </button>
                                        {COLORS.map(c=>{
                                          const sel=pf[bKey]===c;
                                          const isBlack=c==='#000000';
                                          return <button key={c} onClick={()=>{update(bKey,c);setColorPickerFor(null);}}
                                            style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',
                                              border:'2.5px solid '+(isBlack?'#6b7280':sel?(isLight(c)?'#1e293b':'white'):'transparent'),
                                              display:'flex',alignItems:'center',justifyContent:'center'}}>
                                            {sel&&<span style={{fontSize:10,color:isLight(c)?'#1e293b':'white'}}>✓</span>}
                                          </button>;
                                        })}
                                      </div>
                                    )}
                                  </>;
                                })()}
                              </div>
                            </div>
                            {/* Radial centre colour */}
                            {selectedPart==='main'&&pf.pattern==='radial'&&(
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:dm?'#1e293b':'#f8fafc',borderRadius:10}}>
                                <span style={{fontSize:12,fontWeight:600,color:txt}}>Centre colour</span>
                                <div style={{position:'relative'}}>
                                  <button onClick={()=>setColorPickerFor(colorPickerFor==='radialColor2'?null:'radialColor2')}
                                    style={{width:26,height:26,borderRadius:'50%',background:pf.radialColor2||'#ffffff',border:'2px solid rgba(128,128,128,0.3)',cursor:'pointer'}}/>
                                  {colorPickerFor==='radialColor2'&&<ColorPicker forKey="radialColor2"/>}
                                </div>
                              </div>
                            )}
                            {/* Pattern colour for tiger/dots */}
                            {selectedPart==='main'&&pf.pattern==='dots'&&(
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',background:dm?'#1e293b':'#f8fafc',borderRadius:10}}>
                                <span style={{fontSize:12,fontWeight:600,color:txt}}>Pattern colour</span>
                                <div style={{position:'relative'}}>
                                  <button onClick={()=>setColorPickerFor(colorPickerFor==='patternColor'?null:'patternColor')}
                                    style={{width:26,height:26,borderRadius:'50%',background:pf.patternColor||pf.subPetalColor,border:'2px solid rgba(128,128,128,0.3)',cursor:'pointer'}}/>
                                  {colorPickerFor==='patternColor'&&<ColorPicker forKey="patternColor"/>}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{padding:'12px 8px',textAlign:'center',color:sub,fontSize:12,fontStyle:'italic'}}>
                            Tap a section above or in the flower
                          </div>
                        )}

                        {/* Pattern */}
                        <div style={{background:dm?'#1e293b':'#f8fafc',borderRadius:10,padding:'8px'}}>
                          <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:0.8,color:sub,marginBottom:6}}>Pattern</div>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {PATTERNS.map(p=>(
                              <button key={p.id} onClick={()=>update('pattern',p.id)}
                                style={{padding:'4px 8px',borderRadius:99,fontSize:10,fontWeight:700,cursor:'pointer',border:'1.5px solid '+((pf.pattern||'solid')===p.id?pf.petalColor:brd),background:(pf.pattern||'solid')===p.id?pf.petalColor:'transparent',color:(pf.pattern||'solid')===p.id?'white':sub}}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shape controls below — full width */}
                    <div style={{background:dm?'#1e293b':'#f8fafc',borderRadius:14,padding:12,marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:sub,marginBottom:8}}>Shape</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:txt,minWidth:80}}>Main petals</span>
                        <input type="number" min="1" max="24"
                          value={pf.petals||6}
                          onChange={e=>{const v=parseInt(e.target.value);if(v>=1&&v<=24)update('petals',v);}}
                          style={{width:60,padding:'5px 8px',borderRadius:8,border:'1.5px solid '+brd,background:dm?'#0f172a':'white',color:txt,fontSize:14,fontWeight:700,textAlign:'center',outline:'none'}}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:txt,minWidth:80}}>Sub-petals</span>
                        <input type="number" min="0" max="24"
                          value={pf.subPetals??6}
                          onChange={e=>{const v=parseInt(e.target.value);if(v>=0&&v<=24)update('subPetals',v);}}
                          style={{width:60,padding:'5px 8px',borderRadius:8,border:'1.5px solid '+brd,background:dm?'#0f172a':'white',color:txt,fontSize:14,fontWeight:700,textAlign:'center',outline:'none'}}/>
                        <span style={{fontSize:11,color:sub}}>(0 = off)</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:600,color:txt,minWidth:80}}>Petal length</span>
                        <input type="range" min="20" max="120" step="5" value={Math.round((pf.petalLength??0.55)*100)} onChange={e=>update('petalLength',parseInt(e.target.value)/100)} style={{flex:1,accentColor:pf.petalColor}}/>
                        <span style={{fontSize:11,color:sub,minWidth:32,textAlign:'right'}}>{Math.round((pf.petalLength??0.55)*100)}%</span>
                      </div>
                      {(pf.subPetals??6)>0&&(
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:12,fontWeight:600,color:txt,minWidth:80}}>Sub length</span>
                          <input type="range" min="15" max="100" step="5" value={Math.round((pf.subPetalLength??0.47)*100)} onChange={e=>update('subPetalLength',parseInt(e.target.value)/100)} style={{flex:1,accentColor:pf.subPetalColor}}/>
                          <span style={{fontSize:11,color:sub,minWidth:32,textAlign:'right'}}>{Math.round((pf.subPetalLength??0.47)*100)}%</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {photoCrop && (() => {
        const dm = theme.darkMode;
        const SIZE = 800; // output size px - full quality

        const applyCrop = () => {
          const img = cropImgRef.current;
          if (!img) return;
          const canvas = document.createElement('canvas');
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext('2d');

          // Circle clip
          ctx.beginPath();
          ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2);
          ctx.clip();

          const { x, y, scale } = photoCrop.crop;

          // The preview div is square (containerW = containerH = container size)
          // The image is displayed with objectFit:'contain' scaled to fit that square
          // We need to map from screen-space drag offsets back to image-space coordinates

          const iw = img.naturalWidth;
          const ih = img.naturalHeight;

          // Size of the preview container in CSS pixels (from the rendered element)
          const previewEl = cropImgRef.current?.parentElement;
          const containerW = previewEl ? previewEl.offsetWidth : 300;
          const containerH = previewEl ? previewEl.offsetHeight : 300;

          // How the image fits in the container with objectFit:contain
          const imgAspect = iw / ih;
          const containerAspect = containerW / containerH;
          let renderedW, renderedH;
          if (imgAspect > containerAspect) {
            renderedW = containerW;
            renderedH = containerW / imgAspect;
          } else {
            renderedH = containerH;
            renderedW = containerH * imgAspect;
          }

          // Scale factor from CSS pixels to image pixels
          const cssToImg = iw / renderedW;

          // The visible region in image-space:
          // Center of image + user drag offset (converted to image pixels) / scale
          const imgCenterX = iw / 2 - (x * cssToImg) / scale;
          const imgCenterY = ih / 2 - (y * cssToImg) / scale;

          // Half-size of the square region to crop from the image
          const halfSize = (Math.min(renderedW, renderedH) * cssToImg) / (2 * scale);

          const sx = imgCenterX - halfSize;
          const sy = imgCenterY - halfSize;
          const sSize = halfSize * 2;

          ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, SIZE, SIZE);

          const base64 = canvas.toDataURL('image/png');
          // Store original src for future re-crops
          const origSrc = photoCrop.originalSrc || photoCrop.src;
          savePhotoToDB(photoCrop.nodeId, base64);
          // Also save original under a separate key for re-crop
          savePhotoToDB(photoCrop.nodeId + '_orig', origSrc);
          setNodes(prev => prev.map(n => {
            if (n.id !== photoCrop.nodeId) return n;
            // Add to photos array (carousel), set as active
            const existingPhotos = n.photos || [];
            const newPhotos = existingPhotos.find(p => p.orig === origSrc)
              ? existingPhotos.map(p => p.orig === origSrc ? { ...p, cropped: base64 } : p)
              : [...existingPhotos, { orig: origSrc, cropped: base64 }];
            return { ...n, img: base64, photos: newPhotos, activePhotoIdx: newPhotos.length - 1 };
          }));
          setPhotoCrop(null);
        };

        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:600,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}
            onClick={e=>{if(e.target===e.currentTarget)setPhotoCrop(null)}}>
            <div style={{background:dm?'#0f172a':'white',borderRadius:20,overflow:'hidden',width:'min(90vw,380px)',boxShadow:'0 25px 60px rgba(0,0,0,0.6)'}}>
              {/* Header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',borderBottom:`1px solid ${dm?'#334155':'#e2e8f0'}`}}>
                <span style={{fontWeight:800,fontSize:15,color:dm?'#e2e8f0':'#1e293b'}}>📷 Crop Photo</span>
                <button onClick={()=>setPhotoCrop(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:dm?'#94a3b8':'#64748b'}}>✕</button>
              </div>

              {/* Crop area */}
              <div style={{position:'relative',width:'100%',paddingBottom:'100%',background:'#111',overflow:'hidden',cursor:'move'}}
                onPointerDown={e=>{
                  cropDragRef.current = {startX:e.clientX, startY:e.clientY, ox:photoCrop.crop.x, oy:photoCrop.crop.y};
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={e=>{
                  if(!cropDragRef.current) return;
                  const dx = e.clientX - cropDragRef.current.startX;
                  const dy = e.clientY - cropDragRef.current.startY;
                  setPhotoCrop(p=>({...p, crop:{...p.crop, x:cropDragRef.current.ox+dx, y:cropDragRef.current.oy+dy}}));
                }}
                onPointerUp={()=>{cropDragRef.current=null;}}
                onWheel={e=>{
                  e.preventDefault();
                  setPhotoCrop(p=>({...p, crop:{...p.crop, scale:Math.max(0.5,Math.min(4,p.crop.scale*(e.deltaY>0?0.9:1.1)))}}));
                }}>
                <img ref={cropImgRef} src={photoCrop.src} alt="crop"
                  style={{
                    position:'absolute',
                    top:'50%', left:'50%',
                    transform:`translate(calc(-50% + ${photoCrop.crop.x}px), calc(-50% + ${photoCrop.crop.y}px)) scale(${photoCrop.crop.scale})`,
                    maxWidth:'none', maxHeight:'none',
                    width:'100%', height:'100%',
                    objectFit:'contain',
                    pointerEvents:'none',
                    userSelect:'none',
                  }} />
                {/* Circle overlay */}
                <svg style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 100 100" preserveAspectRatio="none">
                  <mask id="circle-mask">
                    <rect width="100" height="100" fill="white"/>
                    <circle cx="50" cy="50" r="50" fill="black"/>
                  </mask>
                  <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#circle-mask)"/>
                  <circle cx="50" cy="50" r="49.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6"/>
                </svg>
              </div>

              {/* Controls */}
              <div style={{padding:16}}>
                {/* Zoom slider */}
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                  <span style={{fontSize:12,color:dm?'#94a3b8':'#64748b'}}>🔍</span>
                  <input type="range" min="0.5" max="4" step="0.05"
                    value={photoCrop.crop.scale}
                    onChange={e=>setPhotoCrop(p=>({...p,crop:{...p.crop,scale:parseFloat(e.target.value)}}))}
                    style={{flex:1,accentColor:'#10b981'}} />
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={applyCrop}
                    style={{flex:1,padding:'11px',borderRadius:10,background:'#10b981',color:'white',border:'none',cursor:'pointer',fontWeight:800,fontSize:14}}>
                    ✓ Save Photo
                  </button>
                  <button onClick={()=>setPhotoCrop(null)}
                    style={{padding:'11px 16px',borderRadius:10,background:dm?'#334155':'#e2e8f0',color:dm?'#e2e8f0':'#334155',border:'none',cursor:'pointer',fontWeight:600}}>
                    Cancel
                  </button>
                </div>
                <p style={{fontSize:10,color:dm?'#475569':'#94a3b8',textAlign:'center',marginTop:8}}>Drag to reposition · Scroll or slide to zoom</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Avatar Builder Modal ─────────────────────────────────────────────── */}
      {avatarBuilder && (() => {
        const targetNode = nodes.find(n => n.id === avatarBuilder.nodeId);
        if (!targetNode) return null;
        const dm = theme.darkMode;

        const SKIN_TONES = ['#fde8d8','#f5cba7','#d4956a','#c68642','#8d5524','#4a2912'];
        const HAIR_COLORS = ['#2d1b00','#8B4513','#d4a017','#f5cba7','#e03030','#9333ea','#1d4ed8','#1a1a1a','#6b7280','#ffffff'];
        const BG_COLORS = [
          '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899', // rainbow
          '#1e293b','#0f172a','#ffffff','#f5f5f0', // neutrals
        ];

        const HAIR_STYLES = [
          { id: 'buzz',    label: 'Buzz',      path: '<ellipse cx="50" cy="36" rx="26" ry="12" fill="${h}"/>'},
          { id: 'short',   label: 'Short',     path: '<ellipse cx="50" cy="34" rx="26" ry="14" fill="${h}"/><rect x="24" y="34" width="52" height="10" fill="${h}"/>'},
          { id: 'sidePart',label: 'Side Part', path: '<ellipse cx="50" cy="34" rx="26" ry="14" fill="${h}"/><rect x="24" y="34" width="52" height="8" fill="${h}"/><ellipse cx="28" cy="42" rx="7" ry="10" fill="${h}"/>'},
          { id: 'quiff',   label: 'Quiff',     path: '<ellipse cx="50" cy="35" rx="26" ry="13" fill="${h}"/><path d="M34 35 Q50 16 66 35" fill="${h}"/>'},
          { id: 'caesar',  label: 'Caesar',    path: '<ellipse cx="50" cy="35" rx="26" ry="13" fill="${h}"/><path d="M24 38 Q50 28 76 38" fill="${h}"/>'},
          { id: 'curly',   label: 'Curly',     path: '<ellipse cx="50" cy="31" rx="28" ry="17" fill="${h}"/><ellipse cx="28" cy="42" rx="10" ry="12" fill="${h}"/><ellipse cx="72" cy="42" rx="10" ry="12" fill="${h}"/>'},
          { id: 'afro',    label: 'Afro',      path: '<ellipse cx="50" cy="28" rx="30" ry="22" fill="${h}"/><ellipse cx="50" cy="40" rx="24" ry="12" fill="${h}"/>'},
          { id: 'bob',     label: 'Bob',       path: '<ellipse cx="50" cy="34" rx="26" ry="14" fill="${h}"/><rect x="24" y="34" width="52" height="24" rx="4" fill="${h}"/>'},
          { id: 'lob',     label: 'Lob',       path: '<ellipse cx="50" cy="33" rx="26" ry="14" fill="${h}"/><rect x="24" y="33" width="10" height="36" fill="${h}"/><rect x="66" y="33" width="10" height="36" fill="${h}"/><ellipse cx="50" cy="33" rx="26" ry="14" fill="${h}"/>'},
          { id: 'long',    label: 'Long',      path: '<ellipse cx="50" cy="33" rx="26" ry="14" fill="${h}"/><rect x="22" y="33" width="10" height="52" fill="${h}"/><rect x="68" y="33" width="10" height="52" fill="${h}"/><ellipse cx="50" cy="33" rx="26" ry="14" fill="${h}"/>'},
          { id: 'wavy',    label: 'Wavy',      path: '<ellipse cx="50" cy="33" rx="26" ry="14" fill="${h}"/><path d="M24 40 Q20 56 26 72 Q22 82 28 90" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M76 40 Q80 56 74 72 Q78 82 72 90" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>'},
          { id: 'ponytail',label: 'Ponytail',  path: '<ellipse cx="50" cy="33" rx="25" ry="13" fill="${h}"/><rect x="25" y="33" width="50" height="8" fill="${h}"/><ellipse cx="75" cy="30" rx="5" ry="8" fill="${h}"/><path d="M75 38 Q84 54 78 72" stroke="${h}" stroke-width="5" fill="none" stroke-linecap="round"/>'},
          { id: 'bun',     label: 'Bun',       path: '<ellipse cx="50" cy="35" rx="25" ry="13" fill="${h}"/><ellipse cx="50" cy="21" rx="10" ry="10" fill="${h}"/><rect x="46" y="21" width="8" height="15" fill="${h}"/>'},
          { id: 'bald',    label: 'Bald',      path: ''},
        ];
        const FACES = [
          { id: 'smile',   label: '😊', mouth: '<path d="M44 70 Q50 76 56 70" stroke="#b06060" stroke-width="2.5" fill="none" stroke-linecap="round"/>' },
          { id: 'grin',    label: '😁', mouth: '<path d="M43 69 Q50 77 57 69" stroke="#b06060" stroke-width="2" fill="none"/><rect x="44" y="70" width="12" height="5" rx="2" fill="white" stroke="#b06060" stroke-width="1"/>' },
          { id: 'laugh',   label: '😄', mouth: '<ellipse cx="50" cy="73" rx="8" ry="5" fill="#c0504a"/><path d="M42 68 Q50 78 58 68" stroke="#b06060" stroke-width="2" fill="none"/>' },
          { id: 'neutral', label: '😐', mouth: '<path d="M44 71 L56 71" stroke="#b06060" stroke-width="2.5" stroke-linecap="round"/>' },
          { id: 'sad',     label: '😢', mouth: '<path d="M44 74 Q50 68 56 74" stroke="#b06060" stroke-width="2.5" fill="none" stroke-linecap="round"/>' },
          { id: 'cool',    label: '😎', mouth: '<path d="M44 71 Q50 77 56 71" stroke="#b06060" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="38" y="48" width="10" height="6" rx="3" fill="#1a1a2e" opacity="0.85"/><rect x="52" y="48" width="10" height="6" rx="3" fill="#1a1a2e" opacity="0.85"/><path d="M48 51 L52 51" stroke="#1a1a2e" stroke-width="1.5"/>' },
          { id: 'wink',    label: '😉', mouth: '<path d="M44 71 Q50 77 56 71" stroke="#b06060" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M55 50 Q59 47 62 50" stroke="#1a1a2e" stroke-width="2" fill="none"/><ellipse cx="43" cy="51" rx="3.5" ry="3.5" fill="#1a1a2e"/>' },
          { id: 'surprised', label: '😮', mouth: '<ellipse cx="50" cy="73" rx="5" ry="6" fill="#c0504a"/>' },
        ];

        const bg    = avBg;    const setBg    = setAvBg;
        const skin  = avSkin;  const setSkin  = setAvSkin;
        const hair  = avHair;  const setHair  = setAvHair;
        const style = avStyle; const setStyle = setAvStyle;
        const face  = avFace;  const setFace  = setAvFace;

        const buildImg = (bg2, skin2, hair2, style2, face2) => {
          const hStyle = HAIR_STYLES.find(s => s.id === style2) || HAIR_STYLES[0];
          const fStyle = FACES.find(f => f.id === face2) || FACES[0];
          const hairPath = hStyle.path.replace(/\$\{h\}/g, hair2);
          return makeAvatar(bg2, skin2, hair2, hairPath + fStyle.mouth);
        };

        const preview = buildImg(bg, skin, hair, style, face);
        const swatch = (color, cur, setter, size = 28) => (
          <button key={color} onClick={() => setter(color)}
            style={{width:size,height:size,borderRadius:'50%',background:color,border:`3px solid ${color===cur?'white':'transparent'}`,outline:`2px solid ${color===cur?color:'transparent'}`,cursor:'pointer',flexShrink:0}} />
        );

        const apply = () => {
          const img = buildImg(bg, skin, hair, style, face);
          setNodes(prev => prev.map(n => n.id === avatarBuilder.nodeId
            ? { ...n, img, _avBg: bg, _avSkin: skin, _avHair: hair, _avStyle: style, _avFace: face }
            : n
          ));
          setAvatarBuilder(null);
        };

        const label = (t) => <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:dm?'#94a3b8':'#64748b',marginBottom:5,marginTop:8}}>{t}</p>;

        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:400,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center'}}
            onClick={e => { if(e.target===e.currentTarget) setAvatarBuilder(null); }}>
            <div style={{background:dm?'#0f172a':'white',border:`1px solid ${dm?'#334155':'#e2e8f0'}`,borderRadius:16,width:'min(94vw,380px)',maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 25px 60px rgba(0,0,0,0.5)'}}>
              <div style={{padding:'14px 18px',borderBottom:`1px solid ${dm?'#334155':'#e2e8f0'}`,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>🎨</span>
                <span style={{flex:1,fontWeight:700,fontSize:15,color:dm?'#e2e8f0':'#1e293b'}}>Build Avatar</span>
                <button onClick={()=>setAvatarBuilder(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:dm?'#94a3b8':'#64748b'}}>✕</button>
              </div>
              <div style={{overflowY:'auto',padding:'12px 18px',flex:1}}>
                {/* Preview */}
                <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
                  <img src={preview} style={{width:80,height:80,borderRadius:'50%',border:`3px solid ${dm?'#334155':'#e2e8f0'}`}} alt="preview"/>
                </div>
                {/* Background */}
                {label('Background')}
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{BG_COLORS.map(c => swatch(c,bg,setBg))}</div>
                {/* Skin */}
                {label('Skin Tone')}
                <div style={{display:'flex',gap:6}}>{SKIN_TONES.map(c => swatch(c,skin,setSkin,32))}</div>
                {/* Hair colour */}
                {label('Hair Colour')}
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{HAIR_COLORS.map(c => swatch(c,hair,setHair))}</div>
                {/* Hair style */}
                {label('Hair Style')}
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {HAIR_STYLES.map(s => (
                    <button key={s.id} onClick={()=>setStyle(s.id)}
                      style={{padding:'4px 10px',borderRadius:8,border:`2px solid ${style===s.id?(dm?'#22c55e':'#16a34a'):(dm?'#334155':'#e2e8f0')}`,background:style===s.id?(dm?'#14532d33':'#dcfce7'):'transparent',fontSize:12,fontWeight:600,color:dm?'#e2e8f0':'#334155',cursor:'pointer'}}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {/* Face */}
                {label('Expression')}
                <div style={{display:'flex',gap:8}}>
                  {FACES.map(f => (
                    <button key={f.id} onClick={()=>setFace(f.id)}
                      style={{fontSize:22,padding:'4px 6px',borderRadius:8,border:`2px solid ${face===f.id?(dm?'#22c55e':'#16a34a'):'transparent'}`,background:'transparent',cursor:'pointer'}}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{padding:'12px 18px',borderTop:`1px solid ${dm?'#334155':'#e2e8f0'}`,display:'flex',gap:8}}>
                <button onClick={apply} style={{flex:1,padding:'10px',borderRadius:8,background:'#16a34a',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}>
                  ✓ Apply
                </button>
                <button onClick={()=>setAvatarBuilder(null)} style={{padding:'10px 16px',borderRadius:8,background:dm?'#334155':'#e2e8f0',color:dm?'#e2e8f0':'#334155',border:'none',cursor:'pointer',fontWeight:600}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Flower / Dimension Panel ─────────────────────────────────────────── */}
      {flowerPanel && (() => {
        const dim = dimensions[flowerPanel];
        if (!dim) return null;
        const dm = theme.darkMode;
        const bg      = dm ? '#0f172a' : '#ffffff';
        const border  = dm ? '#334155' : '#e2e8f0';
        const headBg  = dm ? '#1e293b' : '#f8fafc';
        const rowBg   = dm ? '#1e293b' : '#f8fafc';
        const text    = dm ? '#e2e8f0' : '#1e293b';
        const sub     = dm ? '#94a3b8' : '#64748b';
        const acts    = dim.activities || [];

        const updateActivity = (actId, field, value) => {
          setDimensions(prev => ({
            ...prev,
            [flowerPanel]: {
              ...prev[flowerPanel],
              activities: prev[flowerPanel].activities.map(a =>
                a.id === actId ? { ...a, [field]: value } : a
              ),
            },
          }));
        };

        const addActivity = () => {
          const newAct = { id: `act_${Date.now()}`, name: 'New Activity', pts: 2 };
          setDimensions(prev => ({
            ...prev,
            [flowerPanel]: { ...prev[flowerPanel], activities: [...prev[flowerPanel].activities, newAct] },
          }));
        };

        const removeActivity = (actId) => {
          setDimensions(prev => ({
            ...prev,
            [flowerPanel]: {
              ...prev[flowerPanel],
              activities: prev[flowerPanel].activities.filter(a => a.id !== actId),
            },
          }));
        };

        const logActivity = (act) => {
          setDimensions(prev => {
            const d = prev[flowerPanel];
            const newLog = [...(d.log || []), {
              date: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
              category: act.name, note: act.name, pts: act.pts,
            }];
            return {
              ...prev,
              [flowerPanel]: {
                ...d,
                log: newLog,
                weeklyScore: (d.weeklyScore || 0) + act.pts,
                health: Math.min(1, (d.health || 0.5) + 0.05),
              },
            };
          });
          showToast(`${dim.emoji} +${act.pts} pts logged for ${act.name}`);
        };

        // Drag reorder handlers
        const onDragStart = (actId) => setDragActivity({ dimKey: flowerPanel, actId });
        const onDragOver  = (e, overId) => {
          e.preventDefault();
          if (!dragActivity || dragActivity.actId === overId) return;
          setDimensions(prev => {
            const acts = [...prev[flowerPanel].activities];
            const fromIdx = acts.findIndex(a => a.id === dragActivity.actId);
            const toIdx   = acts.findIndex(a => a.id === overId);
            if (fromIdx < 0 || toIdx < 0) return prev;
            const [moved] = acts.splice(fromIdx, 1);
            acts.splice(toIdx, 0, moved);
            return { ...prev, [flowerPanel]: { ...prev[flowerPanel], activities: acts } };
          });
        };
        const onDragEnd = () => setDragActivity(null);

        return (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:310,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}
            onClick={e => { if (e.target===e.currentTarget) setFlowerPanel(null); }}>
            <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,width:'min(94vw,480px)',maxHeight:'86vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 60px rgba(0,0,0,0.5)',overflow:'hidden'}}>

              {/* Header */}
              <div style={{padding:'16px 20px',borderBottom:`1px solid ${border}`,background:headBg,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>{dim.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:17,color:dim.color}}>{dim.label}</div>
                  <div style={{fontSize:11,color:sub}}>
                    {Math.round((dim.health||0)*100)}% health · {dim.weeklyScore||0}/{dim.weeklyTarget} this week
                    {dim.autoCalculated && <span style={{marginLeft:6,opacity:0.6}}>(auto-calculated)</span>}
                  </div>
                </div>
                {/* Health bar */}
                <div style={{width:60,height:6,borderRadius:3,background:dm?'#334155':'#e2e8f0'}}>
                  <div style={{height:'100%',borderRadius:3,background:dim.color,width:`${Math.round((dim.health||0)*100)}%`}} />
                </div>
                <button onClick={()=>setFlowerPanel(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:sub}}>✕</button>
              </div>

              {/* Border mode chooser for this flower */}
              {(() => {
                const flowerNode = nodes.find(n => n.dimKey === flowerPanel);
                return (
                  <div style={{padding:'8px 16px',borderBottom:`1px solid ${border}`,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,fontWeight:700,color:sub}}>Border:</span>
                    {[{k:'none',l:'Off'},{k:'tier',l:'Tier'},{k:'group',l:'Group'},{k:'momentum',l:'Momentum'}].map(m=>(
                      <button key={m.k} onClick={()=>setPhotoBorderMode(m.k)}
                        style={{padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',
                          background:photoBorderMode===m.k?dim.color:(dm?'#1e293b':'#f1f5f9'),
                          color:photoBorderMode===m.k?'white':(dm?'#94a3b8':'#64748b')}}>
                        {m.l}
                      </button>
                    ))}
                    {flowerNode && (
                      <button onClick={()=>setNodes(prev=>prev.map(n=>n.dimKey===flowerPanel?{...n,borderLocked:!n.borderLocked}:n))}
                        style={{marginLeft:'auto',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',
                          background:flowerNode.borderLocked?(dm?'#7c3aed':'#8b5cf6'):(dm?'#1e293b':'#f1f5f9'),
                          color:flowerNode.borderLocked?'white':(dm?'#94a3b8':'#64748b')}}>
                        {flowerNode.borderLocked ? '🔒 Locked' : '🔓 Lock'}
                      </button>
                    )}
                  </div>
                );
              })()}
              <div style={{flex:1,overflowY:'auto',padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:12,fontWeight:700,color:sub,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                    Activities — drag to reorder by value
                  </span>
                  <button onClick={addActivity}
                    style={{padding:'4px 12px',borderRadius:8,background:dim.color,color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>
                    + Add
                  </button>
                </div>

                {acts.map((act, idx) => (
                  <div key={act.id}
                    draggable
                    onDragStart={() => onDragStart(act.id)}
                    onDragOver={e => onDragOver(e, act.id)}
                    onDragEnd={onDragEnd}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'10px 12px', marginBottom:8, borderRadius:10,
                      border:`1px solid ${dragActivity?.actId===act.id ? dim.color : border}`,
                      background: dragActivity?.actId===act.id ? dim.color+'18' : rowBg,
                      cursor:'grab', transition:'border-color 0.15s',
                    }}
                  >
                    {/* Drag handle */}
                    <span style={{color:sub,fontSize:14,flexShrink:0,cursor:'grab',userSelect:'none'}}>⠿</span>

                    {/* Rank badge */}
                    <span style={{
                      flexShrink:0, width:22, height:22, borderRadius:'50%',
                      background:dim.color, color:'white', fontSize:11, fontWeight:700,
                      display:'flex',alignItems:'center',justifyContent:'center',
                    }}>{idx+1}</span>

                    {/* Editable name */}
                    <input
                      value={act.name}
                      onChange={e => updateActivity(act.id, 'name', e.target.value)}
                      style={{
                        flex:1, background:'transparent', border:'none', outline:'none',
                        fontSize:14, fontWeight:600, color:text, minWidth:0,
                      }}
                    />

                    {/* Editable points */}
                    <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                      <button onClick={()=>updateActivity(act.id,'pts',Math.max(1,act.pts-1))}
                        style={{width:20,height:20,borderRadius:4,border:`1px solid ${border}`,background:'transparent',cursor:'pointer',color:sub,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                      <span style={{fontSize:13,fontWeight:700,color:dim.color,minWidth:24,textAlign:'center'}}>{act.pts}</span>
                      <button onClick={()=>updateActivity(act.id,'pts',Math.min(10,act.pts+1))}
                        style={{width:20,height:20,borderRadius:4,border:`1px solid ${border}`,background:'transparent',cursor:'pointer',color:sub,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      <span style={{fontSize:10,color:sub}}>pts</span>
                    </div>

                    {/* Log button */}
                    <button onClick={()=>logActivity(act)}
                      style={{flexShrink:0,padding:'4px 10px',borderRadius:8,background:dim.color,color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>
                      Log
                    </button>

                    {/* Remove */}
                    <button onClick={()=>removeActivity(act.id)}
                      style={{flexShrink:0,background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:14,opacity:0.5,padding:0}}>✕</button>
                  </div>
                ))}
              </div>

              {/* Recent log */}
              {dim.log?.length > 0 && (
                <div style={{padding:'12px 16px',borderTop:`1px solid ${border}`,maxHeight:140,overflowY:'auto'}}>
                  <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:sub,marginBottom:6}}>Recent</p>
                  {[...(dim.log||[])].reverse().slice(0,6).map((e,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:`1px solid ${dm?'#334155':'#f1f5f9'}`}}>
                      <span style={{color:text}}>{e.note}</span>
                      <span style={{color:sub,fontSize:11}}>{e.date}</span>
                      <span style={{color:dim.color,fontWeight:700,marginLeft:8}}>+{e.pts}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Diary Log Modal ──────────────────────────────────────────────────── */}
      {diaryOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:300,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => { if(e.target===e.currentTarget) setDiaryOpen(false); }}>
          <div style={{background:theme.darkMode?'#0f172a':'white',border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,borderRadius:16,width:'min(95vw,600px)',maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 60px rgba(0,0,0,0.5)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,display:'flex',alignItems:'center',gap:10,background:theme.darkMode?'#1e293b':'#f8fafc'}}>
              <span style={{fontSize:20}}>📓</span>
              <span style={{fontWeight:700,fontSize:16,color:theme.darkMode?'#e2e8f0':'#1e293b',flex:1}}>Daily Log</span>
              <button onClick={()=>setDiaryOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:theme.darkMode?'#94a3b8':'#64748b'}}>✕</button>
            </div>

            {/* Text input + voice */}
            <div style={{padding:'14px 20px',borderBottom:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`}}>
              <div style={{position:'relative'}}>
                <textarea
                  value={diaryText}
                  onChange={e=>setDiaryText(e.target.value)}
                  placeholder="What did you do today? e.g. 'Went climbing with Charlie for 2hrs, read about chemistry, worked on the app'"
                  style={{width:'100%',minHeight:90,padding:'10px 44px 10px 12px',borderRadius:10,border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,background:theme.darkMode?'#1e293b':'white',color:theme.darkMode?'#e2e8f0':'#1e293b',fontSize:14,resize:'vertical',outline:'none',boxSizing:'border-box'}}
                />
                <button onClick={toggleVoice} title="Voice input"
                  style={{position:'absolute',right:10,top:10,background:isListening?'#ef4444':'#16a34a',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
                  {isListening ? '⏹' : '🎤'}
                </button>
              </div>
              {isListening && <p style={{fontSize:11,color:'#ef4444',marginTop:4}}>🔴 Listening… speak now</p>}
              <button onClick={parseDiaryWithAI} disabled={diaryLoading || !diaryText.trim()}
                style={{marginTop:10,width:'100%',padding:'9px',borderRadius:8,background:diaryLoading||!diaryText.trim()?'#64748b':'#16a34a',color:'white',border:'none',cursor:diaryLoading||!diaryText.trim()?'not-allowed':'pointer',fontWeight:700,fontSize:14}}>
                {diaryLoading ? '⏳ Analysing…' : '✨ Parse with AI'}
              </button>
              {diaryError && <p style={{fontSize:12,color:'#ef4444',marginTop:6}}>{diaryError}</p>}
            </div>

            {/* Suggestions */}
            {diarySuggestions.filter(s=>!s.confirmed).length > 0 && (
              <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontWeight:700,fontSize:13,color:theme.darkMode?'#94a3b8':'#64748b'}}>
                    Suggested entries ({diarySuggestions.filter(s=>!s.confirmed).length})
                  </span>
                  <button onClick={confirmAllSuggestions}
                    style={{padding:'5px 14px',borderRadius:8,background:'#16a34a',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:12}}>
                    ✓ Confirm All
                  </button>
                </div>
                {diarySuggestions.filter(s=>!s.confirmed).map(sug => {
                  const dim = dimensions[sug.dim];
                  return (
                    <div key={sug.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:8,borderRadius:10,border:`1px solid ${theme.darkMode?'#334155':'#e2e8f0'}`,background:theme.darkMode?'#1e293b':'#f8fafc'}}>
                      <span style={{fontSize:20,flexShrink:0}}>{dim?.emoji || '📌'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:2}}>
                          <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:99,background:(dim?.color||'#64748b')+'33',color:dim?.color||'#64748b'}}>{dim?.label}</span>
                          <span style={{fontSize:11,color:theme.darkMode?'#94a3b8':'#64748b'}}>{sug.category}</span>
                          {sug.friendId && <span style={{fontSize:11,color:'#22c55e'}}>👤 {sug.friendId}</span>}
                        </div>
                        <input
                          value={sug.note}
                          onChange={e => setDiarySuggestions(prev => prev.map(s => s.id===sug.id ? {...s, note:e.target.value} : s))}
                          style={{width:'100%',background:'transparent',border:'none',outline:'none',fontSize:13,fontWeight:500,color:theme.darkMode?'#e2e8f0':'#1e293b',cursor:'text'}}
                        />
                        <div style={{display:'flex',gap:4,marginTop:4}}>
                          {[1,2,3,4,5].map(v => (
                            <button key={v} onClick={()=>setDiarySuggestions(prev=>prev.map(s=>s.id===sug.id?{...s,pts:v}:s))}
                              style={{width:20,height:20,borderRadius:'50%',border:`1px solid ${sug.pts>=v?(dim?.color||'#22c55e'):(theme.darkMode?'#334155':'#cbd5e1')}`,background:sug.pts>=v?(dim?.color||'#22c55e'):'transparent',cursor:'pointer',fontSize:8,color:'white'}}>
                            </button>
                          ))}
                          <span style={{fontSize:10,color:theme.darkMode?'#94a3b8':'#94a3b8',marginLeft:4}}>{sug.pts} pts</span>
                        </div>
                      </div>
                      <button onClick={()=>confirmSuggestion(sug)}
                        style={{flexShrink:0,width:32,height:32,borderRadius:8,background:'#16a34a',border:'none',cursor:'pointer',color:'white',fontWeight:700,fontSize:16}}>✓</button>
                    </div>
                  );
                })}
              </div>
            )}
            {diarySuggestions.length > 0 && diarySuggestions.every(s=>s.confirmed) && (
              <div style={{padding:24,textAlign:'center',color:'#22c55e',fontWeight:700}}>✅ All logged!</div>
            )}
          </div>
        </div>
      )}

      {/* ── Me Dashboard View ────────────────────────────────────────────────── */}
      {viewMode === 'me' && (() => {
        const dm = theme.darkMode;
        const bg = dm ? '#0f172a' : '#f8fafc';
        const card = dm ? '#1e293b' : 'white';
        const border = dm ? '#334155' : '#e2e8f0';
        const text = dm ? '#e2e8f0' : '#1e293b';
        const sub = dm ? '#94a3b8' : '#64748b';
        const TABS = [
          { id: 'social', label: '🤝 Social' },
          { id: 'creativity', label: '🎨 Creativity' },
          { id: 'knowledge', label: '📚 Knowledge' },
          { id: 'health', label: '💪 Health' },
          { id: 'growth', label: '🌱 Growth' },
        ];

        // Trend calculation: sum of pts logged in last 3 days vs 3 days before that
        const getTrend = (node) => {
          const log = node.interactionLog || [];
          const now = new Date();
          const recent = log.filter(e => {
            const d = new Date(e.date + ' ' + now.getFullYear());
            return (now - d) < 1000 * 60 * 60 * 24 * 3;
          }).reduce((s, e) => s + (e.pts || 0), 0);
          const prev = log.filter(e => {
            const d = new Date(e.date + ' ' + now.getFullYear());
            const age = (now - d) / (1000 * 60 * 60 * 24);
            return age >= 3 && age < 6;
          }).reduce((s, e) => s + (e.pts || 0), 0);
          const currentTier = getTier(node.interactionScore || 0, node);
          const prevScore = (node.interactionScore || 0) - recent;
          const prevTier = getTier(Math.max(0, prevScore), node);
          if (currentTier > prevTier) return 'levelup';
          const diff = recent - prev;
          if (diff > 40) return 'up2';
          if (diff > 10) return 'up1';
          if (diff < -40) return 'down2';
          if (diff < -10) return 'down1';
          return 'stable';
        };

        const TREND_ICONS = {
          levelup: { icon: '▲', color: '#fbbf24', size: 18, bold: true, label: 'Level up!' },
          up2:     { icon: '▲▲', color: '#22c55e', size: 11, bold: true, label: 'Rising fast' },
          up1:     { icon: '▲', color: '#22c55e', size: 13, bold: false, label: 'Improving' },
          stable:  { icon: '', color: 'transparent', size: 12, bold: false, label: '' },
          down1:   { icon: '▼', color: '#ef4444', size: 13, bold: false, label: 'Declining' },
          down2:   { icon: '▼▼', color: '#ef4444', size: 11, bold: true, label: 'Fading fast' },
        };

        const people = nodes.filter(n => n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me');
        const visiblePeople = activeTags.length > 0 ? people.filter(n => isTagFiltered(n.id)) : people;

        return (
          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:50,background:bg,display:'flex',flexDirection:'column',overflow:'hidden',paddingBottom:56}}>
            {/* Header */}
            <div style={{padding:'16px 20px 0',background:card,borderBottom:`1px solid ${border}`,flexShrink:0}}>
              <h2 style={{textAlign:'center',fontWeight:800,fontSize:20,marginBottom:12,background:'linear-gradient(to right,#10b981,#6366f1)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                My Life Dashboard
              </h2>
              {/* Tabs */}
              <div style={{display:'flex',overflowX:'auto',gap:4,paddingBottom:1}}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    style={{
                      padding:'8px 14px',borderRadius:'8px 8px 0 0',border:`1px solid ${border}`,
                      borderBottom: activeTab===tab.id ? `2px solid ${card}` : `1px solid ${border}`,
                      background: activeTab===tab.id ? card : dm?'#0f172a':'#f1f5f9',
                      color: activeTab===tab.id ? text : sub,
                      fontWeight: activeTab===tab.id ? 700 : 500,
                      fontSize:13, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                      marginBottom: activeTab===tab.id ? -1 : 0,
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{flex:1,overflowY:'auto',padding:'16px'}}>

              {/* ── Social tab ── */}
              {activeTab === 'social' && (
                <div>
                  {/* Social flower health summary */}
                  {(() => {
                    const dim = dimensions.social;
                    if (!dim) return null;
                    const h = dim.health ?? 1;
                    const pct = Math.round(h * 100);
                    return (
                      <div style={{background:card,border:`1px solid ${border}`,borderRadius:12,padding:14,marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
                        <span style={{fontSize:28}}>🤝</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,color:text}}>Social Health</div>
                          <div style={{height:6,borderRadius:3,background:dm?'#334155':'#e2e8f0',marginTop:4}}>
                            <div style={{height:'100%',borderRadius:3,width:`${pct}%`,background:h>0.6?dim.color:h>0.3?'#f59e0b':'#ef4444',transition:'width 0.5s'}} />
                          </div>
                          <div style={{fontSize:11,color:dim.color,marginTop:3}}>{pct}% · {dim.weeklyScore||0}/{dim.weeklyTarget} interactions this week</div>
                        </div>
                        <button onClick={()=>setFlowerPanel('social')}
                          style={{padding:'6px 12px',borderRadius:8,background:dim.color,color:'white',border:'none',cursor:'pointer',fontSize:11,fontWeight:700}}>
                          Manage
                        </button>
                      </div>
                    );
                  })()}
                  {/* View switcher */}
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    {[
                      {id:'grid',      label:'Grid'},
                      {id:'byScore',   label:'By Score'},
                      {id:'byMomentum',label:'By Momentum'},
                    ].map(v => (
                      <button key={v.id} onClick={()=>setSocialView(v.id)}
                        style={{
                          flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer',
                          fontSize:11, fontWeight: socialView===v.id ? 700 : 500,
                          background: socialView===v.id ? '#10b981' : (dm?'#1e293b':'#f1f5f9'),
                          color: socialView===v.id ? 'white' : sub,
                          transition:'all 0.15s',
                        }}>{v.label}</button>
                    ))}
                  </div>
                  {/* Bar style toggle — only visible on ranked views */}
                  {(socialView === 'byScore' || socialView === 'byMomentum') && (
                    <div style={{display:'flex',gap:6,marginBottom:14}}>
                      {[
                        {id:'segments', label:'🌈 Tier colours'},
                        {id:'solid',    label:'⬛ Solid tier'},
                      ].map(v => (
                        <button key={v.id} onClick={()=>setBarStyle(v.id)}
                          style={{
                            flex:1, padding:'5px 4px', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer',
                            fontSize:11, fontWeight: barStyle===v.id ? 700 : 500,
                            background: barStyle===v.id ? (dm?'#334155':'#e2e8f0') : 'transparent',
                            color: barStyle===v.id ? text : sub,
                          }}>{v.label}</button>
                      ))}
                    </div>
                  )}

                  {/* GRID VIEW */}
                  {socialView === 'grid' && (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:8}}>
                      {visiblePeople.map(n => {
                        const tier = getTier(n.interactionScore || 0, n);
                        const lvl = FRIENDSHIP_LEVELS.find(l => l.tier === tier) || FRIENDSHIP_LEVELS[0];
                        const trend = getTrend(n);
                        const ti = TREND_ICONS[trend];
                        return (
                          <div key={n.id} onClick={() => { setSelectedNodeId(n.id); setViewMode('canvas'); }}
                            style={{position:'relative',cursor:'pointer',aspectRatio:'1',borderRadius:10,border:`3px solid ${lvl.color}`,overflow:'hidden',boxShadow:`0 2px 8px ${lvl.color}44`}}>
                            <img src={n.img} alt={n.label} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                            <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.55)',padding:'3px 4px',fontSize:10,fontWeight:700,color:'white',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.label}</div>
                            {ti.icon && <div style={{position:'absolute',top:4,right:4,color:ti.color,fontSize:ti.size,fontWeight:ti.bold?900:400,textShadow:'0 1px 3px rgba(0,0,0,0.7)'}}>{ti.icon}</div>}
                            {trend==='levelup' && <div style={{position:'absolute',top:3,left:3,fontSize:12}}>⭐</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* RANKED LIST — by Score or by Momentum */}
                  {(socialView === 'byScore' || socialView === 'byMomentum') && (() => {
                    const MAX_SCORE = 1000;

                    // Score 7 days ago estimated from scoreHistory
                    const scoreWeekAgo = (n) => {
                      const hist = n.scoreHistory || [];
                      const weekMs = 7 * 24 * 3600000;
                      const old = hist.find(h => (Date.now() - h.ts) >= weekMs);
                      return old ? old.score : (n.interactionScore || 0);
                    };

                    const momentum = (n) => (n.interactionScore || 0) - scoreWeekAgo(n);

                    const sorted = [...visiblePeople].sort((a, b) =>
                      socialView === 'byScore'
                        ? (b.interactionScore || 0) - (a.interactionScore || 0)
                        : momentum(b) - momentum(a)
                    );

                    const ROW_H = 64;
                    const PHOTO_W = 48;
                    const BAR_AREA = 220; // total px width for the bar section

                    // Axis: left = 0 pts, right = MAX_SCORE pts
                    // Current score bar from left. Week-ago marker line.
                    // Green if improved (bar extends right from week-ago), red if declined (bar extends left).

                    return (
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {/* Tier threshold labels */}
                        <div style={{marginLeft:PHOTO_W+10,position:'relative',height:16,marginBottom:2}}>
                          {[
                            { score:100,  label:'T2', color:'#bef264' },
                            { score:300,  label:'T3', color:'#84cc16' },
                            { score:600,  label:'T4', color:'#166534' },
                            { score:1000, label:'T5', color:'#3b82f6' },
                          ].map(t => (
                            <span key={t.score} style={{
                              position:'absolute',
                              left:`${(t.score/MAX_SCORE)*100}%`,
                              transform:'translateX(-50%)',
                              fontSize:8, fontWeight:700,
                              color:t.color, opacity:0.8,
                            }}>{t.label}</span>
                          ))}
                        </div>
                        {/* Axis labels */}
                        <div style={{display:'flex',marginLeft:PHOTO_W+10,fontSize:9,color:sub,marginBottom:2}}>
                          <span style={{flex:1,textAlign:'left'}}>0</span>
                          <span style={{flex:1,textAlign:'center'}}>{MAX_SCORE/2}</span>
                          <span style={{flex:1,textAlign:'right'}}>{MAX_SCORE} pts</span>
                        </div>
                        {/* Tier colour axis strip */}
                        <div style={{marginLeft:PHOTO_W+10,height:4,borderRadius:2,background:`linear-gradient(to right, #84cc16, #22c55e, #16a34a, #15803d, #14532d)`,marginBottom:6,opacity:0.6}} />

                        {sorted.map(n => {
                          const score  = n.interactionScore || 0;
                          const prev   = scoreWeekAgo(n);
                          const delta  = score - prev;
                          const tier   = getTier(score, n);
                          const lvl    = FRIENDSHIP_LEVELS.find(l => l.tier === tier) || FRIENDSHIP_LEVELS[0];

                          // Bar widths as fraction of BAR_AREA
                          const currentPct = score / MAX_SCORE;
                          const prevPct    = prev  / MAX_SCORE;
                          const minPct     = Math.min(currentPct, prevPct);
                          const maxPct     = Math.max(currentPct, prevPct);
                          const improved   = delta >= 0;

                          return (
                            <div key={n.id} onClick={()=>{setSelectedNodeId(n.id);setViewMode('canvas');}}
                              style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'4px 0'}}>
                              {/* Photo */}
                              <div style={{width:PHOTO_W,height:PHOTO_W,borderRadius:PHOTO_W/2,overflow:'hidden',border:`2.5px solid ${lvl.color}`,flexShrink:0}}>
                                <img src={n.img} alt={n.label} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                              </div>
                              {/* Name + bar */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:700,color:text,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {n.label}
                                  <span style={{fontWeight:400,color:sub,marginLeft:6,fontSize:10}}>{score} pts</span>
                                  {delta !== 0 && <span style={{marginLeft:4,fontSize:10,color:improved?'#22c55e':'#ef4444',fontWeight:700}}>{improved?'+':''}{delta}</span>}
                                </div>
                                {/* Bar track */}
                                <div style={{position:'relative',height:14,borderRadius:4,background:dm?'#1e293b':'#f1f5f9',overflow:'hidden'}}>
                                {/* Tier threshold lines */}
                                  {[
                                    { score: 100,  color: '#bef264' },
                                    { score: 300,  color: '#84cc16' },
                                    { score: 600,  color: '#166534' },
                                    { score: 1000, color: '#3b82f6' },
                                  ].map(tier => (
                                    <div key={tier.score} style={{
                                      position:'absolute', top:0, bottom:0,
                                      left:`${(tier.score/MAX_SCORE)*100}%`,
                                      width:1.5,
                                      background: tier.color,
                                      opacity:0.45,
                                    }} />
                                  ))}
                                  {/* Current score bar — two modes */}
                                  {barStyle === 'segments' ? (
                                    // Hard tier colour segments
                                    [
                                      { from: 0,   to: 100,  color: '#bef264' },
                                      { from: 100,  to: 300,  color: '#84cc16' },
                                      { from: 300,  to: 600,  color: '#166534' },
                                      { from: 600,  to: 1000, color: '#3b82f6' },
                                    ].map(seg => {
                                      if (score <= seg.from) return null;
                                      const segEnd = Math.min(score, seg.to);
                                      return (
                                        <div key={seg.from} style={{
                                          position:'absolute', top:0, bottom:0,
                                          left:`${(seg.from/MAX_SCORE)*100}%`,
                                          width:`${((segEnd-seg.from)/MAX_SCORE)*100}%`,
                                          background: seg.color, opacity:0.7,
                                        }} />
                                      );
                                    })
                                  ) : (
                                    // Solid — full bar in the current tier's defined colour
                                    (() => {
                                      const TIER_COLORS = [
                                        { maxScore: 100,  color: '#bef264' }, // T1 yellow-green
                                        { maxScore: 300,  color: '#84cc16' }, // T2 sour green
                                        { maxScore: 600,  color: '#166534' }, // T3 forest green
                                        { maxScore: 1000, color: '#3b82f6' }, // T4 blue
                                      ];
                                      const tierColor = (TIER_COLORS.find(t => score <= t.maxScore) || TIER_COLORS[3]).color;
                                      return (
                                        <div style={{
                                          position:'absolute', left:0, top:0, bottom:0,
                                          width:`${currentPct*100}%`,
                                          background: tierColor,
                                          borderRadius:4, opacity:0.75,
                                          transition:'width 0.4s',
                                        }} />
                                      );
                                    })()
                                  )}
                                  {/* Delta bar — green if improved, red if declined */}
                                  <div style={{
                                    position:'absolute',top:2,bottom:2,
                                    left:`${minPct*100}%`,
                                    width:`${(maxPct-minPct)*100}%`,
                                    background: improved ? '#22c55e' : '#ef4444',
                                    borderRadius:2,
                                    opacity:0.85,
                                    minWidth: delta!==0 ? 3 : 0,
                                  }} />
                                  {/* Week-ago marker line */}
                                  {prev !== score && (
                                    <div style={{
                                      position:'absolute',top:0,bottom:0,
                                      left:`${prevPct*100}%`,
                                      width:2,
                                      background: improved ? '#15803d' : '#b91c1c',
                                      opacity:0.9,
                                    }} />
                                  )}
                                </div>
                              </div>
                              {/* Tier emoji */}
                              <span style={{fontSize:16,flexShrink:0}}>{lvl.emoji}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* Legend */}
                  <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:10}}>
                    {Object.entries(TREND_ICONS).filter(([,v])=>v.icon).map(([k,v])=>(
                      <span key={k} style={{fontSize:11,color:sub,display:'flex',alignItems:'center',gap:4}}>
                        <span style={{color:v.color,fontWeight:v.bold?700:400,fontSize:v.size-2}}>{k==='levelup'?'⭐▲':v.icon}</span>
                        {v.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Dimension tabs — creativity/knowledge/health/growth only ── */}
              {['creativity','knowledge','health','growth'].includes(activeTab) && (() => {
                const dim = dimensions[activeTab];
                if (!dim || !dim.color) return null;
                const h = dim.health ?? 1;
                const pct = Math.round(h * 100);
                return (
                  <div>
                    {/* Health summary */}
                    <div style={{background:card,border:`1px solid ${border}`,borderRadius:12,padding:14,marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <span style={{fontSize:28}}>{dim.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,color:text}}>{dim.label}</div>
                          <div style={{fontSize:11,color:dim.color}}>{pct}% health · {dim.weeklyScore||0}/{dim.weeklyTarget} pts this week</div>
                        </div>
                        <button onClick={()=>setFlowerPanel(activeTab)}
                          style={{padding:'6px 14px',borderRadius:8,background:dim.color,color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:12}}>
                          Manage
                        </button>
                      </div>
                      <div style={{height:8,borderRadius:4,background:dm?'#334155':'#e2e8f0'}}>
                        <div style={{height:'100%',borderRadius:4,width:`${pct}%`,background:h>0.6?dim.color:h>0.3?'#f59e0b':'#ef4444',transition:'width 0.5s'}} />
                      </div>
                    </div>
                    {/* Activities quick-log */}
                    <p style={{fontSize:11,fontWeight:700,color:sub,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Log an activity</p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                      {(dim.activities||[]).map(act => (
                        <button key={act.id} onClick={()=>{
                          setDimensions(prev=>{
                            const d=prev[activeTab];
                            return {...prev,[activeTab]:{...d,
                              log:[...(d.log||[]),{date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),category:act.name,note:act.name,pts:act.pts}],
                              weeklyScore:(d.weeklyScore||0)+act.pts,
                              health:Math.min(1,(d.health||0.5)+0.04),
                            }};
                          });
                          showToast(`${dim.emoji} +${act.pts} — ${act.name}`);
                        }} style={{
                          padding:'10px 12px',borderRadius:10,border:`1px solid ${border}`,
                          background:card,cursor:'pointer',textAlign:'left',
                          display:'flex',justifyContent:'space-between',alignItems:'center',
                        }}>
                          <span style={{fontSize:13,fontWeight:600,color:text}}>{act.name}</span>
                          <span style={{fontSize:12,fontWeight:700,color:dim.color,flexShrink:0,marginLeft:6}}>+{act.pts}</span>
                        </button>
                      ))}
                    </div>
                    {/* Recent log */}
                    {(dim.log||[]).length > 0 && (
                      <div>
                        <p style={{fontSize:11,fontWeight:700,color:sub,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Recent entries</p>
                        {[...(dim.log||[])].reverse().slice(0,8).map((e,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${border}`,fontSize:13}}>
                            <span style={{color:text}}>{e.note}</span>
                            <span style={{color:sub,fontSize:11,marginLeft:8}}>{e.date}</span>
                            <span style={{color:dim.color,fontWeight:700,marginLeft:8,flexShrink:0}}>+{e.pts}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{padding:'12px 16px',borderTop:`1px solid ${border}`,background:card,display:'flex',gap:8,flexShrink:0}}>
              <button onClick={()=>setDiaryOpen(true)}
                style={{flex:1,padding:'9px',borderRadius:8,background:'#16a34a',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>
                📓 Daily Log
              </button>
              <button onClick={()=>setViewMode('canvas')}
                style={{padding:'9px 16px',borderRadius:8,background:dm?'#334155':'#e2e8f0',color:text,border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>
                ← Map
              </button>
            </div>
          </div>
        );
      })()}
      {groupModal && (() => {
        const hub = nodes.find(n => n.id === groupModal.hubId);
        if (!hub) { setGroupModal(null); return null; }

        // All non-hub, non-flower people INCLUDING Me
        const people = nodes.filter(n => n.type !== 'hub' && n.type !== 'flower');
        const visiblePeople = activeTags.length > 0 ? people.filter(n => isTagFiltered(n.id)) : people;
        const hubs = nodes.filter(n => n.type === 'hub');

        // States:
        // 0 = empty (not in group, no opinion set yet)
        // 1 = explicitly excluded — red line (auto-set for people who existed before this group)
        // 2 = in group, small greyed photo — yellow dot
        // 3 = in group, full photo — green smiley
        const getMembership = (personId, hubId) => {
          const p = nodes.find(n => n.id === personId);
          const gv = p?.groupVisibility?.[hubId];
          if (gv !== undefined) return gv;
          // If linked but no explicit vis recorded, default to 3
          const linked = links.some(l =>
            (l.source === personId && l.target === hubId) ||
            (l.source === hubId && l.target === personId)
          );
          if (linked) return 3;
          return 0;
        };

        const cycleMembership = (personId, hubId, current) => {
          // Cycle: 0(empty)→1(excluded)→2(small)→3(full)→0
          // But if coming from 0 on a fresh click, go to 2 (yellow) first — skipping excluded
          // Only go to 1 (excluded/red) when cycling back from 3
          let next;
          if (current === 0) next = 2;       // empty → small
          else if (current === 2) next = 3;  // small → full
          else if (current === 3) next = 1;  // full → excluded
          else next = 0;                     // excluded → empty

          setLinks(prev => {
            const hasLink = prev.some(l =>
              (l.source === personId && l.target === hubId) ||
              (l.source === hubId   && l.target === personId)
            );
            if (next === 0 || next === 1) {
              return prev.filter(l =>
                !((l.source === personId && l.target === hubId) ||
                  (l.source === hubId   && l.target === personId))
              );
            } else if (!hasLink) {
              return [...prev, { source: hubId, target: personId }];
            }
            return prev;
          });
          setNodes(prev => prev.map(n => {
            if (n.id !== personId) return n;
            const gv = { ...(n.groupVisibility || {}) };
            if (next === 0) { delete gv[hubId]; }
            else { gv[hubId] = next; }
            return { ...n, groupVisibility: gv };
          }));
        };

        // Initialise newly-created group: pre-existing people start at state 1 (excluded/red)
        // Do this once when the modal first opens for a brand-new hub
        const initNewGroup = (hubId) => {
          setNodes(prev => prev.map(n => {
            if (n.type === 'hub' || n.id === 'me') return n;
            const gv = n.groupVisibility || {};
            if (gv[hubId] === undefined) {
              return { ...n, groupVisibility: { ...gv, [hubId]: 1 } };
            }
            return n;
          }));
        };

        // Run init once if this is a freshly created hub (no memberships set yet)
        const hasAnyMembership = nodes.some(n =>
          n.groupVisibility && n.groupVisibility[groupModal.hubId] !== undefined
        );
        if (!hasAnyMembership) {
          // Use setTimeout to avoid setState-during-render
          setTimeout(() => initNewGroup(groupModal.hubId), 0);
        }

        const dm = theme.darkMode;
        const bg      = dm ? '#0f172a' : '#ffffff';
        const border  = dm ? '#334155' : '#e2e8f0';
        const headBg  = dm ? '#1e293b' : '#f8fafc';
        const rowEven = dm ? '#1e293b' : '#f8fafc';
        const text    = dm ? '#e2e8f0' : '#1e293b';
        const subtext = dm ? '#94a3b8' : '#64748b';

        // Visual for each state
        const TICK_RENDER = [
          { label: '',    bg: 'transparent',       border: dm ? '#1e293b' : '#e2e8f0', color: 'transparent', title: 'Not set'                      },
          { label: '—',   bg: '#ef444422',          border: '#ef4444',                 color: '#ef4444',      title: 'Excluded from this group'      },
          { label: '●',   bg: '#eab30822',          border: '#eab308',                 color: '#eab308',      title: 'In group — small greyed photo' },
          { label: '😊',  bg: '#16a34a22',          border: '#16a34a',                 color: '#16a34a',      title: 'In group — full photo'         },
        ];

        return (
          <div
            style={{ position:'fixed', top:0,left:0,right:0,bottom:0, zIndex:200, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={e => { if (e.target === e.currentTarget) setGroupModal(null); }}
          >
            <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, width:'min(96vw, 780px)', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.5)', overflow:'hidden' }}>

              {/* Header */}
              <div style={{ padding:'18px 24px', borderBottom:`1px solid ${border}`, background:headBg, display:'flex', alignItems:'center', gap:12 }}>
                <TreePine size={20} color="#16a34a" />
                <input
                  value={hub.label}
                  onChange={e => setNodes(prev => prev.map(n => n.id === hub.id ? { ...n, label: e.target.value } : n))}
                  style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:18, fontWeight:700, color:text }}
                />
                <button
                  onClick={() => {
                    setLinks(prev => prev.filter(l => l.source !== hub.id && l.target !== hub.id));
                    setNodes(prev => prev.filter(n => n.id !== hub.id));
                    setGroupModal(null);
                    showToast('🗑️ Group deleted');
                  }}
                  style={{ padding:'6px 12px', borderRadius:8, background:'#ef4444', border:'none', color:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}
                >Delete</button>
                <button
                  onClick={() => setGroupModal(null)}
                  style={{ padding:'6px 14px', borderRadius:8, background:dm?'#334155':'#e2e8f0', border:'none', color:text, cursor:'pointer', fontSize:13, fontWeight:600 }}
                >Done</button>
              </div>

              {/* Group colour picker */}
              <div style={{ padding:'10px 24px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{fontSize:12,color:dm?'#94a3b8':'#64748b',fontWeight:600}}>Group colour:</span>
                {PRIMARY_GROUP_COLORS.map(c => (
                  <button key={c} onClick={()=>setGroupColors(prev=>({...prev,[hub.id]:c}))}
                    style={{width:22,height:22,borderRadius:'50%',background:c,border:(groupColors[hub.id]||PRIMARY_GROUP_COLORS[nodes.filter(n=>n.type==='hub').findIndex(n=>n.id===hub.id)%PRIMARY_GROUP_COLORS.length])===c?'3px solid white':'2px solid transparent',cursor:'pointer',boxShadow:(groupColors[hub.id]||PRIMARY_GROUP_COLORS[nodes.filter(n=>n.type==='hub').findIndex(n=>n.id===hub.id)%PRIMARY_GROUP_COLORS.length])===c?'0 0 0 2px '+c:'none'}}/>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ padding:'12px 24px', borderBottom:`1px solid ${border}`, display:'flex', gap:10 }}>
                <button
                  onClick={() => {
                    setGroupModal(null);
                    setSelectForGroupMode(groupModal.hubId);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:8, background:'#16a34a', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}
                >
                  <span>＋</span><span>Select from Map</span>
                </button>
                <button
                  onClick={() => {
                    setGroupModal(null);
                    setAddFriendForms(prev => [...prev, { id:'form_'+Date.now(), name:'', parentId: hub.id }]);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:8, background:'#0ea5e9', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}
                >
                  <span>👤</span><span>New Friend</span>
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX:'auto', overflowY:'auto', flex:1 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:headBg, position:'sticky', top:0, zIndex:2 }}>
                      <th style={{ textAlign:'left', padding:'10px 16px', color:subtext, fontWeight:600, borderBottom:`1px solid ${border}`, minWidth:120 }}>Person</th>
                      {hubs.map(h => (
                        <th key={h.id} style={{ padding:'10px 12px', color: h.id === hub.id ? '#16a34a' : subtext, fontWeight:600, borderBottom:`1px solid ${border}`, minWidth:90, textAlign:'center', whiteSpace:'nowrap' }}>
                          {h.id === hub.id ? '★ ' : ''}{h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person, pi) => (
                      <tr key={person.id} style={{ background: pi % 2 === 0 ? rowEven : bg }}>
                        {/* Person column */}
                        <td style={{ padding:'8px 16px', borderBottom:`1px solid ${border}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <img src={person.img} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                            <span style={{ color:text, fontWeight:500 }}>{person.label}</span>
                          </div>
                        </td>
                        {/* Hub columns */}
                        {hubs.map(h => {
                          const state = getMembership(person.id, h.id);
                          const tr = TICK_RENDER[state];
                          return (
                            <td key={h.id} style={{ padding:'8px 12px', borderBottom:`1px solid ${border}`, textAlign:'center' }}>
                              <button
                                title={tr.title}
                                onClick={() => cycleMembership(person.id, h.id, state)}
                                style={{
                                  width:34, height:34, borderRadius:8,
                                  background: tr.bg,
                                  border: `2px solid ${tr.border}`,
                                  color: tr.color,
                                  cursor:'pointer', fontSize:state === 3 ? 18 : 15, fontWeight:700,
                                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                                  transition:'all 0.15s',
                                }}
                              >
                                {tr.label}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {people.length === 0 && (
                      <tr><td colSpan={hubs.length + 1} style={{ padding:24, textAlign:'center', color:subtext, fontStyle:'italic' }}>No people added yet. Use Add new people above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div style={{ padding:'10px 24px', borderTop:`1px solid ${border}`, display:'flex', gap:20, flexWrap:'wrap' }}>
                {TICK_RENDER.map((tr, i) => (
                  <span key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:subtext }}>
                    <span style={{ color: tr.color === 'transparent' ? subtext : tr.color, fontWeight:700, fontSize:14, border:`1px solid ${tr.border}`, borderRadius:4, padding:'1px 5px', background: tr.bg }}>
                      {tr.label || ' '}
                    </span>
                    {tr.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      {/* ── Bottom Tab Bar ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'stretch',
        background: theme.darkMode ? '#0f172a' : 'white',
        borderTop: `1px solid ${theme.darkMode ? '#334155' : '#e2e8f0'}`,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {[
          { id: 'canvas',   label: 'Map', icon: (active) => (
            <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 19 L11 10 M11 14 C11 14 7 12 6 8 C9 7 12 10 11 14 M11 12 C11 12 15 10 16 6 C13 5 10 8 11 12" stroke={active?'#10b981':'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="11" cy="19" r="1.5" fill={active?'#10b981':'currentColor'}/>
              </svg>
              <span style={{position:'absolute',top:-5,right:-10,fontSize:7,fontWeight:800,background:'#10b981',color:'white',borderRadius:99,padding:'1px 3px',lineHeight:1.3,pointerEvents:'none'}}>v{APP_VERSION}</span>
            </div>
          )},
          { id: 'calendar', label: 'Calendar', icon: (active) => <CalendarIcon className="w-5 h-5" /> },
          { id: 'me',       label: 'Overview', icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              {/* Sideways bar chart */}
              <rect x="4" y="5" width="8" height="3" rx="1.5" fill={active?'#10b981':'currentColor'}/>
              <rect x="4" y="10" width="13" height="3" rx="1.5" fill={active?'#10b981':'currentColor'}/>
              <rect x="4" y="15" width="5" height="3" rx="1.5" fill={active?'#10b981':'currentColor'}/>
            </svg>
          )},
          { id: 'add', label: 'Add', action: () => setShowAddMenu(p=>!p), icon: (active) => (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke={active?'#10b981':'currentColor'} strokeWidth="1.8"/>
              <path d="M11 7 L11 15 M7 11 L15 11" stroke={active?'#10b981':'currentColor'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )},
        ].map(tab => {
          const active = tab.action ? (tab.id==='add' ? showAddMenu : false) : viewMode === tab.id;
          const color = active ? '#10b981' : (theme.darkMode ? '#94a3b8' : '#64748b');
          return (
            <button key={tab.id}
              onClick={() => tab.action ? tab.action() : setViewMode(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px 6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color,
                borderTop: active ? `2px solid #10b981` : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
              {tab.icon(active)}
              <span style={{fontSize: 10, fontWeight: active ? 700 : 500, marginTop: 2}}>{tab.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

// ─── Life Dimensions ─────────────────────────────────────────────────────────
const mkCat = (name, pts) => ({ id: name.toLowerCase().replace(/\W+/g,'_'), name, pts });

const DEFAULT_DIMENSIONS = {
  creativity: {
    label: 'Creativity', emoji: '🎨', color: '#9333ea',   // purple
    weeklyTarget: 3,
    activities: [
      mkCat('Digital / Code', 4),
      mkCat('Visual Art', 3),
      mkCat('Writing', 3),
      mkCat('3D / Making', 4),
      mkCat('Music', 3),
      mkCat('Design', 3),
    ],
    log: [], weeklyScore: 0, health: 1.0,
  },
  knowledge: {
    label: 'Knowledge', emoji: '📚', color: '#3b82f6',    // blue
    weeklyTarget: 3,
    activities: [
      mkCat('Books', 4),
      mkCat('Documentaries', 2),
      mkCat('Courses', 5),
      mkCat('Deep Dives', 4),
      mkCat('Podcasts / Audio', 2),
    ],
    log: [], weeklyScore: 0, health: 1.0,
  },
  health: {
    label: 'Health', emoji: '💪', color: '#ef4444',        // red
    weeklyTarget: 3,
    activities: [
      mkCat('Climbing', 5),
      mkCat('Cardio / Running', 4),
      mkCat('Weights', 4),
      mkCat('Dance', 3),
      mkCat('Sport', 4),
      mkCat('Flexibility', 2),
    ],
    log: [], weeklyScore: 0, health: 1.0,
  },
  growth: {
    label: 'Growth', emoji: '🌱', color: '#f97316',        // orange
    weeklyTarget: 2,
    activities: [
      mkCat('Reflection / Journal', 3),
      mkCat('Applied a Lesson', 5),
      mkCat('Long-term Goal', 4),
      mkCat('Rest / Recovery', 2),
      mkCat('Mental Health Check', 3),
    ],
    log: [], weeklyScore: 0, health: 1.0,
    autoCalculated: true,
  },
  social: {
    label: 'Social', emoji: '🤝', color: '#22c55e',   // green
    weeklyTarget: 5,
    activities: [
      mkCat('Message a friend', 1),
      mkCat('Coffee / catch-up', 3),
      mkCat('Night out', 4),
      mkCat('Trip together', 5),
      mkCat('Meaningful gesture', 4),
      mkCat('Check in on someone', 2),
    ],
    log: [], weeklyScore: 0, health: 1.0,
    autoCalculated: true, // feeds from friendship interaction scores
  },
};

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
