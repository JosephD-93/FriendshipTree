export function dailyPlannerTouchTransform(){
  return {
    name:'friendshiptree-daily-planner-native-touch',
    enforce:'pre',
    transform(code,id){
      if(!id.endsWith('/src/App.jsx')) return null;

      const importMarker='import{registerPlugin}from"@capacitor/core";';
      const importReplacement='import{registerPlugin}from"@capacitor/core";import{createDailyPlannerGestureController}from"./dailyPlannerGesture";';
      if(!code.includes(importMarker)) throw new Error('Daily planner import signature changed; gesture controller not attached');
      code=code.replace(importMarker,importReplacement);

      const refMarker='const dragRef=React.useRef(null),EVENT_COLORS=';
      const refReplacement='const dragRef=React.useRef(null),touchControllerRef=React.useRef(null),EVENT_COLORS=';
      if(!code.includes(refMarker)) throw new Error('Daily planner ref signature changed; gesture controller not attached');
      code=code.replace(refMarker,refReplacement);

      const oldIx='const ix=e=>{const r=e.currentTarget.getBoundingClientRect();return Math.max(0,Math.min(47,Math.floor((e.clientY-r.top)/(r.height/48))))},tm=n=>pad(Math.floor(n/2))+":"+(n%2?"30":"00");';
      const newIx='const ixY=(el,y)=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(47,Math.floor((y-r.top)/(r.height/48))))},ix=e=>ixY(e.currentTarget,e.clientY),tm=n=>pad(Math.floor(n/2))+":"+(n%2?"30":"00");if(!touchControllerRef.current)touchControllerRef.current=createDailyPlannerGestureController({getSlot:ixY,setSelection:(d,a,b)=>{const next={date:d,a,b,id:"touch",active:true};dragRef.current=next;setDrag(next)},finishSelection:(d,a,b)=>{const lo=Math.min(a,b),hi=Math.max(a,b)+1;setDraft({date:d,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},cancelSelection:()=>{dragRef.current=null;setDrag(null)}});React.useEffect(()=>()=>touchControllerRef.current?.destroy(),[]);';
      if(!code.includes(oldIx)) throw new Error('Daily planner slot helper signature changed; gesture controller not attached');
      code=code.replace(oldIx,newIx);

      const marker='onPointerDown:e=>{if(e.cancelable)e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const n=ix(e),next={date,a:n,b:n,id:e.pointerId};dragRef.current=next;setDrag(next)},onPointerMove:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const next={...cur,b:ix(e)};dragRef.current=next;setDrag(next)},onPointerUp:e=>{const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const lo=Math.min(cur.a,cur.b),hi=Math.max(cur.a,cur.b)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},onPointerCancel:e=>{if(dragRef.current?.id===e.pointerId){dragRef.current=null;setDrag(null)}},onContextMenu:e=>e.preventDefault(),style:';
      const replacement='onPointerDown:e=>{const el=e.currentTarget,n=ix(e);if(e.pointerType==="touch"){touchControllerRef.current.start(e,date,el,n);return}if(e.cancelable)e.preventDefault();el.setPointerCapture(e.pointerId);const next={date,a:n,b:n,id:e.pointerId};dragRef.current=next;setDrag(next)},onPointerMove:e=>{if(e.pointerType==="touch")return;const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const next={...cur,b:ix(e)};dragRef.current=next;setDrag(next)},onPointerUp:e=>{if(e.pointerType==="touch")return;const cur=dragRef.current;if(!cur||cur.id!==e.pointerId)return;if(e.cancelable)e.preventDefault();const lo=Math.min(cur.a,cur.b),hi=Math.max(cur.a,cur.b)+1;setDraft({date,title:"",notes:"",location:"",peopleIds:[],color:DEFAULT_EVENT_COLOR,startTime:tm(lo),endTime:hi===48?"23:59":tm(hi)});dragRef.current=null;setDrag(null)},onPointerCancel:e=>{if(e.pointerType!=="touch"&&dragRef.current?.id===e.pointerId){dragRef.current=null;setDrag(null)}},onContextMenu:e=>e.preventDefault(),style:';
      if(!code.includes(marker)) throw new Error('Daily planner pointer signature changed; gesture controller not attached');
      code=code.replace(marker,replacement);

      const touchStyle='touchAction:"none",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"';
      const scrollStyle='touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none"';
      if(!code.includes(touchStyle)) throw new Error('Daily planner touch-action signature changed; scroll fix not applied');
      code=code.replace(touchStyle,scrollStyle);
      return {code,map:null};
    }
  };
}
