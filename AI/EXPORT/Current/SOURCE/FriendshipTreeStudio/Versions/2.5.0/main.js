
const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

const PROJECT = 'C:\\Users\\Joe\\FriendshipTree';
const STUDIO = path.join(PROJECT, 'FriendshipTreeStudio');
const DRIVE = 'G:\\My Drive\\FriendshipTree';
const STUDIO_DATA = path.join(PROJECT, '.studio');
const REPORTS = path.join(STUDIO_DATA, 'Reports');
const QUARANTINE = path.join(STUDIO_DATA, 'Quarantine');
const BACKUPS = path.join(STUDIO_DATA, 'Backups');
const MANIFEST = path.join(STUDIO_DATA, 'project-manifest.json');
const TRANSACTIONS = path.join(STUDIO_DATA, 'Transactions');
const PACKAGE_STAGING = path.join(STUDIO_DATA, 'PackageStaging');
const PACKAGE_HISTORY = path.join(STUDIO_DATA, 'PackageHistory');
const ELECTRON_DATA = path.join(STUDIO_DATA, 'ElectronData');
const ELECTRON_CACHE = path.join(ELECTRON_DATA, 'Cache');
const KNOWLEDGE = path.join(STUDIO_DATA, 'Knowledge');
const MANIFEST_HISTORY = path.join(KNOWLEDGE, 'ManifestHistory');
const PROJECT_DB = path.join(KNOWLEDGE, 'project-database.json');
const PROJECT_RULES = path.join(KNOWLEDGE, 'project-rules.json');
const PROJECT_DNA = path.join(KNOWLEDGE, 'project-dna.json');
const ARCHITECTURE_MD = path.join(KNOWLEDGE, 'Architecture.md');
const AI_CONTEXT_MD = path.join(KNOWLEDGE, 'FriendshipTree_AI_Context.md');
const AI_PACKAGES = path.join(KNOWLEDGE, 'AI Packages');

// Keep Chromium/Electron cache in Studio's own writable data folder. This avoids
// Windows cache permission errors caused by stale or shared AppData cache folders.
fs.mkdirSync(ELECTRON_CACHE, { recursive: true });
app.setPath('userData', ELECTRON_DATA);
app.setPath('sessionData', ELECTRON_CACHE);
app.commandLine.appendSwitch('disk-cache-dir', ELECTRON_CACHE);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');


let launchPackagePath = null;

