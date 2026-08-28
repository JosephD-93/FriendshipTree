export function dailyPlannerTouchTransform(){
  return {
    name:'friendshiptree-daily-planner-native-touch',
    enforce:'pre',
    transform(code,id){
      if(!id.endsWith('/src/App.jsx')) return null;
      const oldIx='const ix=e=>{const r=e.currentTarget.getBoundingClientRect();return Math.max(0,Math.min(47,Math.floor((e.clientY-r.top)/(r.height/48))))},tm=n=>';
      const newIx='const ixY=(el,y)=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(47,Math.floor((y-r.top)/(r.height/48))))},ix=e=>ixY(e.currentTarget,e.clientY),tm=n=>';
      if(!code.includes(oldIx)) throw new Error('Daily planner slot helper signature changed; gesture transform not applied');
      code=code.replace(oldIx,newIx);

      const marker='onPointerDown:e=>{if(e.cancelable)e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const n=ix(e),next={date,a:n,b:n,id:e.pointerId};dragRef.current=next;setDrag(next)},onPointerMove:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const next={...cur,b:ix(e)};dragRef.current=next;setDrag(next)},onPointerUp:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const lo=Math.min(cur.a,cur.b),hi=Math.max(cur.a,cur.b)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},onPointerCancel:e=>{if(dragRef.current?.id===e.pointerId){dragRef.current=null;setDrag(null)}},onContextMenu:e=>e.preventDefault(),style:';
      const replacement='onPointerDown:e=>{const el=e.currentTarget,n=ix(e);if(e.cancelable)e.preventDefault();try{el.setPointerCapture(e.pointerId)}catch{};if(e.pointerType!=="touch"){const next={date,a:n,b:n,id:e.pointerId,active:true,el};dragRef.current=next;setDrag(next);return}let scrollEl=el.parentElement;while(scrollEl&&scrollEl!==document.body){const cs=getComputedStyle(scrollEl);if(/auto|scroll/.test(cs.overflowY)&&scrollEl.scrollHeight>scrollEl.clientHeight)break;scrollEl=scrollEl.parentElement}if(!scrollEl||scrollEl===document.body)scrollEl=document.scrollingElement;const pending={date,a:n,b:n,id:e.pointerId,active:false,moved:false,startY:e.clientY,startX:e.clientX,startScroll:scrollEl?.scrollTop||0,scrollEl,el,timer:null};pending.timer=setTimeout(()=>{if(dragRef.current!==pending||pending.moved)return;pending.active=true;setDrag({...pending})},350);dragRef.current=pending},onPointerMove:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();if(e.pointerType==="touch"&&!cur.active){const dy=e.clientY-cur.startY,dx=e.clientX-cur.startX;if(!cur.moved&&Math.hypot(dx,dy)>6){cur.moved=true;clearTimeout(cur.timer)}if(cur.moved&&cur.scrollEl)cur.scrollEl.scrollTop=cur.startScroll-dy;return}const next={...cur,b:ixY(cur.el||e.currentTarget,e.clientY)};dragRef.current=cur;setDrag(next)},onPointerUp:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;clearTimeout(cur.timer);if(e.cancelable)e.preventDefault();if(e.pointerType==="touch"&&!cur.active){dragRef.current=null;setDrag(null);return}const end=ixY(cur.el||e.currentTarget,e.clientY),lo=Math.min(cur.a,end),hi=Math.max(cur.a,end)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},onPointerCancel:e=>{const cur=dragRef.current;if(cur?.id===e.pointerId){clearTimeout(cur.timer);dragRef.current=null;setDrag(null)}},onContextMenu:e=>e.preventDefault(),style:';
      if(!code.includes(marker)) throw new Error('Daily planner gesture signature changed; gesture transform not applied');
      code=code.replace(marker,replacement);

      const touchStyle='touchAction:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"';
      if(!code.includes(touchStyle)) throw new Error('Daily planner touch-action signature changed; gesture fix not applied');
      return {code,map:null};
    }
  };
}
