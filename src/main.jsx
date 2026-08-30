import React,{useEffect,useState} from 'react';
import ReactDOM from 'react-dom/client';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import App from './App.jsx';
import WellbeingStack from './wellbeing/WellbeingStack.jsx';
import './index.css';

function findDailyPlannerRoot(){
  const all=[...document.querySelectorAll('body *')];
  const title=all.find(el=>el.childElementCount===0&&el.textContent?.trim()==='Daily planner');
  if(!title)return null;
  let node=title;
  while(node&&node!==document.body){
    const text=node.textContent||'';
    if(text.includes('00:00')&&text.includes('23:00'))return node;
    node=node.parentElement;
  }
  return null;
}

function findBirthdayCalendarRoot(){
  const all=[...document.querySelectorAll('#root *')];
  const title=all.find(el=>el.childElementCount===0&&el.textContent?.trim()==='BIRTHDAY CALENDAR');
  if(!title)return null;
  let node=title;
  while(node&&node.parentElement&&node.parentElement.id!=='root'){
    const style=getComputedStyle(node);
    if((style.position==='absolute'||style.position==='fixed')&&style.inset!=='auto')return node;
    node=node.parentElement;
  }
  return node&&node.parentElement?.id==='root'?node:null;
}

function FriendshipTreeRoot(){
  const [wellbeingOpen,setWellbeingOpen]=useState(false);
  const [plannerOpen,setPlannerOpen]=useState(false);

  useEffect(()=>{
    let active=null;
    let hiddenCalendar=null;
    const restoreCalendar=()=>{
      if(!hiddenCalendar)return;
      hiddenCalendar.style.display=hiddenCalendar.dataset.ftPageOldDisplay||'';
      hiddenCalendar.removeAttribute('aria-hidden');
      hiddenCalendar.inert=false;
      delete hiddenCalendar.dataset.ftPageOldDisplay;
      hiddenCalendar=null;
    };
    const apply=()=>{
      const planner=findDailyPlannerRoot();
      if(planner!==active){
        if(active){
          active.removeAttribute('data-ft-isolated-planner');
          active.style.cssText=active.dataset.ftOldStyle||'';
          delete active.dataset.ftOldStyle;
        }
        active=planner;
        setPlannerOpen(Boolean(planner));
        document.documentElement.classList.toggle('ft-daily-planner-open',Boolean(planner));
        document.body.classList.toggle('ft-daily-planner-open',Boolean(planner));
        if(planner){
          planner.dataset.ftOldStyle=planner.getAttribute('style')||'';
          planner.setAttribute('data-ft-isolated-planner','true');
          Object.assign(planner.style,{position:'fixed',top:'0',left:'0',right:'0',bottom:'0',zIndex:'140',width:'100vw',height:'auto',maxWidth:'none',maxHeight:'none',margin:'0',paddingBottom:'calc(72px + env(safe-area-inset-bottom,0px))',boxSizing:'border-box',overflowX:'hidden',overflowY:'auto',overscrollBehavior:'contain',background:'#07101f',touchAction:'pan-y'});
        }
      }
      if(planner){
        const calendar=findBirthdayCalendarRoot();
        if(calendar&&calendar!==hiddenCalendar){
          restoreCalendar();
          hiddenCalendar=calendar;
          hiddenCalendar.dataset.ftPageOldDisplay=hiddenCalendar.style.display||'';
          hiddenCalendar.style.display='none';
          hiddenCalendar.setAttribute('aria-hidden','true');
          hiddenCalendar.inert=true;
        }
      }else restoreCalendar();
    };
    apply();
    const observer=new MutationObserver(()=>requestAnimationFrame(apply));
    observer.observe(document.getElementById('root'),{childList:true,subtree:true});
    return()=>{
      observer.disconnect();
      restoreCalendar();
      document.documentElement.classList.remove('ft-daily-planner-open');
      document.body.classList.remove('ft-daily-planner-open');
    };
  },[]);

  return <>
    <App />
    {!plannerOpen&&<button
      aria-label="Open Mind Body Soul wellbeing view"
      onClick={()=>setWellbeingOpen(true)}
      style={{position:'fixed',right:14,bottom:'calc(78px + env(safe-area-inset-bottom,0px))',zIndex:145,width:48,height:48,borderRadius:'50%',border:'2px solid rgba(255,255,255,.75)',background:'#7c3aed',color:'white',boxShadow:'0 5px 18px rgba(0,0,0,.35)',fontSize:20,fontWeight:900}}
    >✦</button>}
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