function detectLaunchPackagePath(argv = process.argv) {
  for (const raw of argv.slice(1)) {
    const candidate = String(raw || '').replace(/^\"|\"$/g, '');
    if (/\.(ftupdate|zip)$/i.test(candidate) && fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return null;
}

let sessionId = null;
let sequence = 0;
let sessionFile = null;

function ensureDirs() {
  [STUDIO_DATA, REPORTS, QUARANTINE, BACKUPS, TRANSACTIONS, PACKAGE_STAGING, PACKAGE_HISTORY, ELECTRON_DATA, ELECTRON_CACHE, KNOWLEDGE, MANIFEST_HISTORY, AI_PACKAGES].forEach(p => fs.mkdirSync(p, { recursive: true }));
}

function nowStamp() {
  return new Date().toISOString();
}

function safeName(s) {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function startSession() {
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  sessionId = `S-${stamp}-${crypto.randomBytes(3).toString('hex')}`;
  sessionFile = path.join(REPORTS, `${sessionId}.jsonl`);
  sequence = 0;
  logEvent('session.start', 'success', {
    studioVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    project: PROJECT
  });
  writeEnvironmentReport();
}

function redact(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/ig, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/ig, 'Bearer [REDACTED]');
}

function logEvent(action, status, data = {}) {
  ensureDirs();
  if (!sessionId) {
    sessionId = `S-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
    sessionFile = path.join(REPORTS, `${sessionId}.jsonl`);
  }
  const clean = {};
  for (const [k, v] of Object.entries(data)) clean[k] = redact(v);
  const event = {
    ts: nowStamp(),
    session: sessionId,
    seq: ++sequence,
    action,
    status,
    ...clean
  };
  fs.appendFileSync(sessionFile, JSON.stringify(event) + '\n', 'utf8');
  return event;
}

function writeEnvironmentReport() {
  try {
    const tools = toolPaths();
    const env = {
      ts: nowStamp(),
      studioVersion: app.getVersion(),
      node: process.version,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      project: PROJECT,
      studio: STUDIO,
      drive: DRIVE,
      adb: tools.adb,
      java: tools.java
    };
    fs.writeFileSync(path.join(REPORTS, `${sessionId}-environment.json`), JSON.stringify(env, null, 2), 'utf8');
  } catch (err) {
    logEvent('environment.write', 'error', { error: err.message });
  }
}

function signalBootstrapReady() {
  const readyFile = process.env.FT_STUDIO_READY_FILE;
  if (!readyFile) return;
  try {
    fs.writeFileSync(readyFile, JSON.stringify({
      ready: true,
      pid: process.pid,
      version: app.getVersion(),
      time: new Date().toISOString()
    }), 'utf8');
  } catch (error) {
    console.error('Could not signal bootstrap readiness:', error);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#111713',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
  // Keep the Electron window invisible until its UI is ready, preventing a blank flash.
  win.once('ready-to-show', () => {
    signalBootstrapReady();
    win.show();
    win.focus();
  });
}


function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function pathSize(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    total += pathSize(path.join(target, entry.name));
  }
  return total;
}

function walkForHash(dir, depth = 0, found = []) {
  if (!exists(dir) || depth > 40) return found;
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkForHash(full, depth + 1, found);
    else found.push(full);
  }
  return found;
}

function sha256Path(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return sha256(target);
  const hash = crypto.createHash('sha256');
  // Hash verification must not use the project scanner. The project scanner
  // deliberately excludes .studio, which is exactly where quarantine lives.
  const files = walkForHash(target).sort((a, b) =>
    path.relative(target, a).localeCompare(path.relative(target, b))
  );
  for (const file of files) {
    const rel = path.relative(target, file).replace(/\\/g, '/');
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function findExecutable(candidates) {
  return candidates.find(exists) || null;
}

function toolPaths() {
  const local = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';

  const adb = findExecutable([
    androidHome && path.join(androidHome, 'platform-tools', 'adb.exe'),
    path.join(local, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    path.join(PROJECT, 'tools', 'platform-tools', 'adb.exe')
  ].filter(Boolean));

  const java = findExecutable([
    path.join(programFiles, 'Android', 'Android Studio', 'jbr', 'bin', 'java.exe'),
    path.join(programFiles, 'Android', 'Android Studio', 'jre', 'bin', 'java.exe'),
    process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, 'bin', 'java.exe')
  ].filter(Boolean));

  return { adb, java };
}

function run(command, args, cwd, sender, actionName) {
  logEvent(actionName || 'command.run', 'started', { command, args: args.join(' '), cwd });
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => {
      const text = d.toString();
      stdout += text;
      sender.send('log', text);
    });
    child.stderr.on('data', d => {
      const text = d.toString();
      stderr += text;
      sender.send('log', text);
    });
    child.on('error', err => {
      logEvent(actionName || 'command.run', 'error', {
        command, cwd, error: err.message, duration_ms: Date.now() - started
      });
      sender.send('log', `ERROR: ${err.message}\n`);
      resolve({ ok: false, code: -1, message: err.message });
    });
    child.on('close', code => {
      logEvent(actionName || 'command.run', code === 0 ? 'success' : 'error', {
        command,
        cwd,
        exit_code: code,
        duration_ms: Date.now() - started,
        stdout_tail: stdout.slice(-4000),
        stderr_tail: stderr.slice(-4000)
      });
      resolve({ ok: code === 0, code });
    });
  });
}

function inventory() {
  const tools = toolPaths();
  return {
    project: exists(PROJECT),
    studio: exists(STUDIO),
    drive: exists(DRIVE),
    incoming: exists(path.join(DRIVE, 'Incoming Updates')),
    installed: exists(path.join(DRIVE, 'Installed Updates')),
    failed: exists(path.join(DRIVE, 'Failed Updates')),
    adb: tools.adb,
    java: tools.java,
    packageJson: exists(path.join(STUDIO, 'package.json')),
    reports: REPORTS,
    quarantine: QUARANTINE
  };
}

function expectedFiles() {
  return [
    { name: 'FriendshipTree-PackageManager.ps1', target: path.join(PROJECT, 'FriendshipTree-PackageManager.ps1') },
    { name: 'FriendshipTree-Doctor.ps1', target: path.join(PROJECT, 'Tools', 'FriendshipTree-Doctor.ps1') },
    { name: 'START FRIENDSHIPTREE STUDIO.bat', target: path.join(PROJECT, 'START FRIENDSHIPTREE STUDIO.bat') },
    { name: 'INSTALL FRIENDSHIPTREE STUDIO.bat', target: path.join(PROJECT, 'INSTALL FRIENDSHIPTREE STUDIO.bat') }
  ];
}

const SKIP_PATHS = [
  'node_modules', '.git', '.gradle', 'dist', 'build', '.studio',
  'studiosystem',
  '.update-manager', '.friendshiptree', 'friendshiptreestudio',
  'android/build', 'android/app/build', 'android/app/src/main/assets/public'
];

function normalizedProjectRelative(target) {
  return path.relative(PROJECT, target).replace(/\\/g, '/').toLowerCase();
}

function shouldSkipProjectPath(target) {
  const rel = normalizedProjectRelative(target);
  return SKIP_PATHS.some(skip => rel === skip || rel.startsWith(skip + '/'));
}

function walk(dir, maxDepth = 6, depth = 0, found = []) {
  if (!exists(dir) || depth > maxDepth) return found;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return found; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (shouldSkipProjectPath(full)) continue;
    if (entry.isDirectory()) walk(full, maxDepth, depth + 1, found);
    else found.push(full);
  }
  return found;
}

function scanMisplaced() {
  const results = [];
  const protectedRootNames = new Set([
    'src','public','android','node_modules','friendshiptreestudio','.git','.studio',
    '.friendshiptree','.update-manager','package.json','package-lock.json',
    'vite.config.js','vite.config.ts','capacitor.config.json','capacitor.config.ts',
    'index.html','gradlew','gradlew.bat','settings.gradle','build.gradle'
  ]);

  const add = (entry, folder, reason, confidence = 0.9, details = []) => {
    const source = path.join(PROJECT, entry.name);
    const target = path.join(PROJECT, folder, entry.name);
    if (path.normalize(source).toLowerCase() === path.normalize(target).toLowerCase()) return;
    results.push({
      name: entry.name,
      source,
      target,
      destination: projectRelative(target),
      reason,
      confidence,
      isDirectory: entry.isDirectory(),
      details
    });
  };

  let entries = [];
  try { entries = fs.readdirSync(PROJECT, { withFileTypes: true }); } catch { return results; }

  for (const entry of entries) {
    const lower = entry.name.toLowerCase();
    if (protectedRootNames.has(lower)) continue;
    if (lower.startsWith('documentation') || lower.startsWith('reports') || lower.startsWith('releases') || lower.startsWith('assets') || lower.startsWith('archives')) continue;

    if (/^friendshiptree[_ -]studio[_ -]v\d+/i.test(entry.name)) {
      add(entry, 'Archives/Studio Releases', 'old_studio_release', 0.99,
        ['An extracted or packaged older Studio release.', 'The live installation is FriendshipTreeStudio.']);
      continue;
    }
    if (/^friendshiptree[_ -]update[_ -]manager/i.test(entry.name) || /^ft_v\d+/i.test(entry.name)) {
      add(entry, 'Archives/Update Manager', 'old_update_manager', 0.96,
        ['An older Update Manager package or extracted folder.', 'It is not used by the current app build.']);
      continue;
    }
    if (/friendshiptree-studio-report|diagnostic|project-analysis|package_json_report|tool_versions|summary/i.test(entry.name)) {
      add(entry, 'Reports', 'report_or_diagnostic', 0.94,
        ['A generated report or diagnostic output.', 'Keeping reports outside the project root makes the active project easier to read.']);
      continue;
    }
    if (/^(readme|handbook|roadmap|change.?log|phase-|architecture|development|repair_notes)/i.test(entry.name) || /\.(md|txt|pdf|docx)$/i.test(entry.name)) {
      add(entry, 'Documentation', 'project_documentation', 0.82,
        ['Documentation is useful but does not need to sit loose in the project root.']);
      continue;
    }
    if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(entry.name)) {
      add(entry, 'Assets/Reference Images', 'loose_reference_image', 0.91,
        ['A loose image asset or design reference in the project root.', 'It is not part of src or public.']);
      continue;
    }
    if (/lottie|animation_pack/i.test(entry.name)) {
      add(entry, 'Assets/Animation Packs', 'animation_asset_pack', 0.92,
        ['A loose animation or Lottie pack.', 'Moving it does not change app imports unless it is referenced by absolute root path.']);
      continue;
    }
    if (/\.(zip|apk|aab)$/i.test(entry.name)) {
      add(entry, 'Releases', 'loose_package', 0.86,
        ['A packaged archive or app build stored loose in the project root.']);
      continue;
    }
    if (/\s\(\d+\)(\.[^.]+)?$/i.test(entry.name)) {
      add(entry, 'Archives/Duplicate Downloads', 'duplicate_download_name', 0.78,
        ['The filename has the duplicate-download pattern “(1)”, “(2)”, and so on.', 'Review before moving if this is a required configuration file.']);
      continue;
    }
    if (/^file_0+|^_studio_build$/i.test(entry.name)) {
      add(entry, 'Archives/Unsorted Imports', 'opaque_or_build_artifact', 0.88,
        ['An opaque downloaded file or temporary Studio build folder.']);
      continue;
    }
  }

  return results.sort((a, b) => {
    const da = path.dirname(a.destination || '');
    const db = path.dirname(b.destination || '');
    return da.localeCompare(db, undefined, { numeric: true, sensitivity: 'base' }) ||
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function getAgeDays(date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function siblingCandidates(file, files) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const stem = path.basename(file, ext)
    .replace(/\s\(\d+\)$/i, '')
    .replace(/([_\-\s])(old|backup|copy|final\d*|fixed\d*)$/i, '')
    .toLowerCase();

  return files.filter(other => {
    if (other === file || path.dirname(other) !== dir) return false;
    if (path.extname(other).toLowerCase() !== ext) return false;
    const otherStem = path.basename(other, ext)
      .replace(/\s\(\d+\)$/i, '')
      .replace(/([_\-\s])(old|backup|copy|final\d*|fixed\d*)$/i, '')
      .toLowerCase();
    return stem === otherStem;
  });
}

function buildCleanerExplanation(file, files, refs) {
  const base = path.basename(file);
  const lower = base.toLowerCase();
  const stat = fs.statSync(file);
  const ageDays = getAgeDays(stat.mtime);
  const referenceCount = (refs.get(file) || []).length;
  const siblings = siblingCandidates(file, files);
  const reasons = [];
  const cautions = [];
  let score = 0;
  let category = 'Review';
  let reasonCode = null;

  if (/\.(tmp|temp)$/i.test(base)) {
    reasons.push('The extension identifies this as a temporary file.');
    score += 55;
    reasonCode = 'temporary_file';
  }

  if (/\.log$/i.test(base)) {
    reasons.push('This is a log file rather than project source code.');
    score += 45;
    reasonCode = reasonCode || 'log_file';
  }

  if (/\.(bak|old)$/i.test(base)) {
    reasons.push('The extension explicitly marks this as a backup or old copy.');
    score += 50;
    reasonCode = reasonCode || 'explicit_backup';
  }

  if (/\s\(\d+\)(\.[^.]+)?$/i.test(base)) {
    reasons.push('The filename matches the pattern commonly created by duplicate downloads.');
    score += 38;
    reasonCode = reasonCode || 'duplicate_download_name';
  }

  if (/(^|[_\-\s])(old|backup|copy|final2|final3|fixed2|fixed3)([_\-\s.]|$)/i.test(base)) {
    reasons.push('The filename contains a development-leftover marker such as old, backup, copy or fixed2.');
    score += 32;
    reasonCode = reasonCode || 'development_leftover_name';
  }

  if (lower.endsWith('.apk') &&
      !path.normalize(file).toLowerCase().includes(
        path.normalize(path.join('android', 'app', 'build', 'outputs', 'apk')).toLowerCase()
      )) {
    reasons.push('This APK is outside Android’s active build-output folder.');
    score += 42;
    reasonCode = reasonCode || 'old_apk';
  }

  if (referenceCount === 0) {
    reasons.push('No direct filename references were found in indexed source files.');
    score += 14;
  } else {
    cautions.push(`Referenced by ${referenceCount} indexed source file${referenceCount === 1 ? '' : 's'}.`);
    score -= 35;
  }

  if (siblings.length > 0) {
    reasons.push(`A similarly named file exists in the same folder: ${siblings.map(s => path.basename(s)).join(', ')}.`);
    score += 12;
  }

  if (ageDays > 365) {
    reasons.push(`The file has not been modified for ${ageDays} days.`);
    score += 10;
  } else if (ageDays < 14) {
    cautions.push(`The file was modified recently (${ageDays} day${ageDays === 1 ? '' : 's'} ago).`);
    score -= 10;
  }

  const criticalNames = new Set([
    'package.json', 'package-lock.json', 'vite.config.js', 'vite.config.ts',
    'capacitor.config.json', 'capacitor.config.ts', 'settings.gradle',
    'build.gradle', 'gradlew.bat', 'androidmanifest.xml', 'app.jsx', 'main.jsx'
  ]);

  if (criticalNames.has(lower)) {
    cautions.push('This filename is commonly required for building or running the project.');
    score -= 80;
  }

  const rel = path.relative(PROJECT, file).replace(/\\/g, '/').toLowerCase();
  if (rel.startsWith('android/app/src/main/') || rel.startsWith('src/')) {
    cautions.push('This file sits inside an active source-code or Android application folder.');
    score -= 18;
  }

  score = Math.max(0, Math.min(99, score));
  if (score >= 80 && referenceCount === 0) category = 'Safe';
  else category = 'Review';

  return {
    reasonCode,
    confidence: score / 100,
    category,
    reasons,
    cautions,
    referenceCount,
    similarFiles: siblings.map(s => path.relative(PROJECT, s)),
    ageDays
  };
}


function scanReferences(files) {
  const references = new Map(files.map(file => [file, []]));
  const searchable = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.html','.css','.xml','.gradle','.properties','.md','.txt','.ps1','.bat','.cmd'].includes(ext);
  });

  const byBasename = new Map();
  for (const file of files) {
    const name = path.basename(file).toLowerCase();
    if (!byBasename.has(name)) byBasename.set(name, []);
    byBasename.get(name).push(file);
  }

  for (const source of searchable) {
    let content;
    try {
      const stat = fs.statSync(source);
      if (stat.size > 2 * 1024 * 1024) continue;
      content = fs.readFileSync(source, 'utf8').toLowerCase();
    } catch { continue; }

    for (const [name, targets] of byBasename.entries()) {
      if (!name || source === targets[0]) continue;
      if (!content.includes(name)) continue;
      for (const target of targets) {
        if (target !== source) references.get(target).push(source);
      }
    }
  }
  return references;
}

function scanCleaner() {
  const files = walk(PROJECT, 7);
  const refs = scanReferences(files);
  const results = [];

  // FriendshipTree-specific housekeeping rule: extracted Studio release folders
  // (V0.x, V1.x and later) are installer artefacts, not the live FriendshipTreeStudio folder.
  for (const entry of fs.readdirSync(PROJECT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^FriendshipTree_Studio_V\d+_\d+(?:_\d+)?$/i.test(entry.name)) continue;
    const source = path.join(PROJECT, entry.name);
    const stat = fs.statSync(source);
    const versionLabel = entry.name.replace(/^FriendshipTree_Studio_/i, '').replace(/_/g, '.');
    results.push({
      name: entry.name,
      source,
      size: pathSize(source),
      modified: stat.mtime.toISOString(),
      reason: 'obsolete_studio_release_folder',
      confidence: 0.99,
      category: 'Safe',
      explanation: [
        `This is an extracted installer folder for FriendshipTree Studio ${versionLabel}.`,
        'The live Studio installation is the separate FriendshipTreeStudio folder.',
        'Moving this extracted release folder does not alter the FriendshipTree app source, Android project, or current Studio installation.'
      ],
      cautions: ['Its contents will be moved to reversible Studio quarantine, not permanently deleted.'],
      referenceCount: 0,
      similarFiles: [],
      ageDays: getAgeDays(stat.mtime),
      isDirectory: true
    });
  }

  // Superseded Studio installer ZIPs can also be tidied. Keep the newest one visible for recovery.
  const studioZips = fs.readdirSync(PROJECT, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^FriendshipTree_Studio_V\d+_\d+(?:_\d+)?(?:\(\d+\))?\.zip$/i.test(entry.name))
    .map(entry => {
      const match = entry.name.match(/^FriendshipTree_Studio_V(\d+)_(\d+)(?:_(\d+))?/i);
      return { entry, version: match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : [0,0,0] };
    })
    .sort((a,b) => b.version[0]-a.version[0] || b.version[1]-a.version[1] || b.version[2]-a.version[2]);
  for (const item of studioZips.slice(1)) {
    const source = path.join(PROJECT, item.entry.name);
    const stat = fs.statSync(source);
    results.push({
      name: item.entry.name,
      source,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      reason: 'superseded_studio_installer_zip',
      confidence: 0.96,
      category: 'Safe',
      explanation: [
        'This is an older FriendshipTree Studio installer ZIP.',
        `The newest installer ZIP detected is ${studioZips[0].entry.name}.`,
        'The installed Studio runs from the FriendshipTreeStudio folder, not from this ZIP.'
      ],
      cautions: ['The newest Studio installer ZIP is intentionally kept outside quarantine.'],
      referenceCount: 0,
      similarFiles: studioZips.map(value => value.entry.name),
      ageDays: getAgeDays(stat.mtime),
      isDirectory: false
    });
  }

  for (const file of files) {
    const explanation = buildCleanerExplanation(file, files, refs);
    if (!explanation.reasonCode || explanation.confidence < 0.30) continue;

    const stat = fs.statSync(file);
    results.push({
      name: path.basename(file),
      source: file,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      reason: explanation.reasonCode,
      confidence: explanation.confidence,
      category: explanation.category,
      explanation: explanation.reasons,
      cautions: explanation.cautions,
      referenceCount: explanation.referenceCount,
      similarFiles: explanation.similarFiles,
      ageDays: explanation.ageDays,
      isDirectory: false
    });
  }

  return results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.source.localeCompare(b.source);
  });
}

function copyRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function backupTarget(target) {
  if (!exists(target)) return null;
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(BACKUPS, stamp);
  fs.mkdirSync(backupRoot, { recursive: true });
  const backup = path.join(backupRoot, path.basename(target));
  if (fs.statSync(target).isDirectory()) copyRecursive(target, backup);
  else fs.copyFileSync(target, backup);
  return backup;
}

function uniqueDestination(dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  let candidate = path.join(dir, name);
  if (!exists(candidate)) return candidate;
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  let i = 2;
  while (exists(candidate)) {
    candidate = path.join(dir, `${stem}_${i}${ext}`);
    i++;
  }
  return candidate;
}


function classifyFile(filePath) {
  const rel = path.relative(PROJECT, filePath).replace(/\\/g, '/');
  const lower = rel.toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (lower.startsWith('android/')) return { category:'Android', module:'Android', generated:lower.includes('/build/') };
  if (lower.includes('/assets/') || ['.png','.jpg','.jpeg','.webp','.svg','.gif'].includes(ext)) return { category:'Graphics', module:'Assets', generated:false };
  if ((ext === '.lottie' || ext === '.json') && (lower.includes('animation') || lower.includes('lottie'))) return { category:'Animations', module:'Animations', generated:false };
  if (lower.includes('widget')) return { category:'App', module:'Widgets', generated:false };
  if (lower.includes('health')) return { category:'App', module:'Health', generated:false };
  if (lower.includes('calendar')) return { category:'App', module:'Calendar', generated:false };
  if (lower.includes('person') || lower.includes('people')) return { category:'App', module:'People', generated:false };
  if (lower.includes('group')) return { category:'App', module:'Groups', generated:false };
  if (['.md','.txt','.docx','.pdf'].includes(ext)) return { category:'Documentation', module:'Docs', generated:false };
  if (['.ps1','.bat','.cmd'].includes(ext)) return { category:'Tools', module:'Tools', generated:false };
  if (['.zip','.apk','.aab'].includes(ext)) return { category:'Packages', module:'Releases', generated:false };
  if (['.jsx','.js','.tsx','.ts','.css','.html'].includes(ext)) return { category:'App', module:'React', generated:false };
  return { category:'Other', module:'Unclassified', generated:false };
}
function buildManifest() {
  const started=Date.now();
  const files=walk(PROJECT,8).filter(f=>!path.relative(PROJECT,f).toLowerCase().startsWith('.studio'));
  const entries=[]; const counts={};
  for (const file of files) {
    const stat=fs.statSync(file), cls=classifyFile(file);
    counts[cls.category]=(counts[cls.category]||0)+1;
    entries.push({path:path.relative(PROJECT,file).replace(/\\/g,'/'),absolutePath:file,category:cls.category,module:cls.module,generated:cls.generated,required:['package.json','vite.config.js'].includes(path.basename(file)),size:stat.size,modified:stat.mtime.toISOString(),sha256:stat.size<=50*1024*1024?sha256(file):null});
  }
  const manifest={version:1,generatedAt:nowStamp(),project:PROJECT,totalFiles:entries.length,counts,files:entries};
  ensureDirs(); fs.writeFileSync(MANIFEST,JSON.stringify(manifest,null,2),'utf8');
  logEvent('manifest.build','success',{total_files:entries.length,duration_ms:Date.now()-started}); return manifest;
}
function loadManifest(){ if(!exists(MANIFEST)) return buildManifest(); try{return JSON.parse(fs.readFileSync(MANIFEST,'utf8'));}catch{return buildManifest();} }
function explorerTree(){ const m=loadManifest(),groups={}; for(const f of m.files){groups[f.category]??={};groups[f.category][f.module]??=[];groups[f.category][f.module].push(f);} return {generatedAt:m.generatedAt,totalFiles:m.totalFiles,counts:m.counts,groups}; }
function transactionPath(id){return path.join(TRANSACTIONS,`${safeName(id)}.json`);}
function createTransaction(type,actions,meta={}){ensureDirs();const id=`T-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(3).toString('hex')}`;const tx={id,type,status:'pending',createdAt:nowStamp(),actions,meta,undoAvailable:true};fs.writeFileSync(transactionPath(id),JSON.stringify(tx,null,2));logEvent('transaction.create','success',{transaction_id:id,type});return tx;}
function listTransactions(){ensureDirs();return fs.readdirSync(TRANSACTIONS).filter(n=>n.endsWith('.json')).map(n=>{try{return JSON.parse(fs.readFileSync(path.join(TRANSACTIONS,n),'utf8'));}catch{return null;}}).filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,50);}
function undoTransaction(id){const p=transactionPath(id);if(!exists(p))throw new Error('Transaction not found.');const tx=JSON.parse(fs.readFileSync(p,'utf8'));if(!tx.undoAvailable)throw new Error('Already undone.');for(const a of [...tx.actions].reverse()){if(a.kind==='move'&&exists(a.to)){fs.mkdirSync(path.dirname(a.from),{recursive:true});if(exists(a.from))backupTarget(a.from);fs.renameSync(a.to,a.from);}}tx.undoAvailable=false;tx.status='undone';tx.undoneAt=nowStamp();fs.writeFileSync(p,JSON.stringify(tx,null,2));logEvent('transaction.undo','success',{transaction_id:id});return tx;}

function defaultProjectRules() {
  return {
    version: 1,
    protectedPaths: ['src/**','public/**','android/**','FriendshipTreeStudio/**','.studio/**','package.json','package-lock.json','vite.config.*','capacitor.config.*'],
    generatedPaths: ['dist/**','android/app/build/**','android/app/src/main/assets/public/**','node_modules/**'],
    archivePatterns: ['FriendshipTree_Studio_V*','FriendshipTree_Update_Manager_V*'],
    keepLatestPatterns: ['FriendshipTree_Studio_V*.zip','*.apk','FriendshipTree-Studio-Report-*.zip'],
    maximumBackups: 5
  };
}
function loadProjectRules() {
  ensureDirs();
  if (!exists(PROJECT_RULES)) fs.writeFileSync(PROJECT_RULES, JSON.stringify(defaultProjectRules(), null, 2), 'utf8');
  try { return JSON.parse(fs.readFileSync(PROJECT_RULES, 'utf8')); } catch { return defaultProjectRules(); }
}
function saveHistoricalManifest(manifest, label = null) {
  ensureDirs();
  const packageJson = path.join(PROJECT, 'package.json');
  let projectVersion = 'working-copy';
  try { projectVersion = JSON.parse(fs.readFileSync(packageJson, 'utf8')).version || projectVersion; } catch {}
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const record = { ...manifest, snapshotId: `M-${stamp}`, projectVersion, label: label || `Snapshot ${stamp}`, capturedAt: nowStamp() };
  const file = path.join(MANIFEST_HISTORY, `${safeName(record.snapshotId)}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
  return { file, record };
}
function listHistoricalManifests() {
  ensureDirs();
  return fs.readdirSync(MANIFEST_HISTORY).filter(n => n.endsWith('.json')).map(name => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(MANIFEST_HISTORY, name), 'utf8'));
      return { snapshotId:data.snapshotId, projectVersion:data.projectVersion, label:data.label, capturedAt:data.capturedAt, totalFiles:data.totalFiles, file:path.join(MANIFEST_HISTORY,name) };
    } catch { return null; }
  }).filter(Boolean).sort((a,b)=>String(b.capturedAt).localeCompare(String(a.capturedAt)));
}
function classifyKnowledgeStatus(file, currentPaths, previousPaths, rules) {
  const p = file.path.replace(/\\/g,'/');
  const lower = p.toLowerCase();
  if (lower.startsWith('node_modules/') || lower.startsWith('.studio/') || lower.includes('/build/') || lower.startsWith('dist/')) return 'Generated';
  if (file.required || ['package.json','package-lock.json'].includes(p)) return 'Required';
  if (currentPaths.has(p)) return 'Current';
  if (previousPaths.has(p)) return 'Historical';
  return 'Unexpected';
}
function buildProjectKnowledge() {
  const started=Date.now();
  const current=buildManifest();
  const historical=listHistoricalManifests();
  let prior=null;
  if (historical.length) { try { prior=JSON.parse(fs.readFileSync(historical[0].file,'utf8')); } catch {} }
  const rules=loadProjectRules();
  const currentPaths=new Set(current.files.map(f=>f.path));
  const priorPaths=new Set((prior?.files||[]).map(f=>f.path));
  const allFiles=new Set([...currentPaths,...priorPaths]);
  const records=[];
  for(const p of [...allFiles].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}))){
    const cur=current.files.find(f=>f.path===p)||null;
    const old=(prior?.files||[]).find(f=>f.path===p)||null;
    const base=cur||old;
    records.push({
      path:p, category:base?.category||'Other', module:base?.module||'Unclassified',
      status: cur ? (old ? (cur.sha256===old.sha256?'Current':'Modified') : 'Added') : 'Removed',
      current:Boolean(cur), firstSeen: old?.capturedAt||prior?.capturedAt||current.generatedAt,
      lastSeen:cur?current.generatedAt:(prior?.capturedAt||null), size:cur?.size||old?.size||0,
      sha256:cur?.sha256||old?.sha256||null, previousSha256:old?.sha256||null,
      generated:Boolean(base?.generated), required:Boolean(base?.required)
    });
  }
  const summary={
    totalCurrent:current.totalFiles,
    added:records.filter(r=>r.status==='Added').length,
    modified:records.filter(r=>r.status==='Modified').length,
    removed:records.filter(r=>r.status==='Removed').length,
    unchanged:records.filter(r=>r.status==='Current').length,
    previousSnapshot:prior?{snapshotId:prior.snapshotId,projectVersion:prior.projectVersion,capturedAt:prior.capturedAt}:null
  };
  const db={version:1,generatedAt:nowStamp(),project:PROJECT,rules,summary,files:records,manifestHistory:historical};
  fs.writeFileSync(PROJECT_DB,JSON.stringify(db,null,2),'utf8');
  const snapshot=saveHistoricalManifest(current);
  logEvent('knowledge.build','success',{files:records.length,added:summary.added,modified:summary.modified,removed:summary.removed,duration_ms:Date.now()-started});
  return {...db,snapshot:snapshot.record};
}
function getProjectKnowledge(){ if(!exists(PROJECT_DB)) return buildProjectKnowledge(); try{return JSON.parse(fs.readFileSync(PROJECT_DB,'utf8'));}catch{return buildProjectKnowledge();} }
function compareManifestSnapshots(newerId, olderId) {
  const manifests=listHistoricalManifests();
  const read=id=>{const m=manifests.find(x=>x.snapshotId===id); if(!m) throw new Error(`Snapshot not found: ${id}`); return JSON.parse(fs.readFileSync(m.file,'utf8'));};
  const newer=read(newerId), older=read(olderId);
  const a=new Map((older.files||[]).map(f=>[f.path,f])), b=new Map((newer.files||[]).map(f=>[f.path,f]));
  const added=[],removed=[],modified=[];
  for(const [p,f] of b){if(!a.has(p))added.push(p);else if(a.get(p).sha256!==f.sha256)modified.push(p);}
  for(const p of a.keys())if(!b.has(p))removed.push(p);
  return {newer:{snapshotId:newer.snapshotId,version:newer.projectVersion,capturedAt:newer.capturedAt},older:{snapshotId:older.snapshotId,version:older.projectVersion,capturedAt:older.capturedAt},added,removed,modified,counts:{added:added.length,removed:removed.length,modified:modified.length}};
}


