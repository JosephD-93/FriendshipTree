const { useState, useRef, useEffect, useCallback, useMemo } = React;
const { Plus, Trash2, ZoomIn, ZoomOut, Calendar: CalendarIcon, X, Settings, Moon, Sun, Cloud, Info, Activity, TreePine, MessageCircle, Coffee, PartyPopper, Plane, HeartHandshake, Map: MapIcon, BookUser } = lucideReact;

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
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft_collapsedGroups')) || []; } catch { return []; }
  });
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
  const [avatarBuilder, setAvatarBuilder] = useState(null);
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
  const [theme, setTheme] = useState({ darkMode: true, showWeathering: true });
  const [showTutorial, setShowTutorial] = useState(true);
  const [showLevelPanel, setShowLevelPanel] = useState(false);
  const [showLevelSetter, setShowLevelSetter] = useState(false);
  const [groupModal, setGroupModal] = useState(null); // null | { hubId }
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
      setDragNode({ id: nodeId, startX: node.x, startY: node.y, pointerId: e.pointerId });
      clearTimeout(liftTimer.current);
      liftTimer.current = setTimeout(() => {
        isPanningOverride.current = false;
        setLiftedNodeId(nodeId);
      }, 150);
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
          // Swipe detected — cancel lift, switch to pan
          clearTimeout(liftTimer.current)