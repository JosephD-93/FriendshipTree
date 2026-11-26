// Pure three-way merge for complete JSON record collections with stable IDs.
// base=null explicitly means first sync, never a failed remote read.
// A missing record is a deletion only relative to a confirmed common base.
// On ANY conflict, records=null: do not apply or publish a partial result.
// This module is deliberately not wired to live app state or Google Drive yet.
// Callers must validate snapshot schema, completeness, account and base identity,
// coordinate cross-collection transactions, and preserve collection ordering if significant.
function equalJson(a,b){
  if(a===b)return true;
  if(a===null||b===null||typeof a!=="object"||typeof b!=="object")return false;
  if(Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((value,i)=>equalJson(value,b[i]));
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
  return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&equalJson(a[key],b[key]));
}

function indexRecords(records,label){
  if(!Array.isArray(records))throw new TypeError(`${label}: expected a complete record array`);
  const index=new Map();
  for(const record of records){
    if(!record||typeof record!=="object"||Array.isArray(record))throw new TypeError(`${label}: invalid record`);
    const id=record.id;
    if(!(typeof id==="string"&&id.trim().length>0)&&!Number.isSafeInteger(id))throw new TypeError(`${label}: invalid record ID`);
    const key=String(id);
    if(index.has(key))throw new TypeError(`${label}: duplicate record ID ${key}`);
    index.set(key,record);
  }
  return index;
}

export function mergeRecords({base,local,remote}){
  const bi=indexRecords(base===null?[]:base,"base"),li=indexRecords(local,"local"),ri=indexRecords(remote,"remote");
  const ids=new Set([...li.keys(),...ri.keys(),...bi.keys()]);
  const merged=[],conflicts=[];
  for(const id of ids){
    const b=bi.get(id)??null,l=li.get(id)??null,r=ri.get(id)??null;
    let chosen;
    if(equalJson(l,r))chosen=l;
    else if(equalJson(l,b))chosen=r;
    else if(equalJson(r,b))chosen=l;
    else{conflicts.push({id,base:b,local:l,remote:r});continue;}
    if(chosen!==null)merged.push(chosen);
  }
  const clone=value=>JSON.parse(JSON.stringify(value));
  return conflicts.length?{ok:false,records:null,conflicts:clone(conflicts)}:{ok:true,records:clone(merged),conflicts:[]};
}