function sourceFilesForDNA() {
  const root = path.join(PROJECT, 'src');
  if (!exists(root)) return [];
  return walk(root, 12)
    .filter(file => /\.(jsx?|tsx?|css)$/i.test(file))
    .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function inferSystem(relativePath, text) {
  const hay = `${relativePath} ${text.slice(0,12000)}`.toLowerCase();
  const systems = [
    ['Health', ['health','habit','food diary','wellbeing']],
    ['Social', ['friend','person','people','group','relationship','contact']],
    ['Calendar', ['calendar','birthday','event','schedule']],
    ['Living Forest', ['forest','flower','leaf','leaves','vine','butterfl','firefl','bat','owl','pollen']],
    ['Map and Camera', ['camera','zoom','pan','viewport','mapview','map view']],
    ['Storage and Backup', ['localstorage','indexeddb','preferences','filesystem','backup','restore','drive']],
    ['Widgets', ['widget','appwidget','remoteviews']],
    ['Settings', ['settings','preference','configuration']],
    ['Performance', ['benchmark','performance','fps','memo','render count']],
    ['AI', ['openai','anthropic','gemini','api key','assistant']],
  ];
  let best=['General',0];
  for (const [name, words] of systems) {
    const score=words.reduce((n,w)=>n+(hay.split(w).length-1),0);
    if(score>best[1]) best=[name,score];
  }
  return best[0];
}
function parseCodeDNA(file) {
  const text=fs.readFileSync(file,'utf8');
  const relativePath=path.relative(PROJECT,file).replace(/\\/g,'/');
  const ext=path.extname(file).toLowerCase();
  const lines=text.split(/\r?\n/);
  const imports=[];
  const importRe=/(?:import[\s\S]*?from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
  let m; while((m=importRe.exec(text))) imports.push(m[1]);
  const exports=[];
  const exportRe=/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)?\s*([A-Za-z_$][\w$]*)?/g;
  while((m=exportRe.exec(text))) if(m[1]) exports.push(m[1]);
  const functions=[];
  const functionRe=/(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  while((m=functionRe.exec(text))) functions.push({name:m[1],params:m[2].split(',').map(x=>x.trim()).filter(Boolean).length,type:'function',significant:true});
  const arrowRe=/(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g;
  while((m=arrowRe.exec(text))) functions.push({name:m[1],params:null,type:'arrow',significant:true});
  const components=[...new Set(functions.filter(f=>/^[A-Z]/.test(f.name)).map(f=>f.name))];
  const hooks=[...new Set((text.match(/\buse[A-Z][A-Za-z0-9_$]*\s*\(/g)||[]).map(x=>x.replace(/\s*\($/,'')))];
  const todos=(text.match(/\b(?:TODO|FIXME|HACK|XXX)\b[^\r\n]*/gi)||[]).slice(0,30);
  const storage=[...new Set(['localStorage','indexedDB','Preferences','Filesystem','sessionStorage'].filter(x=>new RegExp(x,'i').test(text)))];
  const complexity=(text.match(/\b(if|else if|for|while|switch|catch|case)\b/g)||[]).length;
  const normalisedTokens=(text.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/.*$/gm,' ').match(/[A-Za-z_$][\w$]*|\d+|=>|===|!==|&&|\|\|/g)||[]);
  const tokenSet=[...new Set(normalisedTokens)];
  return {relativePath,absolutePath:file,ext,lines:lines.length,bytes:Buffer.byteLength(text),system:inferSystem(relativePath,text),imports:[...new Set(imports)],exports:[...new Set(exports)],functions,components,hooks,todos,storage,complexity,tokenSet,sha256:crypto.createHash('sha256').update(text).digest('hex')};
}
function resolveLocalImport(fromFile, specifier, knownPaths) {
  if(!specifier || !specifier.startsWith('.')) return null;
  const fromAbs=path.join(PROJECT,fromFile);
  const base=path.resolve(path.dirname(fromAbs),specifier);
  const candidates=[base, ...['.js','.jsx','.ts','.tsx','.css'].map(x=>base+x), ...['index.js','index.jsx','index.ts','index.tsx'].map(x=>path.join(base,x))];
  for(const c of candidates){const rel=path.relative(PROJECT,c).replace(/\\/g,'/');if(knownPaths.has(rel))return rel;}
  return null;
}
function detectEntryFiles(files) {
  const paths=new Set(files.map(f=>f.relativePath));
  const preferred=['src/main.jsx','src/main.js','src/index.jsx','src/index.js','src/App.jsx'];
  const found=preferred.filter(x=>paths.has(x));
  return found.length?[found[0]]:files.filter(f=>/\/(main|index)\.(jsx?|tsx?)$/i.test('/'+f.relativePath)).map(f=>f.relativePath).slice(0,1);
}
function classifySourceReachability(files) {
  const paths=new Set(files.map(f=>f.relativePath));
  const byPath=new Map(files.map(f=>[f.relativePath,f]));
  const entries=detectEntryFiles(files);
  const active=new Set(), queue=[...entries];
  while(queue.length){const p=queue.shift();if(active.has(p))continue;active.add(p);const f=byPath.get(p);if(!f)continue;for(const spec of f.imports||[]){const r=resolveLocalImport(p,spec,paths);if(r&&!active.has(r))queue.push(r);}}
  for(const f of files){
    const lower=f.relativePath.toLowerCase();
    if(active.has(f.relativePath))f.sourceRole='Active source';
    else if(/(?:test|spec|regression|fixture|mock)/i.test(lower))f.sourceRole='Test/support source';
    else f.sourceRole='Unreferenced source';
  }
  return {entries,active};
}
function jaccardSimilarity(a,b){const A=new Set(a||[]),B=new Set(b||[]);if(!A.size&&!B.size)return 1;let inter=0;for(const x of A)if(B.has(x))inter++;return inter/(A.size+B.size-inter||1);}
function detectHistoricalSnapshots(files, activeSet) {
  const activeLarge=files.filter(f=>activeSet.has(f.relativePath)&&f.lines>=500);
  const candidates=[];
  for(const f of files){
    if(f.sourceRole!=='Unreferenced source'||f.lines<500)continue;
    let best=null;
    for(const a of activeLarge){
      const similarity=jaccardSimilarity(f.tokenSet,a.tokenSet);
      const sizeRatio=Math.min(f.lines,a.lines)/Math.max(f.lines,a.lines);
      const score=similarity*0.75+sizeRatio*0.25;
      if(!best||score>best.score)best={path:a.relativePath,similarity,score,sizeRatio};
    }
    if(best&&best.score>=0.78){
      f.sourceRole='Historical snapshot';
      f.similarTo=best.path;
      f.similarity=Math.round(best.similarity*1000)/10;
      f.archiveConfidence=best.score>=0.92?'High':'Review';
      candidates.push({path:f.relativePath,similarTo:best.path,similarity:f.similarity,lines:f.lines,confidence:f.archiveConfidence,reason:'Not reachable from the app entry chain and structurally similar to active source.'});
    }
  }
  return candidates.sort((a,b)=>b.similarity-a.similarity||b.lines-a.lines);
}
function duplicateFunctionNames(files) {
  const ignore=new Set(['add','apply','append','btn','render','update','open','close','save','load','get','set','run','start','stop']);
  const byName=new Map();
  for(const f of files) for(const fn of f.functions||[]) {
    if(!fn.name||fn.name.length<5||ignore.has(fn.name.toLowerCase()))continue;
    if(!byName.has(fn.name)) byName.set(fn.name,[]);
    byName.get(fn.name).push(f.relativePath);
  }
  return [...byName.entries()].filter(([,paths])=>new Set(paths).size>1).map(([name,paths])=>({name,paths:[...new Set(paths)]})).sort((a,b)=>b.paths.length-a.paths.length||a.name.localeCompare(b.name));
}
function buildArchitectureMarkdown(dna) {
  const lines=['# FriendshipTree Architecture','','Generated by FriendshipTree Studio V2.4.',`Updated: ${dna.generatedAt}`,'',`Entry file(s): ${dna.entryFiles.map(x=>'`'+x+'`').join(', ')||'Not detected'}`,''];
  lines.push('## Source roles','',`- Active source: ${dna.sourceRoles.active.length}`,`- Test/support source: ${dna.sourceRoles.support.length}`,`- Historical snapshots: ${dna.sourceRoles.historical.length}`,`- Other unreferenced source: ${dna.sourceRoles.unreferenced.length}`,'');
  for(const system of dna.systems) {
    lines.push(`## ${system.name}`,'',`${system.files.length} active source file(s).`,'');
    for(const f of system.files.slice(0,100)) {
      const labels=[];
      if(f.components.length) labels.push(`components: ${f.components.join(', ')}`);
      if(f.storage.length) labels.push(`storage: ${f.storage.join(', ')}`);
      lines.push(`- \`${f.relativePath}\`${labels.length?` — ${labels.join('; ')}`:''}`);
    }
    lines.push('');
  }
  if(dna.historicalCandidates.length){lines.push('## Historical source snapshots','');for(const x of dna.historicalCandidates)lines.push(`- \`${x.path}\` — ${x.similarity}% token similarity to \`${x.similarTo}\`; not reachable from the entry chain.`);lines.push('');}
  lines.push('## Technical debt signals','',`- Large active files (1,000+ lines): ${dna.technicalDebt.largeFiles.length}`,`- Repeated significant function names in active/support source: ${dna.technicalDebt.duplicateFunctions.length}`,`- TODO/FIXME markers in active source: ${dna.summary.todos}`,`- Active files with high branch complexity (100+): ${dna.technicalDebt.complexFiles.length}`,'');
  return lines.join('\n');
}
function buildAIContextMarkdown(dna) {
  const top=dna.activeFiles.slice().sort((a,b)=>b.lines-a.lines).slice(0,15);
  const lines=['# FriendshipTree AI Development Context','',`Generated: ${dna.generatedAt}`,'','## Project summary','',`FriendshipTree is a React/Vite + Capacitor Android project. Studio traced ${dna.summary.activeFiles} active source files from ${dna.entryFiles.join(', ')||'the detected entry point'} and analysed ${dna.summary.activeLines.toLocaleString()} active lines.`, '', '## Systems'];
  for(const s of dna.systems) lines.push(`- **${s.name}:** ${s.files.length} active files; ${s.components.length} detected components.`);
  lines.push('','## Largest active source files','');
  for(const f of top) lines.push(`- \`${f.relativePath}\` — ${f.lines.toLocaleString()} lines; system: ${f.system}`);
  if(dna.historicalCandidates.length){lines.push('','## Excluded historical snapshots','');for(const x of dna.historicalCandidates)lines.push(`- \`${x.path}\` — unreferenced; ${x.similarity}% similar to \`${x.similarTo}\`.`);}
  lines.push('','## Technical debt','',`- ${dna.technicalDebt.largeFiles.length} active source files exceed 1,000 lines.`,`- ${dna.technicalDebt.duplicateFunctions.length} significant function names occur in multiple active/support files.`,`- ${dna.summary.todos} TODO/FIXME/HACK markers were detected in active source.`,`- ${dna.technicalDebt.complexFiles.length} active files have 100+ branch/control-flow markers.`,'','## Storage APIs detected','');
  const storage=[...new Set(dna.activeFiles.flatMap(f=>f.storage))];
  lines.push(storage.length?storage.map(x=>`- ${x}`).join('\n'):'- None detected by static scan.');
  lines.push('','## Important limitations','','Reachability is based on static local imports from the detected entry file. Dynamic imports or runtime-generated paths can require manual review. Similarity identifies likely historical copies but does not delete or move files.','');
  return lines.join('\n');
}
function cleanDNAFile(f){const {absolutePath,tokenSet,...safe}=f;return safe;}
function buildProjectDNA() {
  const started=Date.now();
  const files=sourceFilesForDNA().map(parseCodeDNA);
  const reach=classifySourceReachability(files);
  const historicalCandidates=detectHistoricalSnapshots(files,reach.active);
  const activeFiles=files.filter(f=>f.sourceRole==='Active source');
  const supportFiles=files.filter(f=>f.sourceRole==='Test/support source');
  const analysisFiles=[...activeFiles,...supportFiles];
  const grouped=new Map();
  for(const f of activeFiles){if(!grouped.has(f.system))grouped.set(f.system,[]);grouped.get(f.system).push(f);}
  const systems=[...grouped.entries()].map(([name,items])=>({name,files:items.map(cleanDNAFile),components:[...new Set(items.flatMap(f=>f.components))]})).sort((a,b)=>b.files.length-a.files.length||a.name.localeCompare(b.name));
  const duplicates=duplicateFunctionNames(analysisFiles);
  const technicalDebt={
    largeFiles:activeFiles.filter(f=>f.lines>=1000).sort((a,b)=>b.lines-a.lines).map(f=>({path:f.relativePath,lines:f.lines,system:f.system})),
    complexFiles:activeFiles.filter(f=>f.complexity>=100).sort((a,b)=>b.complexity-a.complexity).map(f=>({path:f.relativePath,complexity:f.complexity,lines:f.lines})),
    duplicateFunctions:duplicates
  };
  const safeFiles=files.map(cleanDNAFile);
  const safeActive=activeFiles.map(cleanDNAFile);
  const dna={version:2,generatedAt:nowStamp(),project:PROJECT,entryFiles:reach.entries,summary:{files:files.length,lines:files.reduce((n,f)=>n+f.lines,0),activeFiles:activeFiles.length,activeLines:activeFiles.reduce((n,f)=>n+f.lines,0),components:new Set(activeFiles.flatMap(f=>f.components)).size,functions:activeFiles.reduce((n,f)=>n+f.functions.length,0),hooks:new Set(activeFiles.flatMap(f=>f.hooks)).size,todos:activeFiles.reduce((n,f)=>n+f.todos.length,0),historicalSnapshots:historicalCandidates.length},sourceRoles:{active:activeFiles.map(f=>f.relativePath),support:supportFiles.map(f=>f.relativePath),historical:files.filter(f=>f.sourceRole==='Historical snapshot').map(f=>f.relativePath),unreferenced:files.filter(f=>f.sourceRole==='Unreferenced source').map(f=>f.relativePath)},historicalCandidates,systems,technicalDebt,activeFiles:safeActive,files:safeFiles};
  ensureDirs();
  fs.writeFileSync(PROJECT_DNA,JSON.stringify(dna,null,2),'utf8');
  fs.writeFileSync(ARCHITECTURE_MD,buildArchitectureMarkdown(dna),'utf8');
  fs.writeFileSync(AI_CONTEXT_MD,buildAIContextMarkdown(dna),'utf8');
  logEvent('project_dna.build','success',{files:files.length,activeFiles:activeFiles.length,historicalSnapshots:historicalCandidates.length,lines:dna.summary.activeLines,components:dna.summary.components,duration_ms:Date.now()-started});
  return {...dna,paths:{database:PROJECT_DNA,architecture:ARCHITECTURE_MD,aiContext:AI_CONTEXT_MD}};
}
function getProjectDNA(){if(!exists(PROJECT_DNA))return buildProjectDNA();try{const dna=JSON.parse(fs.readFileSync(PROJECT_DNA,'utf8'));if((dna.version||0)<2)return buildProjectDNA();return {...dna,paths:{database:PROJECT_DNA,architecture:ARCHITECTURE_MD,aiContext:AI_CONTEXT_MD}};}catch{return buildProjectDNA();}}

ipcMain.handle('build-manifest', () => {
  try {
    const manifest = buildManifest();
    return { ok: true, count: manifest.totalFiles, generatedAt: manifest.generatedAt, path: MANIFEST };
  } catch (error) {
    logEvent('manifest.build', 'error', { message: error.message });
    return { ok: false, message: error.message };
  }
});
ipcMain.handle('get-explorer',()=>explorerTree());
ipcMain.handle('list-transactions',()=>listTransactions());
ipcMain.handle('undo-transaction',(_e,id)=>{try{return{ok:true,transaction:undoTransaction(id)}}catch(err){return{ok:false,message:err.message}}});



function listTransactionFiles() {
  ensureDirs();
  return fs.readdirSync(TRANSACTIONS)
    .filter(name => name.endsWith('.json'))
    .map(name => path.join(TRANSACTIONS, name));
}

function completeTransaction(tx, status, error = null) {
  if (!tx || !tx.id) return;
  const file = transactionPath(tx.id);
  const updated = { ...tx, status, completedAt: nowStamp() };
  if (error) updated.error = error;
  if (status !== 'success') updated.undoAvailable = false;
  fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
}

function moveToQuarantineVerified(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.renameSync(source, target);
    return 'rename';
  } catch (renameError) {
    // Windows can refuse a directory rename because of antivirus/indexing locks.
    // Fall back to copy, verify, then remove the original.
    if (fs.statSync(source).isDirectory()) copyRecursive(source, target);
    else fs.copyFileSync(source, target);
    const before = sha256Path(source);
    const after = sha256Path(target);
    if (before !== after) {
      fs.rmSync(target, { recursive: true, force: true });
      throw new Error(`Quarantine copy verification failed after rename error: ${renameError.message}`);
    }
    fs.rmSync(source, { recursive: true, force: true });
    return 'copy-delete';
  }
}

function quarantineItem(item) {
  if (!item || !item.source || !exists(item.source)) throw new Error('Source no longer exists.');
  const category = item.category || 'Review';
  const relative = path.relative(PROJECT, item.source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Cleaner may only quarantine project files.');
  const target = uniqueDestination(path.join(QUARANTINE, category, path.dirname(relative)), path.basename(item.source));
  const beforeHash = sha256Path(item.source);
  const tx = createTransaction('file.quarantine', [{ kind:'move', from:item.source, to:target }], {
    reason:item.reason || 'approved_cleanup', category, confidence:item.confidence || null
  });
  try {
    const moveMethod = moveToQuarantineVerified(item.source, target);
    const afterHash = sha256Path(target);
    if (beforeHash !== afterHash) throw new Error('Hash verification failed after quarantine.');
    if (exists(item.source)) throw new Error('Source still exists after quarantine move.');
    if (!exists(target)) throw new Error('Quarantine destination was not created.');
    const manifest = {
      ts: nowStamp(), original:item.source, quarantined:target,
      reason:item.reason || 'approved_cleanup', confidence:item.confidence || null,
      explanation:item.explanation || [], cautions:item.cautions || [], hash:afterHash,
      transactionId:tx.id, moveMethod
    };
    fs.writeFileSync(target + '.studio.json', JSON.stringify(manifest, null, 2), 'utf8');
    completeTransaction(tx, 'success');
    logEvent('file.quarantine', 'success', { source:item.source, target, hash:afterHash, move_method:moveMethod, transaction_id:tx.id });
    return { ok:true, source:item.source, target, quarantineRoot:QUARANTINE, moveMethod, transactionId:tx.id };
  } catch (err) {
    try {
      if (exists(target) && !exists(item.source)) {
        fs.mkdirSync(path.dirname(item.source), { recursive:true });
        fs.renameSync(target, item.source);
      }
    } catch {}
    completeTransaction(tx, 'rolled-back', err.message);
    throw err;
  }
}

function normalizeRel(p) {
  const value = String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!value || value.includes('\0')) throw new Error('Invalid empty package path.');
  const parts = value.split('/');
  if (parts.some(part => part === '..' || part === '.')) throw new Error(`Unsafe package path: ${value}`);
  if (/^[A-Za-z]:/.test(value)) throw new Error(`Absolute paths are forbidden: ${value}`);
  return value;
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readInstalledStudioVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(STUDIO, 'package.json'), 'utf8')).version || null;
  } catch {
    return null;
  }
}

