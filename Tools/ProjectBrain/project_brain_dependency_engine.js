#!/usr/bin/env node
"use strict";

/*
 FriendshipTree Project Brain Phase 2
 Read-only dependency engine.
 - indexes files
 - resolves JavaScript/TypeScript imports and require()
 - resolves HTML script/style references
 - reads package.json dependencies and scripts
 - reads Capacitor configuration
 - reads Gradle project/module dependencies
 - reads PowerShell dot-sourcing, Import-Module, and common path invocations
 - preserves component ownership and file-state classification
 - writes schemaVersion 2 while retaining fields used by Studio 2.9.0
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { execFileSync } = require("child_process");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
function has(name) { return args.includes(name); }
function now() { return new Date().toISOString(); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function norm(p) { return p.split(path.sep).join("/"); }
function escapeCsv(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function sha256File(p, size) {
  if (size > 20 * 1024 * 1024) return null;
  try { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
  catch { return null; }
}

const root = path.resolve(arg("--project-root", "C:\\Users\\Joe\\FriendshipTree"));
const registrySource = path.resolve(arg("--registry", path.join(__dirname, "..", "component-registry")));
const quiet = has("--quiet");
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Project root not found: ${root}`);

const brainDir = path.join(root, ".studio", "project-brain");
const exportsDir = path.join(brainDir, "exports");
const registryTarget = path.join(brainDir, "component-registry");
ensureDir(exportsDir);
ensureDir(registryTarget);

for (const name of fs.readdirSync(registrySource)) {
  if (name.toLowerCase().endsWith(".json")) {
    fs.copyFileSync(path.join(registrySource, name), path.join(registryTarget, name));
  }
}

const excludedDirs = new Set([
  ".git", ".gradle", "node_modules", "build", "dist", "coverage",
  ".cleanup-audit", ".migration-v3"
]);
const generatedNames = new Set(["build","dist","coverage","out","generated builds","generated"]);
const archiveNames = new Set(["archive","quarantine"]);
const backupNames = new Set(["backup","backups"]);
const parseableExts = new Set([
  ".js",".jsx",".ts",".tsx",".mjs",".cjs",".json",".html",".htm",
  ".ps1",".psm1",".psd1",".cmd",".bat",".gradle",".kts",".java",
  ".kt",".xml",".properties"
]);
const jsExts = [".js",".jsx",".ts",".tsx",".mjs",".cjs",".json"];
const indexNames = jsExts.map(ext => `index${ext}`);

function classifyOwner(rel) {
  const s = norm(rel);
  if (/FriendshipTreeLauncher/i.test(s)) return "Launcher";
  if (/(^|\/)(FriendshipTreeStudio|StudioSystem)(\/|$)/i.test(s)) return "Studio";
  if (/Forge|delivery-pipeline|update-manager|PackageStaging/i.test(s)) return "Forge";
  if (/(^|\/)AI(\/|$)|SOURCE\/AI/i.test(s)) return "AI";
  if (/(^|\/)(Docs|Documentation)(\/|$)/i.test(s)) return "Documentation";
  if (/(^|\/)(src|public|android|Tests)(\/|$)|capacitor\.config|vite\.config/i.test(s)) return "App";
  if (/(^|\/)(Tools|Scripts)(\/|$)/i.test(s)) return "Tools";
  return "Unknown";
}
function stateFor(rel) {
  const parts = norm(rel).split("/").map(x => x.toLowerCase());
  if (parts.some(x => archiveNames.has(x))) return "archive";
  if (parts.some(x => backupNames.has(x))) return "backup";
  if (parts.some(x => generatedNames.has(x))) return "generated";
  return "active";
}

const files = [];
const fileByPath = new Map();
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, {withFileTypes:true}); }
  catch { return; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = norm(path.relative(root, full));
    if (full === brainDir || full.startsWith(brainDir + path.sep)) continue;
    if (ent.isDirectory() && excludedDirs.has(ent.name)) continue;
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    const row = {
      path: rel,
      parentPath: norm(path.dirname(rel)),
      name: ent.name,
      extension: ent.isFile() ? path.extname(ent.name).toLowerCase() : "",
      kind: ent.isDirectory() ? "directory" : "file",
      owner: classifyOwner(rel),
      state: stateFor(rel),
      sizeBytes: ent.isFile() ? stat.size : null,
      modifiedMs: stat.mtimeMs,
      sha256: ent.isFile() ? sha256File(full, stat.size) : null
    };
    files.push(row);
    if (ent.isFile()) fileByPath.set(rel.toLowerCase(), row);
    if (ent.isDirectory()) walk(full);
  }
}

function stripQueryHash(spec) { return spec.split(/[?#]/, 1)[0]; }
function candidatePaths(sourceRel, spec) {
  const clean = stripQueryHash(spec).replace(/\\/g, "/");
  if (!clean || /^(https?:|data:|node:|mailto:)/i.test(clean)) return [];
  const sourceDir = path.posix.dirname(norm(sourceRel));
  let base;
  if (clean.startsWith("/")) base = clean.slice(1);
  else if (clean.startsWith(".")) base = path.posix.normalize(path.posix.join(sourceDir, clean));
  else return [];

  const ext = path.posix.extname(base);
  const c = [base];
  if (!ext) {
    for (const e of jsExts) c.push(base + e);
    for (const i of indexNames) c.push(path.posix.join(base, i));
  }
  return [...new Set(c.map(norm))];
}
function resolveLocal(sourceRel, spec) {
  for (const c of candidatePaths(sourceRel, spec)) {
    const row = fileByPath.get(c.toLowerCase());
    if (row) return row.path;
  }
  return null;
}
function packageName(spec) {
  const clean = spec.replace(/^node:/, "");
  if (clean.startsWith("@")) return clean.split("/").slice(0,2).join("/");
  return clean.split("/")[0];
}
function lineNumberAt(text, index) {
  let n = 1;
  for (let i=0; i<index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
function addRelation(out, source, targetPath, targetOwner, relationType, specifier, evidence, lineNumber, resolution, parser) {
  out.push({
    sourcePath: source.path,
    sourceOwner: source.owner,
    targetPath: targetPath || null,
    targetOwner: targetOwner || (targetPath ? classifyOwner(targetPath) : "External"),
    relationType,
    specifier: specifier || null,
    lineNumber: lineNumber || null,
    evidence: String(evidence || "").trim().slice(0,500),
    resolution,
    parser
  });
}

function parseJavaScript(row, text, out) {
  const patterns = [
    {type:"imports", re:/\bimport\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g},
    {type:"dynamic-import", re:/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g},
    {type:"requires", re:/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g},
    {type:"re-exports", re:/\bexport\s+[^'"]*?\s+from\s+["']([^"']+)["']/g}
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(text))) {
      const spec = m[1];
      const line = lineNumberAt(text, m.index);
      if (spec.startsWith(".") || spec.startsWith("/")) {
        const resolved = resolveLocal(row.path, spec);
        addRelation(out, row, resolved, resolved ? classifyOwner(resolved) : "Unknown",
          p.type, spec, m[0], line, resolved ? "resolved-local" : "unresolved-local", "javascript");
      } else {
        addRelation(out, row, null, "External", "uses-package", packageName(spec), m[0], line, "external-package", "javascript");
      }
    }
  }
}

function parseHtml(row, text, out) {
  const patterns = [
    {type:"loads-script", re:/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi},
    {type:"loads-style", re:/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi},
    {type:"loads-resource", re:/<(?:img|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi}
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(text))) {
      const spec = m[1];
      const resolved = resolveLocal(row.path, spec);
      addRelation(out, row, resolved, resolved ? classifyOwner(resolved) : "Unknown",
        p.type, spec, m[0], lineNumberAt(text,m.index), resolved ? "resolved-local" : "unresolved-local", "html");
    }
  }
}

function parsePackageJson(row, text, out, metadata) {
  let pkg;
  try { pkg = JSON.parse(text.replace(/^\uFEFF/,"")); } catch { return; }
  const depGroups = ["dependencies","devDependencies","peerDependencies","optionalDependencies"];
  for (const group of depGroups) {
    for (const [name, version] of Object.entries(pkg[group] || {})) {
      addRelation(out, row, null, "External", `declares-${group}`, name, `${name}: ${version}`, null, "external-package", "package-json");
    }
  }
  for (const [name, command] of Object.entries(pkg.scripts || {})) {
    metadata.packageScripts.push({packagePath:row.path, name, command});
  }
  if (pkg.main) {
    const resolved = resolveLocal(row.path, "./" + pkg.main.replace(/^\.\//,""));
    addRelation(out, row, resolved, resolved ? classifyOwner(resolved) : "Unknown",
      "declares-main", pkg.main, pkg.main, null, resolved ? "resolved-local" : "unresolved-local", "package-json");
  }
}

function parsePowerShell(row, text, out) {
  const patterns = [
    {type:"dot-sources", re:/(?:^|\n)\s*\.\s+["']([^"']+\.(?:ps1|psm1))["']/gi},
    {type:"imports-module", re:/\bImport-Module\s+(?:-Name\s+)?["']?([^"'\s;]+)["']?/gi},
    {type:"invokes-script", re:/&\s*["']([^"']+\.(?:ps1|cmd|bat))["']/gi},
    {type:"references-path", re:/\bJoin-Path\s+[^\r\n]*?["']([^"']+\.(?:ps1|psm1|cmd|bat|js|json))["']/gi}
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(text))) {
      let spec = m[1];
      spec = spec.replace(/\$PSScriptRoot/gi, ".").replace(/\$here/gi, ".");
      const localish = spec.startsWith(".") || spec.includes("/") || spec.includes("\\");
      const resolved = localish ? resolveLocal(row.path, spec) : null;
      addRelation(out, row, resolved, resolved ? classifyOwner(resolved) : (localish ? "Unknown" : "External"),
        p.type, spec, m[0], lineNumberAt(text,m.index),
        resolved ? "resolved-local" : (localish ? "unresolved-local" : "external-module"), "powershell");
    }
  }
}

function parseGradle(row, text, out, metadata) {
  let m;
  const projectRe = /\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(\s*)?project\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = projectRe.exec(text))) {
    const moduleName = m[1].replace(/^:/,"");
    const candidates = [
      `android/${moduleName}/build.gradle`,
      `android/${moduleName}/build.gradle.kts`,
      `${moduleName}/build.gradle`,
      `${moduleName}/build.gradle.kts`
    ];
    const resolved = candidates.find(c => fileByPath.has(c.toLowerCase())) || null;
    addRelation(out,row,resolved,resolved?classifyOwner(resolved):"Unknown","depends-on-gradle-module",m[1],m[0],lineNumberAt(text,m.index),resolved?"resolved-local":"unresolved-local","gradle");
  }
  const extRe = /\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(\s*)?["']([^"']+:[^"']+:[^"']+)["']/g;
  while ((m = extRe.exec(text))) {
    addRelation(out,row,null,"External","uses-gradle-package",m[1],m[0],lineNumberAt(text,m.index),"external-package","gradle");
  }
  const includeRe = /\binclude\s+((?:["'][^"']+["']\s*,?\s*)+)/g;
  while ((m = includeRe.exec(text))) {
    const modules = [...m[1].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
    for (const module of modules) metadata.gradleModules.push({settingsPath:row.path,module});
  }
}

function parseCapacitor(row, text, out, metadata) {
  let cfg;
  try {
    if (row.extension === ".json") cfg = JSON.parse(text.replace(/^\uFEFF/,""));
    else {
      const appId = text.match(/\bappId\s*:\s*["']([^"']+)["']/);
      const webDir = text.match(/\bwebDir\s*:\s*["']([^"']+)["']/);
      cfg = {appId:appId?.[1],webDir:webDir?.[1]};
    }
  } catch { return; }
  metadata.capacitor.push({path:row.path, appId:cfg.appId||null, appName:cfg.appName||null, webDir:cfg.webDir||null});
  if (cfg.webDir) {
    const candidate = norm(cfg.webDir).replace(/^\.?\//,"");
    addRelation(out,row,candidate,classifyOwner(candidate),"produces-web-directory",cfg.webDir,cfg.webDir,null,"declared-path","capacitor");
  }
}

const startedAt = now();
if (!quiet) console.log("Indexing project files...");
walk(root);

const relationships = [];
const metadata = {packageScripts:[],gradleModules:[],capacitor:[],parserCounts:{}};
if (!quiet) console.log(`Indexed ${files.length.toLocaleString()} paths. Analysing dependencies...`);

for (const row of files) {
  if (row.kind !== "file" || !parseableExts.has(row.extension)) continue;
  let text;
  try { text = fs.readFileSync(path.join(root,row.path),"utf8"); } catch { continue; }
  const before = relationships.length;
  const lower = row.name.toLowerCase();
  if ([".js",".jsx",".ts",".tsx",".mjs",".cjs"].includes(row.extension)) parseJavaScript(row,text,relationships);
  if ([".html",".htm"].includes(row.extension)) parseHtml(row,text,relationships);
  if (lower === "package.json") parsePackageJson(row,text,relationships,metadata);
  if ([".ps1",".psm1",".psd1"].includes(row.extension)) parsePowerShell(row,text,relationships);
  if (row.extension === ".gradle" || row.extension === ".kts" || lower === "settings.gradle" || lower === "settings.gradle.kts") parseGradle(row,text,relationships,metadata);
  if (/^capacitor\.config\.(json|js|ts)$/i.test(row.name)) parseCapacitor(row,text,relationships,metadata);
  const added = relationships.length - before;
  if (added) metadata.parserCounts[row.extension] = (metadata.parserCounts[row.extension]||0)+added;
}

// Deduplicate exact findings.
const seen = new Set();
const deduped = [];
for (const r of relationships) {
  const key = [r.sourcePath,r.targetPath,r.targetOwner,r.relationType,r.specifier,r.lineNumber].join("\0");
  if (!seen.has(key)) { seen.add(key); deduped.push(r); }
}

const manifests = fs.readdirSync(registryTarget)
  .filter(x=>x.toLowerCase().endsWith(".json"))
  .map(x=>JSON.parse(fs.readFileSync(path.join(registryTarget,x),"utf8")));

const ownerCounts = {}, stateCounts = {}, resolutionCounts = {}, relationTypeCounts = {};
for (const row of files.filter(x=>x.kind==="file")) {
  ownerCounts[row.owner]=(ownerCounts[row.owner]||0)+1;
  stateCounts[row.state]=(stateCounts[row.state]||0)+1;
}
for (const r of deduped) {
  resolutionCounts[r.resolution]=(resolutionCounts[r.resolution]||0)+1;
  relationTypeCounts[r.relationType]=(relationTypeCounts[r.relationType]||0)+1;
}
const componentEdgesMap = new Map();
for (const r of deduped.filter(x=>x.targetOwner && x.targetOwner!=="External")) {
  const key = `${r.sourceOwner}\0${r.targetOwner}\0${r.relationType}`;
  componentEdgesMap.set(key,(componentEdgesMap.get(key)||0)+1);
}
const componentEdges = [...componentEdgesMap.entries()]
  .map(([key,count])=>{const [sourceOwner,targetOwner,relationType]=key.split("\0");return {sourceOwner,targetOwner,relationType,count};})
  .sort((a,b)=>b.count-a.count);

const scanId = Date.now();
const dbPath = path.join(brainDir,"project-brain.json");
if (fs.existsSync(dbPath)) {
  const backup = path.join(brainDir,`project-brain-schema1-backup-${scanId}.json`);
  try { fs.copyFileSync(dbPath,backup); } catch {}
}
const db = {
  schemaVersion: 2,
  storageFormat: "FriendshipTree Project Brain dependency graph",
  engineVersion: "2.0.0",
  scanId,
  startedAt,
  completedAt: now(),
  projectRoot: root,
  components: manifests,
  files,
  relationships: deduped,
  componentEdges,
  metadata
};
fs.writeFileSync(dbPath,JSON.stringify(db,null,2),"utf8");

const summary = {
  schemaVersion:2,
  engineVersion:"2.0.0",
  scanId,
  startedAt,
  completedAt:db.completedAt,
  projectRoot:root,
  database:dbPath,
  files:files.filter(x=>x.kind==="file").length,
  directories:files.filter(x=>x.kind==="directory").length,
  relationships:deduped.length,
  resolvedLocal:resolutionCounts["resolved-local"]||0,
  unresolvedLocal:resolutionCounts["unresolved-local"]||0,
  externalPackages:(resolutionCounts["external-package"]||0)+(resolutionCounts["external-module"]||0),
  filesByOwner:ownerCounts,
  filesByState:stateCounts,
  relationshipsByType:Object.entries(relationTypeCounts).map(([type,count])=>({type,count})).sort((a,b)=>b.count-a.count),
  componentEdges:componentEdges.slice(0,100),
  parserCounts:metadata.parserCounts
};
const summaryName=`dependency-summary-scan-${scanId}.json`;
fs.writeFileSync(path.join(exportsDir,summaryName),JSON.stringify(summary,null,2),"utf8");

const relationCsv=["source_path,source_owner,target_path,target_owner,relation_type,specifier,line_number,resolution,parser"];
for (const r of deduped) relationCsv.push([
  r.sourcePath,r.sourceOwner,r.targetPath||"",r.targetOwner,r.relationType,r.specifier||"",r.lineNumber||"",r.resolution,r.parser
].map(escapeCsv).join(","));
const relationCsvName=`file-dependencies-scan-${scanId}.csv`;
fs.writeFileSync(path.join(exportsDir,relationCsvName),relationCsv.join(os.EOL),"utf8");

const edgeCsv=["source_owner,target_owner,relation_type,count"];
for (const e of componentEdges) edgeCsv.push([e.sourceOwner,e.targetOwner,e.relationType,e.count].map(escapeCsv).join(","));
const edgeCsvName=`component-dependencies-scan-${scanId}.csv`;
fs.writeFileSync(path.join(exportsDir,edgeCsvName),edgeCsv.join(os.EOL),"utf8");

const unresolved = deduped.filter(x=>x.resolution==="unresolved-local");
const unresolvedCsv=["source_path,relation_type,specifier,line_number,parser,evidence"];
for (const r of unresolved) unresolvedCsv.push([r.sourcePath,r.relationType,r.specifier,r.lineNumber,r.parser,r.evidence].map(escapeCsv).join(","));
const unresolvedName=`unresolved-local-dependencies-scan-${scanId}.csv`;
fs.writeFileSync(path.join(exportsDir,unresolvedName),unresolvedCsv.join(os.EOL),"utf8");

const packageDir=path.join(exportsDir,`Project-Brain-Dependency-Scan-${scanId}`);
ensureDir(packageDir);
for (const name of [summaryName,relationCsvName,edgeCsvName,unresolvedName]) {
  fs.copyFileSync(path.join(exportsDir,name),path.join(packageDir,name));
}
const zipPath=path.join(exportsDir,`FriendshipTree-Project-Brain-Dependency-Scan-${scanId}.zip`);
try {
  const ps=`Compress-Archive -Path '${packageDir.replace(/'/g,"''")}\\*' -DestinationPath '${zipPath.replace(/'/g,"''")}' -Force`;
  execFileSync("powershell.exe",["-NoProfile","-Command",ps],{stdio:quiet?"ignore":"inherit"});
} catch {}

console.log("");
console.log("Project Brain Phase 2 dependency scan completed.");
console.log(`Files:              ${summary.files.toLocaleString()}`);
console.log(`Directories:        ${summary.directories.toLocaleString()}`);
console.log(`Dependencies:       ${summary.relationships.toLocaleString()}`);
console.log(`Resolved local:     ${summary.resolvedLocal.toLocaleString()}`);
console.log(`Unresolved local:   ${summary.unresolvedLocal.toLocaleString()}`);
console.log(`External packages:  ${summary.externalPackages.toLocaleString()}`);
console.log(`Database:           ${dbPath}`);
console.log(`Export:             ${zipPath}`);
