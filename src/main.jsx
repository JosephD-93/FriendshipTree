import React,{useState} from 'react';
import ReactDOM from 'react-dom/client';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import App from './App.jsx';
import WellbeingStack from './wellbeing/WellbeingStack.jsx';
import './index.css';

function FriendshipTreeRoot(){
  const [wellbeingOpen,setWellbeingOpen]=useState(false);
  return <>
    <App />
    <button
      aria-label="Open Mind Body Soul wellbeing view"
      onClick={()=>setWellbeingOpen(true)}
      style={{position:'fixed',right:14,bottom:'calc(78px + env(safe-area-inset-bottom,0px))',zIndex:145,width:48,height:48,borderRadius:'50%',border:'2px solid rgba(255,255,255,.75)',background:'#7c3aed',color:'white',boxShadow:'0 5px 18px rgba(0,0,0,.35)',fontSize:20,fontWeight:900}}
    >✦</button>
    {wellbeingOpen&&<div style={{position:'fixed',inset:0,zIndex:300,overflowY:'auto',background:'#07101f',color:'#e2e8f0',paddingTop:'env(safe-area-inset-top,0px)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <header style={{position:'sticky',top:0,zIndex:2,display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(7,16,31,.96)',borderBottom:'1px solid #334155'}}>
        <button onClick={()=>setWellbeingOpen(false)} style={{width:38,height:38,borderRadius:'50%',border:'1px solid #475569',background:'#0f172a',color:'white',fontSize:20}}>‹</button>
        <div><strong style={{display:'block'}}>Wellbeing</strong><span style={{fontSize:11,opacity:.6}}>Mind · Body · Soul</span></div>
      </header>
      <WellbeingStack />
    </div>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<FriendshipTreeRoot />);

async function confirmAppReady() {
  try {
    const result = await CapacitorUpdater.notifyAppReady();
    console.log('[Capgo] notifyAppReady succeeded:', result);
  } catch (error) {
    console.error('[Capgo] notifyAppReady failed:', error);
  }
}

confirmAppReady();