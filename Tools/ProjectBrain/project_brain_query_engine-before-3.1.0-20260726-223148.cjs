#!/usr/bin/env node
"use strict";

/*
 FriendshipTree Project Brain Phase 3 — Query Engine
 Read-only query layer over project-brain.json schema version 2.
 Supports CLI, JSON output and an optional localhost HTTP API.
*/

const fs = require("fs");
const path = require("path");
const http = require("http");
const readline = require("readline");

const argv = process.argv.slice(2);
function value(name, fallback=null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i+1] ? argv[i+1] : fallback;
}
function has(name) { return argv.includes(name); }
function normalise(p) { return String(p || "").replace(/\\/g,"/").replace(/^\.\//,""); }
function lower(p) { return normalise(p).toLowerCase(); }
function pretty(v) { return JSON.stringify(v, null, 2); }
function safeNumber(v) { const n=Number(v); return Number.isFinite(n)?n:0; }

const projectRoot = path.resolve(value("--project-root","C:\\Users\\Joe\\FriendshipTree"));
const databasePath = path.resolve(value("--database",path.join(projectRoot,".studio","project-brain","project-brain.json")));
const jsonMode = has("--json");
const command = argv.find(x => !x.startsWith("--") && x !== value("--project-root") && x !== value("--database") && x !== value("--port")) || "help";

function loadDatabase() {
  if (!fs.existsSync(databasePath)) throw new Error(`Project Brain database not found: ${databasePath}`);
  const db = JSON.parse(fs.readFileSync(databasePath,"utf8").replace(/^\uFEFF/,""));
  if (safeNumber(db.schemaVersion) < 2) throw new Error(`Schema version 2 or later is required. Found: ${db.schemaVersion ?? "unknown"}`);
  db.files = Array.isArray(db.files) ? db.files : [];
  db.relationships = Array.isArray(db.relationships) ? db.relationships : [];
  db.components = Array.isArray(db.components) ? db.components : [];
  return db;
}
const db = loadDatabase();

const fileRows = db.files.filter(x=>x && x.kind==="file");
const fileMap = new Map(fileRows.map(x=>[lower(x.path),x]));
const outgoing = new Map();
const incoming = new Map();
for (const r of db.relationships) {
  const s=lower(r.sourcePath), t=lower(r.targetPath);
  if (s) { if(!outgoing.has(s)) outgoing.set(s,[]); outgoing.get(s).push(r); }
  if (t) { if(!incoming.has(t)) incoming.set(t,[]); incoming.get(t).push(r); }
}

function resolveFile(query) {
  const q=lower(query);
  if (!q) return {match:null,candidates:[]};
  if (fileMap.has(q)) return {match:fileMap.get(q),candidates:[]};
  const candidates=fileRows.filter(f=>{
    const p=lower(f.path), n=String(f.name||"").toLowerCase();
    return p.endsWith("/"+q) || n===q || p.includes(q);
  }).slice(0,50);
  return {match:candidates.length===1?candidates[0]:null,candidates};
}
function relationSummary(list) {
  const byType={}, byOwner={}, byResolution={};
  for(const r of list){
    byType[r.relationType]=(byType[r.relationType]||0)+1;
    byOwner[r.targetOwner]=(byOwner[r.targetOwner]||0)+1;
    byResolution[r.resolution]=(byResolution[r.resolution]||0)+1;
  }
  return {count:list.length,byType,byOwner,byResolution};
}
function summary() {
  const owners={}, states={}, resolutions={}, types={};
  for(const f of fileRows){owners[f.owner]=(owners[f.owner]||0)+1;states[f.state]=(states[f.state]||0)+1;}
  for(const r of db.relationships){resolutions[r.resolution]=(resolutions[r.resolution]||0)+1;types[r.relationType]=(types[r.relationType]||0)+1;}
  return {
    schemaVersion:db.schemaVersion,
    engineVersion:db.engineVersion,
    scanId:db.scanId,
    completedAt:db.completedAt,
    projectRoot:db.projectRoot,
    files:fileRows.length,
    directories:db.files.filter(x=>x.kind==="directory").length,
    components:db.components.length,
    relationships:db.relationships.length,
    filesByOwner:owners,
    filesByState:states,
    relationshipsByResolution:resolutions,
    relationshipsByType:types
  };
}
function fileDetails(query) {
  const found=resolveFile(query);
  if(!found.match) return {ok:false,message:found.candidates.length?`Multiple files matched "${query}".`:`No file matched "${query}".`,candidates:found.candidates.map(x=>x.path)};
  const f=found.match, key=lower(f.path);
  const deps=outgoing.get(key)||[], users=incoming.get(key)||[];
  return {ok:true,file:f,dependencies:relationSummary(deps),dependents:relationSummary(users)};
}
function dependencies(query) {
  const found=resolveFile(query);
  if(!found.match) return {ok:false,message:found.candidates.length?`Multiple files matched "${query}".`:`No file matched "${query}".`,candidates:found.candidates.map(x=>x.path)};
  const list=(outgoing.get(lower(found.match.path))||[]).map(r=>({
    relationType:r.relationType,targetPath:r.targetPath,targetOwner:r.targetOwner,specifier:r.specifier,
    lineNumber:r.lineNumber,resolution:r.resolution,parser:r.parser
  }));
  return {ok:true,file:found.match.path,count:list.length,dependencies:list};
}
function dependents(query) {
  const found=resolveFile(query);
  if(!found.match) return {ok:false,message:found.candidates.length?`Multiple files matched "${query}".`:`No file matched "${query}".`,candidates:found.candidates.map(x=>x.path)};
  const list=(incoming.get(lower(found.match.path))||[]).map(r=>({
    relationType:r.relationType,sourcePath:r.sourcePath,sourceOwner:r.sourceOwner,specifier:r.specifier,
    lineNumber:r.lineNumber,resolution:r.resolution,parser:r.parser
  }));
  return {ok:true,file:found.match.path,count:list.length,dependents:list};
}
function unknown(limit=200) {
  return fileRows.filter(f=>(f.owner||"Unknown")==="Unknown")
    .sort((a,b)=>safeNumber(b.sizeBytes)-safeNumber(a.sizeBytes))
    .slice(0,limit)
    .map(f=>({path:f.path,state:f.state,sizeBytes:f.sizeBytes,extension:f.extension,modifiedMs:f.modifiedMs}));
}
function unresolved(limit=500) {
  return db.relationships.filter(r=>r.resolution==="unresolved-local").slice(0,limit).map(r=>({
    sourcePath:r.sourcePath,relationType:r.relationType,specifier:r.specifier,lineNumber:r.lineNumber,parser:r.parser,evidence:r.evidence
  }));
}
function orphans(limit=500) {
  const results=[];
  for(const f of fileRows){
    const k=lower(f.path);
    const indeg=(incoming.get(k)||[]).filter(r=>r.resolution==="resolved-local").length;
    const outdeg=(outgoing.get(k)||[]).filter(r=>r.resolution==="resolved-local").length;
    if(indeg===0 && outdeg===0) results.push({...f,incoming:0,outgoing:0});
  }
  return results.sort((a,b)=>safeNumber(b.sizeBytes)-safeNumber(a.sizeBytes)).slice(0,limit);
}
function component(name) {
  const q=String(name||"").toLowerCase();
  const files=fileRows.filter(f=>String(f.owner||"").toLowerCase()===q);
  const rels=db.relationships.filter(r=>String(r.sourceOwner||"").toLowerCase()===q || String(r.targetOwner||"").toLowerCase()===q);
  const edges={};
  for(const r of rels){
    const key=`${r.sourceOwner} -> ${r.targetOwner} (${r.relationType})`;
    edges[key]=(edges[key]||0)+1;
  }
  return {
    component:name,
    fileCount:files.length,
    activeFiles:files.filter(f=>f.state==="active").length,
    unknownStateFiles:files.filter(f=>!f.state).length,
    relationshipCount:rels.length,
    strongestEdges:Object.entries(edges).map(([edge,count])=>({edge,count})).sort((a,b)=>b.count-a.count).slice(0,30),
    largestFiles:files.sort((a,b)=>safeNumber(b.sizeBytes)-safeNumber(a.sizeBytes)).slice(0,50).map(f=>({path:f.path,sizeBytes:f.sizeBytes,state:f.state}))
  };
}
function search(term,limit=100) {
  const q=String(term||"").toLowerCase();
  if(!q) return [];
  const scored=[];
  for(const f of fileRows){
    const p=lower(f.path), n=String(f.name||"").toLowerCase();
    let score=0;
    if(n===q) score+=100;
    if(p.endsWith("/"+q)) score+=80;
    if(n.includes(q)) score+=40;
    if(p.includes(q)) score+=20;
    if(String(f.owner||"").toLowerCase()===q) score+=10;
    if(score) scored.push({score,path:f.path,owner:f.owner,state:f.state,sizeBytes:f.sizeBytes});
  }
  for(const r of db.relationships){
    const hay=[r.sourcePath,r.targetPath,r.specifier,r.relationType,r.evidence].join(" ").toLowerCase();
    if(hay.includes(q)) scored.push({score:8,relationship:r});
  }
  return scored.sort((a,b)=>b.score-a.score).slice(0,limit);
}
function health() {
  const unresolvedCount=db.relationships.filter(r=>r.resolution==="unresolved-local").length;
  const unknownCount=fileRows.filter(f=>(f.owner||"Unknown")==="Unknown").length;
  const active=fileRows.filter(f=>f.state==="active").length;
  const orphanCount=orphans(1000000).length;
  const local=db.relationships.filter(r=>r.resolution==="resolved-local" || r.resolution==="unresolved-local").length;
  const resolved=db.relationships.filter(r=>r.resolution==="resolved-local").length;
  const dependencyResolutionRate=local?Math.round((resolved/local)*1000)/10:100;
  const ownershipRate=fileRows.length?Math.round(((fileRows.length-unknownCount)/fileRows.length)*1000)/10:100;
  const orphanRate=fileRows.length?Math.round((orphanCount/fileRows.length)*1000)/10:0;
  const score=Math.max(0,Math.round((dependencyResolutionRate*0.45)+(ownershipRate*0.45)+((100-Math.min(100,orphanRate))*0.10)));
  return {
    score,
    dependencyResolutionRate,
    ownershipRate,
    orphanRate,
    unresolvedDependencies:unresolvedCount,
    unknownFiles:unknownCount,
    orphanFiles:orphanCount,
    activeFiles:active,
    notes:[
      "The score is diagnostic, not a guarantee that files are safe to move or delete.",
      "Orphans are files with no resolved local incoming or outgoing dependency in the current parser set.",
      "Unknown ownership and unresolved paths are the main current sources of uncertainty."
    ]
  };
}
function impact(query,depth=3) {
  const found=resolveFile(query);
  if(!found.match) return {ok:false,message:found.candidates.length?`Multiple files matched "${query}".`:`No file matched "${query}".`,candidates:found.candidates.map(x=>x.path)};
  const start=found.match.path, visited=new Set([lower(start)]), levels=[[start]];
  let frontier=[start];
  for(let d=1;d<=depth;d++){
    const next=[];
    for(const p of frontier){
      for(const r of incoming.get(lower(p))||[]){
        if(!r.sourcePath) continue;
        const k=lower(r.sourcePath);
        if(!visited.has(k)){visited.add(k);next.push(r.sourcePath);}
      }
    }
    if(!next.length) break;
    levels.push(next);
    frontier=next;
  }
  return {ok:true,file:start,depth:levels.length-1,totalAffected:visited.size-1,levels};
}
function changed() {
  const backups=fs.readdirSync(path.dirname(databasePath))
    .filter(x=>/^project-brain-schema1-backup-\d+\.json$/i.test(x))
    .sort().reverse();
  if(!backups.length) return {ok:false,message:"No previous Project Brain backup was found for comparison."};
  let prior;
  try {prior=JSON.parse(fs.readFileSync(path.join(path.dirname(databasePath),backups[0]),"utf8").replace(/^\uFEFF/,""));}catch(e){return {ok:false,message:e.message};}
  const oldMap=new Map((prior.files||[]).filter(x=>x.kind==="file").map(x=>[lower(x.path),x]));
  const currentMap=new Map(fileRows.map(x=>[lower(x.path),x]));
  const added=[],removed=[],modified=[];
  for(const [k,f] of currentMap){
    if(!oldMap.has(k)) added.push(f.path);
    else {
      const o=oldMap.get(k);
      if((f.sha256&&o.sha256&&f.sha256!==o.sha256) || (!f.sha256||!o.sha256) && safeNumber(f.modifiedMs)!==safeNumber(o.modifiedMs)) modified.push(f.path);
    }
  }
  for(const [k,f] of oldMap) if(!currentMap.has(k)) removed.push(f.path);
  return {ok:true,comparedWith:backups[0],added,removed,modified,counts:{added:added.length,removed:removed.length,modified:modified.length}};
}

function execute(name,args={}) {
  switch(String(name||"").toLowerCase()){
    case "summary": return summary();
    case "file": return fileDetails(args.query);
    case "dependencies": case "deps": return dependencies(args.query);
    case "dependents": case "used-by": return dependents(args.query);
    case "unknown": return unknown(safeNumber(args.limit)||200);
    case "unresolved": return unresolved(safeNumber(args.limit)||500);
    case "orphans": return orphans(safeNumber(args.limit)||500);
    case "component": return component(args.query);
    case "search": return search(args.query,safeNumber(args.limit)||100);
    case "health": return health();
    case "impact": return impact(args.query,safeNumber(args.depth)||3);
    case "changed": return changed();
    default: return {ok:false,message:`Unknown query: ${name}`};
  }
}
function printResult(result) {
  if(jsonMode){console.log(pretty(result));return;}
  if(typeof result==="string"){console.log(result);return;}
  console.log(pretty(result));
}
function help() {
  return `
FriendshipTree Project Brain Query Engine

Commands:
  summary
  file <path-or-name>
  deps <path-or-name>
  dependents <path-or-name>
  impact <path-or-name> [--depth 3]
  unknown [--limit 200]
  unresolved [--limit 500]
  orphans [--limit 500]
  component <owner>
  search <term> [--limit 100]
  health
  changed
  shell
  serve [--port 47831]

Examples:
  node project_brain_query_engine.js summary
  node project_brain_query_engine.js file renderer.js
  node project_brain_query_engine.js deps src/App.jsx
  node project_brain_query_engine.js impact main.js --depth 4
  node project_brain_query_engine.js component Studio
  node project_brain_query_engine.js search capacitor
  node project_brain_query_engine.js serve --port 47831
`;
}
function positionalAfter(cmd) {
  const i=argv.indexOf(cmd);
  if(i<0) return null;
  const vals=[];
  for(let j=i+1;j<argv.length;j++){
    if(argv[j].startsWith("--")) {j++; continue;}
    vals.push(argv[j]);
  }
  return vals.join(" ") || null;
}
async function shell() {
  console.log("Project Brain interactive shell. Type help or exit.");
  const rl=readline.createInterface({input:process.stdin,output:process.stdout,prompt:"brain> "});
  rl.prompt();
  rl.on("line",line=>{
    const parts=line.trim().match(/(?:[^\s"]+|"[^"]*")+/g)||[];
    const cmd=(parts.shift()||"").toLowerCase();
    const q=parts.join(" ").replace(/^"|"$/g,"");
    if(cmd==="exit"||cmd==="quit"){rl.close();return;}
    if(cmd==="help"){console.log(help());rl.prompt();return;}
    try{console.log(pretty(execute(cmd,{query:q})));}catch(e){console.error(e.message);}
    rl.prompt();
  });
}
function serve() {
  const port=safeNumber(value("--port","47831"))||47831;
  const server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,`http://127.0.0.1:${port}`);
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin","http://localhost");
      if(url.pathname==="/healthz"){res.end(JSON.stringify({ok:true,schemaVersion:db.schemaVersion,scanId:db.scanId}));return;}
      if(!url.pathname.startsWith("/api/")){res.statusCode=404;res.end(JSON.stringify({ok:false,message:"Not found"}));return;}
      const name=url.pathname.slice(5);
      const result=execute(name,{
        query:url.searchParams.get("q"),
        limit:url.searchParams.get("limit"),
        depth:url.searchParams.get("depth")
      });
      res.end(JSON.stringify(result));
    }catch(e){res.statusCode=500;res.end(JSON.stringify({ok:false,message:e.message}));}
  });
  server.listen(port,"127.0.0.1",()=> {
    console.log(`Project Brain Query API running at http://127.0.0.1:${port}`);
    console.log("Press Ctrl+C to stop.");
  });
}

if(command==="help"||has("--help")) console.log(help());
else if(command==="shell") shell();
else if(command==="serve") serve();
else {
  const q=positionalAfter(command);
  printResult(execute(command,{
    query:q,
    limit:value("--limit"),
    depth:value("--depth")
  }));
}