function packageRootForType(packageType) {
  if (packageType === 'studio-update') return PROJECT;
  if (packageType === 'app-update') return PROJECT;
  throw new Error(`Unsupported package type: ${packageType}`);
}

function validatePackageManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== 'object') errors.push('package-manifest.json is invalid.');
  if (!manifest.packageId || typeof manifest.packageId !== 'string') errors.push('Missing packageId.');
  if (!manifest.packageType || !['studio-update', 'app-update'].includes(manifest.packageType))
    errors.push('packageType must be studio-update or app-update.');
  if (!manifest.version || typeof manifest.version !== 'string') errors.push('Missing version.');
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) errors.push('Package contains no files.');

  const seenSources = new Set();
  const seenDestinations = new Set();

  for (const [index, file] of (manifest.files || []).entries()) {
    try {
      const source = normalizeRel(file.source);
      const destination = normalizeRel(file.destination);
      if (seenSources.has(source.toLowerCase())) errors.push(`Duplicate source at file ${index + 1}: ${source}`);
      if (seenDestinations.has(destination.toLowerCase())) errors.push(`Duplicate destination at file ${index + 1}: ${destination}`);
      seenSources.add(source.toLowerCase());
      seenDestinations.add(destination.toLowerCase());

      if (!/^[a-f0-9]{64}$/i.test(String(file.sha256 || '')))
        errors.push(`Invalid SHA-256 for ${source}.`);

      if (manifest.packageType === 'studio-update' &&
          !destination.toLowerCase().startsWith('friendshiptreestudio/') &&
          !destination.toLowerCase().startsWith('start friendshiptree studio') &&
          !destination.toLowerCase().startsWith('install friendshiptree studio')) {
        errors.push(`Studio package destination is outside approved Studio locations: ${destination}`);
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (manifest.displayName && !String(manifest.displayName).includes(manifest.version))
    warnings.push('Display name does not contain the internal version.');

  return { errors, warnings };
}

function invokePowerShell(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script, ...args], {
      windowsHide: true
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('error', err => resolve({ ok: false, code: -1, stdout, stderr: err.message }));
    child.on('close', code => resolve({ ok: code === 0, code, stdout, stderr }));
  });
}

