import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Trash2, ZoomIn, ZoomOut,
  Calendar as CalendarIcon, X, Settings, 
  Moon, Sun, Cloud, Info, Activity, TreePine,
  MessageCircle, Coffee, PartyPopper, Plane, HeartHandshake, Map as MapIcon,
  BookUser
} from 'lucide-react';

const INTERACTION_DISTANCE = 80;
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
  const [photoCrop, setPhotoCrop] = useState(null);
  const [avatarBuilder, setAvatarBuilder] = useState(null);
  const cropCanvasRef = useRef(null);
  const cropImgRef = useRef(null);
  const cropDragRef = useRef(null);
  const idbRef = useRef(null);

  // ── IndexedDB for photo storage ───────────────────────────────────────────
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
    setNodes(INITIAL_NODES);
    setLinks(INITIAL_LINKS);
    setDimensions(DEFAULT_DIMENSIONS);
    try {
      localStorage.removeItem('ft_nodes');
      localStorage.removeItem('ft_links');
      localStorage.removeItem('ft_dimensions');
    } catch {}
    clearPhotoDB();
    showToast('🗑️ All data cleared');
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
  const [pinModal, setPinModal] = useState(null); // {mode:'set'|'verify'|'clear', onSuccess, title}
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
  const [theme, setTheme] = useState({ darkMode: true, showWeathering: true });
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
  const [pendingPaths, setPendingPaths] = useState([]); // [{pts:[{x,y}]}] accumulated while mode is on
  const [currentStroke, setCurrentStroke] = useState([]); // [{x,y}] current stroke being drawn
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
        // Only activate if node is already lifted (being dragged)
        if (!liftedNodeId) return;
        const draggedNode = nodes.find(n => n.id === nodeId);
        if (!draggedNode) return;

        // BFS outward from this node (following source→target links away from centre)
        const visited = new Set([nodeId]);
        const queue = [nodeId];
        while (queue.length > 0) {
          const curr = queue.shift();
          links.forEach(l => {
            if (l.source === curr && !visited.has(l.target)) {
              const target = nodes.find(n => n.id === l.target);
              if (target && target.type !== 'flower' && target.id !== 'me') {
                visited.add(l.target);
                queue.push(l.target);
              }
            }
          });
        }
        if (visited.size <= 1) return; // no children to drag

        // Save origins at current node positions
        const origins = {};
        nodes.forEach(n => { if (visited.has(n.id)) origins[n.id] = { x: n.x, y: n.y }; });
        groupDragOrigins.current = origins;
        // Update dragNode startX/Y to current position so delta starts from here
        setDragNode(prev => prev ? { ...prev, startX: draggedNode.x, startY: draggedNode.y } : prev);
        groupDragIds.current = visited;
        showToast('🌿 Moving group of ' + visited.size);
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
        if (n.id !== dragNode.id && n.id !== 'me' &&
            (n.type !== 'flower' || n.id === 'flower_social')) {
          const d = Math.sqrt((n.x-svgX)**2 + (n.y-svgY)**2);
          if (d < minDist) { minDist = d; closest = n.id; }
        }
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
          else if (tappedNode?.type === 'flower') setFlowerPanel(tappedNode.dimKey);
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
        // Group→Group: offer merge
        if (draggedNode?.type === 'hub' && targetNode?.type === 'hub') {
          setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
          setMergePrompt({ type: 'group', a: dragNode.id, b: hoverTarget });
        // Person→Person: offer to connect
        } else if (!draggedNode?.type && !targetNode?.type && draggedNode?.id !== 'me' && targetNode?.id !== 'me') {
          const alreadyLinked = links.some(l =>
            (l.source === dragNode.id && l.target === hoverTarget) ||
            (l.source === hoverTarget && l.target === dragNode.id)
          );
          if (!alreadyLinked) {
            setNodes(prev => prev.map(n => n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n));
            setMergePrompt({ type: 'friend', a: dragNode.id, b: hoverTarget });
          }
        } else if (targetNode && targetNode.type !== 'hub') {
          const alreadyLinked = links.some(l =>
            (l.source === dragNode.id && l.target === hoverTarget) ||
            (l.source === hoverTarget && l.target === dragNode.id)
          );
          if (!alreadyLinked) {
            setLinks(prev => [...prev, { source: dragNode.id, target: hoverTarget }]);
            // Don't move the node — snap to hex where they released it
            if (archived) {
              setArchivedLinks(prev => prev.filter(l => l !== archived));
              showToast('🌿 Reconnected — friendship restored at ' + archived.score + ' pts');
            } else {
              showToast('🌱 Connected to ' + targetNode.label);
            }
          }
        } else if (targetNode?.type === 'flower' && targetNode?.id === 'flower_social') {
          // Dropped onto social flower — add link and bounce back to original position
          const alreadyLinked = links.some(l =>
            (l.source === 'flower_social' && l.target === dragNode.id) ||
            (l.source === dragNode.id && l.target === 'flower_social')
          );
          if (!alreadyLinked) {
            setLinks(prev => [...prev, { source: 'flower_social', target: dragNode.id }]);
            showToast('🌱 Connected to Social');
          }
          // Bounce back to original position
          setNodes(prev => prev.map(n =>
            n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY } : n
          ));
        } else if (targetNode?.type === 'hub') {
          setLinks(prev => [
            ...prev.filter(l => l.source !== dragNode.id && l.target !== dragNode.id),
            { source: hoverTarget, target: dragNode.id }
          ]);
          setNodes(prev => prev.map(n =>
            n.id === dragNode.id ? { ...n, x: dragNode.startX, y: dragNode.startY, primaryGroup: hoverTarget } : n
          ));
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
    setLinks(prev => [...prev, { source: finalSrc, target: finalTgt }]);

    if (archived) {
      setArchivedLinks(prev => prev.filter(l => l !== archived));
      setNodes(prev => prev.map(n =>
        n.id === finalTgt ? { ...n, interactionScore: Math.max(n.interactionScore || 0, archived.score || 0) } : n
      ));
      showToast(`🌿 Reconnected — ${sourceNode.label} & ${targetNode.label} restored at ${archived.score} pts`);
    } else {
      showToast(`🌱 Connected ${sourceNode.label} → ${targetNode.label}`);
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
    liftedNodeId === nodeId ? 'none' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';

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

  const selectedNode = nodes.find(n => n.id === sel