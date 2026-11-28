// Shared semantic appearance tokens. Existing relationship and dimension colours are not changed.
export const ROLES = [
  ["background","Background"],["frame","Frame"],["surface","Surface"],["grid","Grid lines / borders"],
  ["text","Primary text"],["muted","Secondary text"],["accent","Accent"],
  ["routine","Routine"],["work","Work"],["social","Social"],["health","Health"]
];
const keys=ROLES.map(([key])=>key);
const tokens=values=>Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
const preset=(name,dark,light)=>({name,dark:tokens(dark.split(" ")),light:tokens(light.split(" "))});
export const PRESETS={
  botanical:preset("Botanical","#101B17 #1B2C24 #283C32 #30443A #E8F0E9 #96ADA0 #88C7A3 #A8C6A2 #83B4B9 #CCAD88 #A6A1C4","#F5F7F4 #E5EEE7 #FFFFFF #D3E0D5 #18251F #52645A #34785A #A8C6A2 #83B4B9 #CCAD88 #A6A1C4"),
  nordic:preset("Nordic","#141C25 #202D3A #2C3C4B #344453 #E8EEF5 #98AABB #86B1C7 #9CB6AB #86B1C7 #C8B7A5 #A5A8CA","#F4F7FA #E3EAF1 #FFFFFF #CBD7E1 #182A3A #53677A #3A718D #9CB6AB #86B1C7 #C8B7A5 #A5A8CA"),
  pastel:preset("Pastel","#1C1925 #292637 #373347 #403B4E #F2EDF7 #B0A7BD #CBB4E8 #B9DCC5 #BBCFEF #F2D5AE #E3C1E4","#F9F5FC #EDE5F5 #FFFFFF #DDD3E8 #30253C #685B75 #765398 #B9DCC5 #BBCFEF #F2D5AE #E3C1E4"),
  jewel:preset("Jewel","#0C1622 #152638 #20354B #2A4055 #ECF4FA #94ACC1 #39C4A1 #36AC88 #4D93DB #D4A34B #9774D1","#F2F7FA #E1EAF0 #FFFFFF #CBD9E4 #12283A #48647B #08775C #36AC88 #4D93DB #D4A34B #9774D1"),
  earth:preset("Earth","#211D18 #302A23 #40382D #494034 #F3ECE1 #BAAD98 #BDA36B #889D72 #73918D #BE886D #A58B9E","#FAF6EF #EEE5D6 #FFFFFF #DED1BD #30261B #6D5D49 #806237 #889D72 #73918D #BE886D #A58B9E"),
  vibrant:preset("Vibrant","#101722 #1B2738 #26354A #344257 #F4F7FC #A3B1C5 #39DB98 #39DB98 #459FFF #FFCD55 #BA8DFF","#F5F8FC #E4ECF7 #FFFFFF #D0DAE8 #15243A #50627B #087A50 #39DB98 #459FFF #FFCD55 #BA8DFF")
};
const legacy=preset("Current appearance","#0F172A #1E293B #1E293B #334155 #E2E8F0 #94A3B8 #10B981 #83B69A #86B1C7 #CCAD88 #A6A1C4","#F8FAFC #FFFFFF #FFFFFF #E2E8F0 #1E293B #64748B #047857 #83B69A #86B1C7 #CCAD88 #A6A1C4");
const hex=v=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
function cleanTokens(input,base){return Object.fromEntries(keys.map(k=>[k,hex(input?.[k])?input[k]:base[k]]));}
export function normalizeAppearance(raw){
  const custom=Array.isArray(raw?.custom)?raw.custom.filter(x=>x&&typeof x.id==="string"&&x.id.startsWith("custom-")&&typeof x.name==="string").slice(0,30).map(x=>({id:x.id,name:x.name.trim().slice(0,48)||"Custom palette",dark:cleanTokens(x.dark,PRESETS.botanical.dark),light:cleanTokens(x.light,PRESETS.botanical.light)})):[];
  const selected=typeof raw?.selected==="string"&&(Object.hasOwn(PRESETS,raw.selected)||custom.some(x=>x.id===raw.selected))?raw.selected:"legacy";
  return {selected,custom};
}
export function resolvePalette(raw,darkMode){
  const a=normalizeAppearance(raw);
  const p=Object.hasOwn(PRESETS,a.selected)?PRESETS[a.selected]:a.custom.find(x=>x.id===a.selected)||legacy;
  return {...p[darkMode?"dark":"light"]};
}
export function contrastRatio(a,b){
  function luminance(c){if(!hex(c))return 0;const [r,g,b]=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;}
  const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export const onColour=c=>contrastRatio(c,"#101820")>=contrastRatio(c,"#FFFFFF")?"#101820":"#FFFFFF";