async function inspectUpdatePackage(zipPath) {
  ensureDirs();
  const staging = path.join(PACKAGE_STAGING, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  fs.mkdirSync(staging, { recursive: true });

  let archiveForExtraction = zipPath;
  let temporaryArchive = null;
  if (!/\.zip$/i.test(zipPath)) {
    temporaryArchive = path.join(PACKAGE_STAGING, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.zip`);
    fs.copyFileSync(zipPath, temporaryArchive);
    archiveForExtraction = temporaryArchive;
  }
  const escapedZip = archiveForExtraction.replace(/'/g, "''");
  const escapedStaging = staging.replace(/'/g, "''");
  const extraction = await invokePowerShell(
    `$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedStaging}' -Force`
  );
  if (temporaryArchive) { try { fs.unlinkSync(temporaryArchive); } catch {} }
  if (!extraction.ok) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new Error(`Could not open package: ${extraction.stderr || extraction.stdout}`);
  }

  const manifestPath = path.join(staging, 'package-manifest.json');
  if (!exists(manifestPath)) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new Error('Package rejected: package-manifest.json is missing.');
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw new Error(`Package rejected: manifest is not valid JSON (${err.message}).`);
  }

  const validation = validatePackageManifest(manifest);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];
  const verifiedFiles = [];

  for (const file of manifest.files || []) {
    try {
      const sourceRel = normalizeRel(file.source);
      const sourcePath = path.join(staging, sourceRel);
      if (!exists(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        errors.push(`Missing package file: ${sourceRel}`);
        continue;
      }
      const actualHash = sha256(sourcePath);
      if (actualHash.toLowerCase() !== String(file.sha256).toLowerCase()) {
        errors.push(`Hash mismatch: ${sourceRel}`);
      } else {
        verifiedFiles.push(sourceRel);
      }
    } catch (err) {
      errors.push(err.message);
    }
  }

  const historyPath = path.join(PACKAGE_HISTORY, `${safeName(manifest.packageId || 'unknown')}.json`);
  if (exists(historyPath)) errors.push(`Package ${manifest.packageId} has already been installed.`);

  if (manifest.packageType === 'studio-update') {
    const packageJsonRecord = (manifest.files || []).find(f =>
      normalizeRel(f.destination).toLowerCase() === 'friendshiptreestudio/package.json'
    );
    if (!packageJsonRecord) {
      errors.push('Studio update does not contain FriendshipTreeStudio/package.json.');
    } else {
      try {
        const packagedJson = JSON.parse(fs.readFileSync(path.join(staging, normalizeRel(packageJsonRecord.source)), 'utf8'));
        if (packagedJson.version !== manifest.version) {
          errors.push(`Manifest version ${manifest.version} does not match packaged package.json version ${packagedJson.version}.`);
        }
      } catch (err) {
        errors.push(`Could not verify packaged package.json: ${err.message}`);
      }
    }

    const current = readInstalledStudioVersion();
    if (current === manifest.version) warnings.push(`Studio ${manifest.version} appears to already be installed.`);
  }

  const inspection = {
    ok: errors.length === 0,
    zipPath,
    staging,
    manifest,
    errors,
    warnings,
    verifiedFiles,
    installedStudioVersion: readInstalledStudioVersion()
  };

  logEvent('package.inspect', inspection.ok ? 'success' : 'error', {
    zip: zipPath,
    package_id: manifest.packageId || null,
    package_type: manifest.packageType || null,
    version: manifest.version || null,
    errors: errors.join(' | '),
    warnings: warnings.join(' | ')
  });

  return inspection;
}

async function installInspectedPackage(inspection) {
  if (!inspection || !inspection.ok) throw new Error('Package has not passed validation.');
  const manifest = inspection.manifest;
  const root = packageRootForType(manifest.packageType);
  const actions = [];
  const backups = [];
  const installed = [];

  for (const record of manifest.files) {
    const sourceRel = normalizeRel(record.source);
    const destinationRel = normalizeRel(record.destination);
    const source = path.join(inspection.staging, sourceRel);
    const destination = path.join(root, destinationRel);

    if (!exists(source)) throw new Error(`Staged source disappeared: ${sourceRel}`);
    const sourceHash = sha256(source);
    if (sourceHash.toLowerCase() !== String(record.sha256).toLowerCase())
      throw new Error(`Staged hash changed before install: ${sourceRel}`);

    actions.push({ kind: 'package-file', source, destination, expectedHash: record.sha256 });
  }

  const tx = createTransaction('package.install', actions.map(a => ({
    kind: 'package-install',
    from: a.source,
    to: a.destination
  })), {
    packageId: manifest.packageId,
    packageType: manifest.packageType,
    version: manifest.version
  });

  try {
    for (const action of actions) {
      fs.mkdirSync(path.dirname(action.destination), { recursive: true });
      const backup = backupTarget(action.destination);
      backups.push({ destination: action.destination, backup });
      fs.copyFileSync(action.source, action.destination);
      const installedHash = sha256(action.destination);
      if (installedHash.toLowerCase() !== String(action.expectedHash).toLowerCase())
        throw new Error(`Installed file failed verification: ${action.destination}`);
      installed.push(action.destination);
    }

    const history = {
      installedAt: nowStamp(),
      packageId: manifest.packageId,
      packageType: manifest.packageType,
      version: manifest.version,
      sourceZip: inspection.zipPath,
      files: installed,
      backups,
      transactionId: tx.id
    };
    fs.writeFileSync(
      path.join(PACKAGE_HISTORY, `${safeName(manifest.packageId)}.json`),
      JSON.stringify(history, null, 2),
      'utf8'
    );
    completeTransaction(tx, 'success');
    logEvent('package.install', 'success', {
      package_id: manifest.packageId,
      version: manifest.version,
      transaction_id: tx.id,
      file_count: installed.length
    });
    fs.rmSync(inspection.staging, { recursive: true, force: true });
    return { ok: true, history, restartRequired: manifest.packageType === 'studio-update' };
  } catch (err) {
    for (let i = installed.length - 1; i >= 0; i--) {
      const destination = installed[i];
      const record = backups.find(b => b.destination === destination);
      try {
        if (record && record.backup && exists(record.backup)) {
          fs.copyFileSync(record.backup, destination);
        } else if (exists(destination)) {
          fs.unlinkSync(destination);
        }
      } catch {}
    }
    completeTransaction(tx, 'rolled-back', err.message);
    logEvent('package.install', 'error', {
      package_id: manifest.packageId,
      version: manifest.version,
      transaction_id: tx.id,
      error: err.message
    });
    throw err;
  }
}

