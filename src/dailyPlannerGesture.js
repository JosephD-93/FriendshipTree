export function createDailyPlannerGestureController({getSlot,setSelection,finishSelection,cancelSelection,holdMs=350,moveThreshold=12}){
  let state=null;
  const cleanup=()=>{
    document.removeEventListener('touchmove',onTouchMove,true);
    document.removeEventListener('touchend',onTouchEnd,true);
    document.removeEventListener('touchcancel',onTouchCancel,true);
    if(state?.timer) clearTimeout(state.timer);
  };
  const touchFor=(event)=>{
    const all=[...(event.touches||[]),...(event.changedTouches||[])];
    return all.find(t=>t.identifier===state?.touchId)||all[0]||null;
  };
  const onTouchMove=event=>{
    if(!state)return;
    const touch=touchFor(event);
    if(!touch)return;
    if(!state.active){
      const distance=Math.hypot(touch.clientX-state.startX,touch.clientY-state.startY);
      if(distance>moveThreshold){ cleanup(); state=null; }
      return;
    }
    if(event.cancelable)event.preventDefault();
    const slot=getSlot(state.element,touch.clientY);
    state.end=slot;
    setSelection(state.date,state.start,slot);
  };
  const onTouchEnd=event=>{
    if(!state)return;
    const current=state;
    const touch=touchFor(event);
    cleanup();
    state=null;
    if(!current.active){ cancelSelection(); return; }
    if(event.cancelable)event.preventDefault();
    const end=touch?getSlot(current.element,touch.clientY):current.end;
    finishSelection(current.date,current.start,end);
  };
  const onTouchCancel=()=>{ cleanup(); state=null; cancelSelection(); };
  const start=(event,date,element,startSlot)=>{
    cleanup();
    const nativeEvent=event.nativeEvent||event;
    const touch=nativeEvent.changedTouches?.[0]||nativeEvent.touches?.[0];
    state={date,element,start:startSlot,end:startSlot,startX:touch?.clientX??event.clientX,startY:touch?.clientY??event.clientY,touchId:touch?.identifier,active:false,timer:null};
    document.addEventListener('touchmove',onTouchMove,{passive:false,capture:true});
    document.addEventListener('touchend',onTouchEnd,{passive:false,capture:true});
    document.addEventListener('touchcancel',onTouchCancel,{passive:false,capture:true});
    state.timer=setTimeout(()=>{
      if(!state)return;
      state.active=true;
      setSelection(state.date,state.start,state.start);
    },holdMs);
  };
  return {start,cancel:onTouchCancel,destroy:cleanup};
}