let pendingPackageInspection = null;

async function inspectPackageAtPath(packagePath) {
  try {
    pendingPackageInspection = await inspectUpdatePackage(packagePath);
    return { canceled: false, ...pendingPackageInspection };
  } catch (err) {
    pendingPackageInspection = null;
    logEvent('package.inspect', 'error', { package: packagePath, error: err.message });
    return { canceled: false, ok: false, errors: [err.message], warnings: [] };
  }
}

ipcMain.handle('choose-update-package', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose a FriendshipTree update package',
    properties: ['openFile'],
    filters: [
      { name: 'FriendshipTree seamless updates', extensions: ['ftupdate'] },
      { name: 'Legacy ZIP update packages', extensions: ['zip'] }
    ]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return inspectPackageAtPath(result.filePaths[0]);
});

ipcMain.handle('inspect-update-package-path', async (_event, packagePath) => {
  const resolved = path.resolve(String(packagePath || ''));
  if (!/\.(ftupdate|zip)$/i.test(resolved)) return { canceled:false, ok:false, errors:['Only .ftupdate or .zip packages are supported.'], warnings:[] };
  if (!exists(resolved)) return { canceled:false, ok:false, errors:['The selected update package no longer exists.'], warnings:[] };
  return inspectPackageAtPath(resolved);
});

ipcMain.handle('consume-launch-package', async () => {
  const candidate = launchPackagePath; launchPackagePath = null;
  if (!candidate) return { canceled: true };
  return inspectPackageAtPath(candidate);
});

ipcMain.handle('install-update-package', async () => {
  try {
    const result = await installInspectedPackage(pendingPackageInspection);
    pendingPackageInspection = null;
    if (result.ok && result.restartRequired) {
      logEvent('studio.restart', 'scheduled', { version: result.history?.version || null });
      setTimeout(() => { app.relaunch(); app.exit(0); }, 900);
      return { ...result, restarting: true };
    }
    return result;
  } catch (err) { return { ok: false, message: err.message }; }
});

ipcMain.handle('open-package-history', () => {
  ensureDirs();
  shell.openPath(PACKAGE_HISTORY);
  return true;
});


ipcMain.handle('status', () => inventory());
ipcMain.handle('scan-misplaced', () => {
  const results = scanMisplaced();
  logEvent('organiser.scan', 'success', { count: results.length });
  return results;
});
ipcMain.handle('scan-cleaner', () => {
  const results = scanCleaner();
  logEvent('cleaner.scan', 'success', { count: results.length });
  return results;
});

ipcMain.handle('move-file', async (_event, item) => {
  const started = Date.now();
  try {
    if (!exists(item.source)) throw new Error('Source no longer exists.');
    fs.mkdirSync(path.dirname(item.target), { recursive: true });
    const beforeHash = fs.statSync(item.source).isFile() ? sha256(item.source) : null;
    logEvent('file.move', 'started', {
      source: item.source, target: item.target, reason: item.reason || 'manual_move',
      confidence: item.confidence || null, before_hash: beforeHash
    });
    const backup = backupTarget(item.target);
    const tx = createTransaction('file.move', [{kind:'move',from:item.source,to:item.target}], {reason:item.reason||'manual_move'});
    fs.renameSync(item.source, item.target);
    const afterHash = fs.statSync(item.target).isFile() ? sha256(item.target) : null;
    if (beforeHash && afterHash && beforeHash !== afterHash) throw new Error('Hash verification failed after move.');
    logEvent('file.move', 'success', {
      source: item.source, target: item.target, backup,
      after_hash: afterHash, duration_ms: Date.now() - started
    });
    return { ok: true, backup };
  } catch (err) {
    logEvent('file.move', 'error', {
      source: item.source, target: item.target, error: err.message,
      duration_ms: Date.now() - started
    });
    return { ok: false, message: err.message };
  }
});

ipcMain.handle('quarantine-file', async (_event, item) => {
  try { return quarantineItem(item); }
  catch (err) {
    logEvent('file.quarantine', 'error', { source: item?.source, error: err.message });
    return { ok:false, message:err.message };
  }
});

ipcMain.handle('restore-quarantined', async (_event, manifestPath) => {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!exists(manifest.quarantined)) throw new Error('Quarantined file no longer exists.');
    fs.mkdirSync(path.dirname(manifest.original), { recursive: true });
    const backup = backupTarget(manifest.original);
    fs.renameSync(manifest.quarantined, manifest.original);
    if (exists(manifestPath)) fs.unlinkSync(manifestPath);
    logEvent('file.restore', 'success', {
      source: manifest.quarantined, target: manifest.original, backup
    });
    return { ok: true, target: manifest.original };
  } catch (err) {
    logEvent('file.restore', 'error', { manifestPath, error: err.message });
    return { ok: false, message: err.message };
  }
});

ipcMain.handle('open-path', (_event, p) => {
  if (exists(p)) shell.openPath(p);
  return exists(p);
});

ipcMain.handle('export-report', async () => {
  ensureDirs();
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(os.homedir(), 'Desktop', `FriendshipTree-Studio-Report-${sessionId}.zip`),
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  // Use PowerShell Compress-Archive to avoid adding another dependency.
  const files = fs.readdirSync(REPORTS)
    .filter(n => n.includes(sessionId))
    .map(n => path.join(REPORTS, n));

  const ps = [
    '$ErrorActionPreference="Stop"',
    `$files=@(${files.map(f => `'${f.replace(/'/g, "''")}'`).join(',')})`,
    `Compress-Archive -LiteralPath $files -DestinationPath '${result.filePath.replace(/'/g, "''")}' -Force`
  ].join(';');

  return await new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true });
    let err = '';
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => {
      logEvent('report.export', code === 0 ? 'success' : 'error', {
        target: result.filePath, exit_code: code, error: err
      });
      resolve({ ok: code === 0, path: result.filePath, message: err || null });
    });
  });
});

ipcMain.handle('run-studio-npm-install', async event => run('npm.cmd', ['install'], STUDIO, event.sender, 'studio.npm_install'));
ipcMain.handle('run-doctor', async event => {
  const doctor = path.join(PROJECT, 'Tools', 'FriendshipTree-Doctor.ps1');
  if (!exists(doctor)) return { ok: false, message: 'Doctor script not found.' };
  return run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', doctor], PROJECT, event.sender, 'doctor.run');
});
ipcMain.handle('build-web', async event => run('npm.cmd', ['run', 'build'], PROJECT, event.sender, 'web.build'));
ipcMain.handle('sync-android', async event => run('npx.cmd', ['cap', 'sync', 'android'], PROJECT, event.sender, 'android.sync'));

ipcMain.handle('build-apk', async event => {
  const gradlew = path.join(PROJECT, 'android', 'gradlew.bat');
  const tools = toolPaths();
  if (!exists(gradlew)) return { ok: false, message: 'gradlew.bat not found.' };
  const envJava = tools.java ? path.dirname(path.dirname(tools.java)) : null;
  logEvent('android.build_apk', 'started', { gradlew, java_home: envJava });
  const child = spawn(gradlew, ['assembleDebug'], {
    cwd: path.join(PROJECT, 'android'),
    shell: false,
    windowsHide: true,
    env: { ...process.env, ...(envJava ? { JAVA_HOME: envJava } : {}) }
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d.toString(); event.sender.send('log', d.toString()); });
  child.stderr.on('data', d => { stderr += d.toString(); event.sender.send('log', d.toString()); });
  return await new Promise(resolve => {
    child.on('error', err => {
      logEvent('android.build_apk', 'error', { error: err.message });
      resolve({ ok: false, message: err.message });
    });
    child.on('close', code => {
      logEvent('android.build_apk', code === 0 ? 'success' : 'error', {
        exit_code: code, stdout_tail: stdout.slice(-4000), stderr_tail: stderr.slice(-4000)
      });
      resolve({ ok: code === 0, code });
    });
  });
});

ipcMain.handle('install-apk', async event => {
  const tools = toolPaths();
  if (!tools.adb) return { ok: false, message: 'ADB could not be found.' };
  const apk = path.join(PROJECT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!exists(apk)) return { ok: false, message: 'Debug APK not found. Build it first.' };
  return run(tools.adb, ['install', '-r', apk], PROJECT, event.sender, 'android.install_apk');
});


// ---- V0.7 safety and project-intelligence features ----

const RECOVERY = path.join(STUDIO_DATA, 'Recovery');
const TEST_RESULTS = path.join(STUDIO_DATA, 'TestResults');
[RECOVERY, TEST_RESULTS].forEach(p => fs.mkdirSync(p, { recursive: true }));

function projectRelative(file) {
  return path.relative(PROJECT, file).replace(/\\/g, '/');
}

function safeProjectPath(relativePath) {
  const rel = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel || rel.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('Unsafe project-relative path.');
  }
  const resolved = path.resolve(PROJECT, rel);
  const root = path.resolve(PROJECT) + path.sep;
  if (resolved !== path.resolve(PROJECT) && !resolved.startsWith(root)) {
    throw new Error('Path escapes the FriendshipTree project.');
  }
  return resolved;
}

function sourceFilesForGraph() {
  const allowed = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.json']);
  return walk(PROJECT, 8).filter(file => {
    const rel = projectRelative(file).toLowerCase();
    if (shouldSkipProjectPath(file) || rel.includes('/build/') || rel.includes('/dist/')) return false;
    return allowed.has(path.extname(file).toLowerCase());
  });
}

function resolveDependency(fromFile, specifier, allFilesByNormalizedPath) {
  if (!specifier || (!specifier.startsWith('.') && !specifier.startsWith('/'))) return null;
  const base = specifier.startsWith('/')
    ? path.resolve(PROJECT, '.' + specifier)
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.css'].map(ext => base + ext),
    ...['index.js', 'index.jsx', 'index.ts', 'index.tsx'].map(name => path.join(base, name))
  ];
  for (const candidate of candidates) {
    const key = path.normalize(candidate).toLowerCase();
    if (allFilesByNormalizedPath.has(key)) return allFilesByNormalizedPath.get(key);
  }
  return null;
}

function buildDependencyGraphData() {
  const files = sourceFilesForGraph();
  const lookup = new Map(files.map(file => [path.normalize(file).toLowerCase(), file]));
  const edges = [];
  const unresolved = [];
  const importedBy = new Map(files.map(file => [file, []]));
  const imports = new Map(files.map(file => [file, []]));

  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const file of files) {
    let text = '';
    try {
      if (fs.statSync(file).size > 2_000_000) continue;
      text = fs.readFileSync(file, 'utf8');
    } catch { continue; }

    const found = new Set();
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) found.add(match[1]);
    }

    for (const specifier of found) {
      const resolved = resolveDependency(file, specifier, lookup);
      if (resolved) {
        const edge = { from: projectRelative(file), to: projectRelative(resolved), specifier };
        edges.push(edge);
        imports.get(file).push(resolved);
        importedBy.get(resolved).push(file);
      } else if (specifier.startsWith('.') || specifier.startsWith('/')) {
        unresolved.push({ from: projectRelative(file), specifier });
      }
    }
  }

  const nodes = files.map(file => ({
    path: projectRelative(file),
    imports: imports.get(file).length,
    importedBy: importedBy.get(file).length,
    orphanCandidate: importedBy.get(file).length === 0 &&
      !/^(src\/)?(main|index|app)\.(js|jsx|ts|tsx)$/i.test(projectRelative(file))
  }));

  const graph = {
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    unresolved,
    summary: {
      files: nodes.length,
      dependencies: edges.length,
      unresolved: unresolved.length,
      orphanCandidates: nodes.filter(n => n.orphanCandidate).length
    }
  };

  fs.writeFileSync(path.join(STUDIO_DATA, 'dependency-graph.json'), JSON.stringify(graph, null, 2), 'utf8');
  logEvent('dependency_graph.build', 'success', graph.summary);
  return graph;
}

function newestFile(files) {
  let result = null;
  for (const file of files) {
    try {
      const time = fs.statSync(file).mtimeMs;
      if (!result || time > result.time) result = { file, time };
    } catch {}
  }
  return result;
}

function calculateProjectHealth() {
  const files = walk(PROJECT, 8);
  const problems = [];
  const positives = [];
  let score = 100;

  const required = ['package.json', 'src', 'android'];
  for (const rel of required) {
    const target = path.join(PROJECT, rel);
    if (!exists(target)) {
      problems.push(`Required project item is missing: ${rel}`);
      score -= 20;
    } else {
      positives.push(`Found ${rel}`);
    }
  }

  const manifestPath = path.join(STUDIO_DATA, 'project-manifest.json');
  if (!exists(manifestPath)) {
    problems.push('Project manifest has not been built.');
    score -= 10;
  } else {
    const ageHours = (Date.now() - fs.statSync(manifestPath).mtimeMs) / 3600000;
    if (ageHours > 168) {
      problems.push(`Project manifest is ${Math.floor(ageHours / 24)} days old.`);
      score -= 5;
    } else positives.push('Project manifest is recent.');
  }

  let graph;
  try { graph = buildDependencyGraphData(); } catch { graph = null; }
  if (graph) {
    if (graph.summary.unresolved > 0) {
      problems.push(`${graph.summary.unresolved} local import${graph.summary.unresolved === 1 ? '' : 's'} could not be resolved.`);
      score -= Math.min(20, graph.summary.unresolved * 2);
    } else positives.push('No unresolved local imports were detected.');
  }

  const suspicious = scanCleaner();
  const highRisk = suspicious.filter(item => item.confidence >= 0.8);
  if (highRisk.length) {
    problems.push(`${highRisk.length} high-confidence cleanup candidate${highRisk.length === 1 ? '' : 's'} found.`);
    score -= Math.min(10, highRisk.length);
  } else positives.push('No high-confidence cleanup candidates found.');

  const quarantineFiles = exists(QUARANTINE) ? walk(QUARANTINE, 5).length : 0;
  if (quarantineFiles) {
    problems.push(`${quarantineFiles} file${quarantineFiles === 1 ? '' : 's'} currently held in quarantine.`);
    score -= Math.min(5, quarantineFiles);
  } else positives.push('Quarantine is empty.');

  const apkCandidates = [
    path.join(PROJECT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(PROJECT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
  ].filter(exists);
  const apkFiles = apkCandidates.length ? apkCandidates : files.filter(file => file.toLowerCase().endsWith('.apk'));
  const latestApk = newestFile(apkFiles);
  if (latestApk) positives.push(`Latest APK: ${projectRelative(latestApk.file)}`);
  else {
    problems.push('No APK build was found.');
    score -= 3;
  }

  score = Math.max(0, Math.min(100, score));
  const result = {
    generatedAt: new Date().toISOString(),
    score,
    grade: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Needs attention' : 'Unsafe',
    positives,
    problems,
    metrics: {
      projectFiles: files.length,
      cleanupCandidates: suspicious.length,
      highConfidenceCandidates: highRisk.length,
      quarantineFiles,
      unresolvedImports: graph?.summary.unresolved ?? null,
      orphanCandidates: graph?.summary.orphanCandidates ?? null,
      latestApk: latestApk ? projectRelative(latestApk.file) : null
    }
  };
  fs.writeFileSync(path.join(STUDIO_DATA, 'project-health.json'), JSON.stringify(result, null, 2), 'utf8');
  logEvent('health.calculate', 'success', { score, problems: problems.length });
  return result;
}

function previewProjectFile(relativePath) {
  const file = safeProjectPath(relativePath);
  if (!exists(file) || !fs.statSync(file).isFile()) throw new Error('File not found.');
  const stat = fs.statSync(file);
  const maxBytes = 120000;
  const buffer = fs.readFileSync(file);
  const binary = buffer.slice(0, Math.min(buffer.length, 8000)).includes(0);
  let preview = binary
    ? '[Binary file — text preview unavailable]'
    : buffer.slice(0, maxBytes).toString('utf8');
  if (buffer.length > maxBytes) preview += '\n\n[Preview truncated]';

  let graphInfo = null;
  try {
    const graphPath = path.join(STUDIO_DATA, 'dependency-graph.json');
    const graph = exists(graphPath) ? JSON.parse(fs.readFileSync(graphPath, 'utf8')) : buildDependencyGraphData();
    graphInfo = graph.nodes.find(node => node.path.toLowerCase() === relativePath.replace(/\\/g, '/').toLowerCase()) || null;
  } catch {}

  return {
    path: projectRelative(file),
    size: stat.size,
    modified: stat.mtime.toISOString(),
    sha256: sha256(file),
    binary,
    preview,
    dependency: graphInfo
  };
}

function createCleanupPlan(selectedPaths) {
  const current = new Map(scanCleaner().map(item => [projectRelative(item.source).toLowerCase(), item]));
  const requested = Array.isArray(selectedPaths) ? selectedPaths : [];
  const items = [];
  const conflicts = [];

  for (const rel of requested) {
    let source;
    try { source = safeProjectPath(rel); } catch (err) {
      conflicts.push({ path: rel, problem: err.message });
      continue;
    }
    const candidate = current.get(projectRelative(source).toLowerCase());
    if (!candidate) {
      conflicts.push({ path: rel, problem: 'File is no longer a current Cleaner candidate.' });
      continue;
    }
    if (!exists(source)) {
      conflicts.push({ path: rel, problem: 'Source file no longer exists.' });
      continue;
    }
    const destination = path.join(QUARANTINE, candidate.category, projectRelative(source));
    items.push({
      source: projectRelative(source),
      destination: path.relative(PROJECT, destination).replace(/\\/g, '/'),
      confidence: candidate.confidence,
      category: candidate.category,
      reasons: candidate.explanation,
      cautions: candidate.cautions,
      bytes: candidate.size
    });
  }

  const plan = {
    id: `cleanup-plan-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
    mode: 'dry-run',
    items,
    conflicts,
    totals: {
      files: items.length,
      bytes: items.reduce((sum, item) => sum + item.bytes, 0),
      conflicts: conflicts.length,
      risk: conflicts.length ? 'Blocked' :
        items.some(item => item.confidence < 0.8 || item.cautions.length) ? 'Review required' : 'Low'
    }
  };
  fs.writeFileSync(path.join(STUDIO_DATA, `${plan.id}.json`), JSON.stringify(plan, null, 2), 'utf8');
  logEvent('cleanup.dry_run', conflicts.length ? 'warning' : 'success', plan.totals);
  return plan;
}

function executeCleanupPlan(plan) {
  if (!plan || plan.mode !== 'dry-run' || !Array.isArray(plan.items)) throw new Error('Invalid cleanup plan.');
  if (plan.conflicts?.length) throw new Error('Plan contains conflicts and cannot be executed.');
  const completed = [];
  try {
    for (const item of plan.items) {
      const source = safeProjectPath(item.source);
      if (!exists(source)) throw new Error(`Source disappeared: ${item.source}`);
      const result = quarantineItem({
        source,
        category: item.category,
        reason: 'approved_dry_run_plan',
        confidence: item.confidence,
        explanation: item.reasons,
        cautions: item.cautions
      });
      completed.push(result);
    }
    logEvent('cleanup.execute_plan', 'success', { plan_id: plan.id, files: completed.length });
    return { ok: true, completed };
  } catch (err) {
    // Quarantine actions are individually reversible through Undo Centre.
    logEvent('cleanup.execute_plan', 'error', { plan_id: plan.id, completed: completed.length, error: err.message });
    return { ok: false, completed, message: err.message };
  }
}

function listRecoveryPoints() {
  const transactions = listTransactionFiles().map(file => {
    try {
      const tx = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        type: 'transaction',
        id: tx.id,
        createdAt: tx.createdAt,
        status: tx.status,
        description: tx.type,
        recoverable: ['success','pending'].includes(tx.status) && tx.undoAvailable !== false
      };
    } catch { return null; }
  }).filter(Boolean);

  const packageHistory = exists(PACKAGE_HISTORY)
    ? fs.readdirSync(PACKAGE_HISTORY).filter(name => name.endsWith('.json')).map(name => {
        try {
          const record = JSON.parse(fs.readFileSync(path.join(PACKAGE_HISTORY, name), 'utf8'));
          return {
            type: 'package',
            id: record.packageId,
            createdAt: record.installedAt,
            status: 'installed',
            description: `${record.packageType} ${record.version}`,
            recoverable: Array.isArray(record.backups) && record.backups.length > 0
          };
        } catch { return null; }
      }).filter(Boolean)
    : [];

  return [...transactions, ...packageHistory].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function restorePackageInstallation(packageId) {
  const historyFile = path.join(PACKAGE_HISTORY, `${safeName(packageId)}.json`);
  if (!exists(historyFile)) throw new Error('Package installation record not found.');
  const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  const failures = [];
  for (const entry of [...(history.backups || [])].reverse()) {
    try {
      if (entry.backup && exists(entry.backup)) {
        fs.mkdirSync(path.dirname(entry.destination), { recursive: true });
        fs.copyFileSync(entry.backup, entry.destination);
      } else if (exists(entry.destination)) {
        fs.unlinkSync(entry.destination);
      }
    } catch (err) {
      failures.push(`${entry.destination}: ${err.message}`);
    }
  }
  if (failures.length) throw new Error(failures.join(' | '));
  history.restoredAt = new Date().toISOString();
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
  logEvent('recovery.package_restore', 'success', { package_id: packageId });
  return { ok: true };
}

function runStudioSelfTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, message: err.message });
    }
  };

  test('Reject path traversal', () => {
    let rejected = false;
    try { safeProjectPath('../outside.txt'); } catch { rejected = true; }
    if (!rejected) throw new Error('Path traversal was not rejected.');
  });

  test('Reject package without files', () => {
    const validation = validatePackageManifest({
      packageId: 'test',
      packageType: 'studio-update',
      version: '1.0.0',
      files: []
    });
    if (!validation.errors.length) throw new Error('Empty package was accepted.');
  });

  test('Reject invalid SHA-256', () => {
    const validation = validatePackageManifest({
      packageId: 'test',
      packageType: 'app-update',
      version: '1.0.0',
      files: [{ source: 'a.txt', destination: 'a.txt', sha256: 'wrong' }]
    });
    if (!validation.errors.some(error => error.includes('SHA-256'))) throw new Error('Bad hash was accepted.');
  });

  test('Dependency graph returns a structured result', () => {
    const graph = buildDependencyGraphData();
    if (!graph.summary || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error('Dependency graph structure is incomplete.');
    }
  });

  test('Cleaner dry run does not move files', () => {
    const before = scanCleaner().map(item => item.source);
    const plan = createCleanupPlan([]);
    const after = scanCleaner().map(item => item.source);
    if (plan.items.length !== 0 || JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error('Empty dry run changed project state.');
    }
  });

  test('Project health score is bounded', () => {
    const health = calculateProjectHealth();
    if (health.score < 0 || health.score > 100) throw new Error('Health score outside 0–100.');
  });


  test('Quarantine hashing works inside excluded .studio path', () => {
    const source = path.join(TEST_RESULTS, `hash-source-${process.pid}-${Date.now()}`);
    const destination = path.join(QUARANTINE, 'Test', `hash-destination-${process.pid}-${Date.now()}`);
    try {
      fs.mkdirSync(path.join(source, 'nested'), { recursive: true });
      fs.writeFileSync(path.join(source, 'a.txt'), 'alpha', 'utf8');
      fs.writeFileSync(path.join(source, 'nested', 'b.txt'), 'beta', 'utf8');
      copyRecursive(source, destination);
      if (sha256Path(source) !== sha256Path(destination)) {
        throw new Error('Equivalent folders produced different hashes.');
      }
    } finally {
      fs.rmSync(source, { recursive: true, force: true });
      fs.rmSync(destination, { recursive: true, force: true });
    }
  });

  const report = {
    runAt: new Date().toISOString(),
    passed: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    results
  };
  const target = path.join(TEST_RESULTS, `self-test-${Date.now()}.json`);
  fs.writeFileSync(target, JSON.stringify(report, null, 2), 'utf8');
  logEvent('self_test.run', report.failed ? 'error' : 'success', { passed: report.passed, failed: report.failed });
  return { ...report, reportPath: target };
}


async function exportCleanerAnalysis() {
  try {
    const candidates = scanCleaner();
    const graph = buildDependencyGraphData();
    const report = {
      generatedAt: new Date().toISOString(),
      project: PROJECT,
      exclusions: SKIP_PATHS,
      cleaner: {
        candidateCount: candidates.length,
        candidates: candidates.map(item => ({
          name: item.name,
          source: projectRelative(item.source),
          category: item.category,
          confidence: item.confidence,
          explanation: item.explanation || [],
          cautions: item.cautions || []
        }))
      },
      dependencyGraph: {
        summary: graph.summary,
        unresolved: graph.unresolved,
        orphanCandidates: graph.nodes.filter(node => node.orphanCandidate)
      }
    };
    const suggested = `FriendshipTree-project-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const choice = await dialog.showSaveDialog({
      title: 'Export project analysis',
      defaultPath: path.join(REPORTS, suggested),
      filters: [{ name: 'JSON report', extensions: ['json'] }]
    });
    if (choice.canceled || !choice.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(choice.filePath, JSON.stringify(report, null, 2), 'utf8');
    logEvent('cleaner.analysis_export', 'success', { path: choice.filePath, candidates: candidates.length });
    return { ok: true, path: choice.filePath, candidates: candidates.length };
  } catch (error) {
    logEvent('cleaner.analysis_export', 'error', { message: error.message });
    return { ok: false, message: error.message };
  }
}


function ensureAIContextFiles() {
  ensureDirs();
  if (!exists(PROJECT_DNA) || !exists(AI_CONTEXT_MD) || !exists(ARCHITECTURE_MD)) buildProjectDNA();
}

function readTextIfExists(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function getAIWorkspaceData() {
  ensureAIContextFiles();
  const dna = JSON.parse(fs.readFileSync(PROJECT_DNA, 'utf8'));
  return {
    version: app.getVersion(),
    generatedAt: dna.generatedAt,
    summary: dna.summary || {},
    systems: dna.systems || [],
    technicalDebt: dna.technicalDebt || {},
    architecture: readTextIfExists(ARCHITECTURE_MD),
    context: readTextIfExists(AI_CONTEXT_MD),
    paths: { aiContext: AI_CONTEXT_MD, architecture: ARCHITECTURE_MD, knowledge: KNOWLEDGE }
  };
}

function copyAIContext(target) {
  ensureAIContextFiles();
  const body = fs.readFileSync(AI_CONTEXT_MD, 'utf8');
  const preface = target === 'claude'
    ? '# Instructions for Claude\nUse this project context as the source of truth. Preserve the existing architecture and identify exact files before proposing edits.\n\n'
    : '# Instructions for ChatGPT\nUse this project context as the source of truth. Preserve the existing architecture and identify exact files before proposing edits.\n\n';
  clipboard.writeText(preface + body);
  logEvent('ai_context.copy', 'success', { target, characters: body.length });
  return { ok: true, target, characters: body.length };
}

async function exportAIDevelopmentPackage() {
  ensureAIContextFiles();
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folder = path.join(AI_PACKAGES, `FriendshipTree_AI_Package_${stamp}`);
  fs.mkdirSync(folder, { recursive: true });
  const candidates = [AI_CONTEXT_MD, ARCHITECTURE_MD, PROJECT_DNA, PROJECT_DB, PROJECT_RULES, MANIFEST];
  for (const source of candidates) if (exists(source)) fs.copyFileSync(source, path.join(folder, path.basename(source)));
  const knowledge = exists(PROJECT_DB) ? JSON.parse(fs.readFileSync(PROJECT_DB, 'utf8')) : null;
  const recentChanges = knowledge ? {
    generatedAt: nowStamp(),
    summary: knowledge.summary || {},
    changes: (knowledge.files || []).filter(f => ['Added','Modified','Removed'].includes(f.status)).map(f => ({path:f.path,status:f.status,module:f.module}))
  } : { generatedAt: nowStamp(), summary: {}, changes: [] };
  fs.writeFileSync(path.join(folder, 'recent-changes.json'), JSON.stringify(recentChanges, null, 2), 'utf8');
  fs.writeFileSync(path.join(folder, 'README.txt'), `FriendshipTree AI Development Package\r\nGenerated by FriendshipTree Studio V${app.getVersion()}\r\n\r\nUpload this ZIP as a single project-context package.\r\n`, 'utf8');
  const zipPath = folder + '.zip';
  const script = `Compress-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force`;
  const result = await invokePowerShell(script, [folder, zipPath]);
  if (!result.ok || !exists(zipPath)) throw new Error(result.stderr || 'AI package ZIP could not be created.');
  logEvent('ai_package.export', 'success', { zipPath, files: fs.readdirSync(folder).length });
  shell.showItemInFolder(zipPath);
  return { ok: true, path: zipPath, folder };
}


function getDevelopmentPartnerData() {
  ensureDirs();
  let dna;
  try { dna = getProjectDNA(); } catch { dna = buildProjectDNA(); }
  let health;
  try { health = calculateProjectHealth(); } catch (error) { health = { score: null, checks: [], error: error.message }; }
  let graph;
  try { graph = buildDependencyGraphData(); } catch (error) { graph = { summary: {}, unresolved: [], nodes: [], error: error.message }; }

  const summary = dna.summary || {};
  const debt = dna.technicalDebt || {};
  const historical = dna.historicalCandidates || [];
  const unresolved = graph.unresolved || [];
  const orphanCount = (graph.nodes || []).filter(x => x.orphanCandidate).length;
  const largest = (debt.largeFiles || [])[0] || null;
  const recommendations = [];

  const add = (priority, title, reason, action, system = 'Project') =>
    recommendations.push({ priority, title, reason, action, system });

  if (largest && largest.lines >= 10000) add(
    1,
    `Split ${largest.path} into system modules`,
    `${largest.path} contains ${Number(largest.lines).toLocaleString()} lines, making focused changes, testing and AI review unnecessarily risky.`,
    'Use the future Code Atlas to identify safe extraction boundaries, beginning with one self-contained system such as Health Tracker or Calendar.',
    largest.system || 'Architecture'
  );
  if (historical.length) add(
    2,
    `Review ${historical.length} historical source snapshot${historical.length === 1 ? '' : 's'}`,
    historical.map(x => `${x.path} (${x.similarity}% similar to ${x.similarTo})`).join('; '),
    'Preview them, verify they are not reachable from the entry chain, then archive them through a reversible Studio transaction.',
    'Source hygiene'
  );
  if (unresolved.length) add(
    1,
    `Resolve ${unresolved.length} unresolved local import${unresolved.length === 1 ? '' : 's'}`,
    'Unresolved imports can hide build failures or leave parts of the architecture graph incomplete.',
    'Open Dependency Graph, inspect each unresolved path and repair or remove the import.',
    'Build integrity'
  );
  if ((debt.duplicateFunctions || []).length > 20) add(
    3,
    `Review ${debt.duplicateFunctions.length} repeated significant function names`,
    'Some repeats are legitimate, but the remaining list may reveal copied logic that should be centralised.',
    'Start with names appearing across active production files; ignore test helpers until production duplication is understood.',
    'Technical debt'
  );
  if ((debt.complexFiles || []).length) add(
    2,
    `Reduce complexity in ${debt.complexFiles.length} active file${debt.complexFiles.length === 1 ? '' : 's'}`,
    'High branch density makes regressions harder to isolate.',
    'Extract pure calculations and persistence adapters before moving visual components.',
    'Maintainability'
  );
  if (!recommendations.length) add(4, 'Project intelligence is clear', 'No high-priority static-analysis problems were detected.', 'Run the build and self-tests, then choose the next product feature.', 'Project');

  recommendations.sort((a,b) => a.priority-b.priority || a.title.localeCompare(b.title));
  const status = [
    { label: 'Project health', value: health?.score == null ? 'Unavailable' : `${health.score}/100`, state: health?.score >= 85 ? 'good' : health?.score >= 65 ? 'review' : 'bad' },
    { label: 'Active source', value: `${summary.activeFiles || 0} files · ${Number(summary.activeLines || 0).toLocaleString()} lines`, state: 'good' },
    { label: 'Historical snapshots', value: String(summary.historicalSnapshots || historical.length || 0), state: historical.length ? 'review' : 'good' },
    { label: 'Unresolved imports', value: String(unresolved.length), state: unresolved.length ? 'bad' : 'good' },
    { label: 'Possible orphans', value: String(orphanCount), state: orphanCount ? 'review' : 'good' },
    { label: 'Large active files', value: String((debt.largeFiles || []).length), state: (debt.largeFiles || []).length ? 'review' : 'good' }
  ];

  return {
    generatedAt: nowStamp(),
    studioVersion: app.getVersion(),
    project: PROJECT,
    status,
    recommendations,
    nextBestAction: recommendations[0],
    limitations: 'Recommendations are based on static source analysis, dependency reachability and Studio health checks. Runtime behaviour and performance measurements still require testing.'
  };
}

ipcMain.handle('get-development-partner', () => {
  try { return { ok: true, data: getDevelopmentPartnerData() }; }
  catch (error) { logEvent('development_partner.load', 'error', { message: error.message }); return { ok: false, message: error.message }; }
});

ipcMain.handle('build-dependency-graph', () => buildDependencyGraphData());
ipcMain.handle('project-health', () => calculateProjectHealth());
ipcMain.handle('export-cleaner-analysis', () => exportCleanerAnalysis());
ipcMain.handle('preview-file', (_event, relativePath) => previewProjectFile(relativePath));
ipcMain.handle('create-cleanup-plan', (_event, selectedPaths) => createCleanupPlan(selectedPaths));
ipcMain.handle('execute-cleanup-plan', (_event, plan) => executeCleanupPlan(plan));
ipcMain.handle('list-recovery-points', () => listRecoveryPoints());
ipcMain.handle('restore-package-installation', (_event, packageId) => restorePackageInstallation(packageId));
ipcMain.handle('run-self-tests', () => runStudioSelfTests());
ipcMain.handle('open-recovery-folder', () => { shell.openPath(RECOVERY); return true; });
ipcMain.handle('open-quarantine-folder', () => { ensureDirs(); shell.openPath(QUARANTINE); return QUARANTINE; });

ipcMain.handle('build-project-knowledge', () => { try { return {ok:true,data:buildProjectKnowledge()}; } catch(err){ logEvent('knowledge.build','error',{message:err.message}); return {ok:false,message:err.message}; } });
ipcMain.handle('get-project-knowledge', () => { try { return {ok:true,data:getProjectKnowledge()}; } catch(err){ return {ok:false,message:err.message}; } });
ipcMain.handle('list-manifest-history', () => listHistoricalManifests());
ipcMain.handle('compare-manifest-snapshots', (_e,newerId,olderId) => { try{return {ok:true,data:compareManifestSnapshots(newerId,olderId)}}catch(err){return {ok:false,message:err.message}} });
ipcMain.handle('open-knowledge-folder', () => { ensureDirs(); shell.openPath(KNOWLEDGE); return KNOWLEDGE; });
ipcMain.handle('app-info', () => ({version: app.getVersion(), name: app.getName()}));
ipcMain.handle('get-ai-workspace', () => { try{return {ok:true,data:getAIWorkspaceData()}}catch(err){return {ok:false,message:err.message}} });
ipcMain.handle('copy-ai-context', (_e,target) => { try{return copyAIContext(target)}catch(err){return {ok:false,message:err.message}} });
ipcMain.handle('export-ai-package', async () => { try{return await exportAIDevelopmentPackage()}catch(err){logEvent('ai_package.export','error',{message:err.message});return {ok:false,message:err.message}} });
ipcMain.handle('show-ai-context', () => { ensureAIContextFiles(); shell.showItemInFolder(AI_CONTEXT_MD); return AI_CONTEXT_MD; });
ipcMain.handle('build-project-dna', () => { try{return {ok:true,data:buildProjectDNA()}}catch(err){logEvent('project_dna.build','error',{message:err.message});return {ok:false,message:err.message}} });
ipcMain.handle('get-project-dna', () => { try{return {ok:true,data:getProjectDNA()}}catch(err){return {ok:false,message:err.message}} });
ipcMain.handle('open-ai-context', () => { if(!exists(AI_CONTEXT_MD)) buildProjectDNA(); shell.openPath(AI_CONTEXT_MD); return AI_CONTEXT_MD; });


app.whenReady().then(() => {
  launchPackagePath = detectLaunchPackagePath();
  startSession();
  createWindow();
});
app.on('before-quit', () => logEvent('session.end', 'success', {}));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
