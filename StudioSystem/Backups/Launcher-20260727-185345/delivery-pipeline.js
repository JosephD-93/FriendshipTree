const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'C:\\Users\\Joe\\FriendshipTree';
const SYSTEM_ROOT = path.join(PROJECT_ROOT, 'StudioSystem');
const LOCAL_INCOMING = path.join(SYSTEM_ROOT, 'Incoming');
const LEGACY_INBOX = path.join(SYSTEM_ROOT, 'Updates', 'Inbox');
const DRIVE_INCOMING = 'G:\\My Drive\\FriendshipTree\\Incoming';
const PROCESSED = path.join(SYSTEM_ROOT, 'Delivery', 'Processed');
const REJECTED = path.join(SYSTEM_ROOT, 'Delivery', 'Rejected');
const BACKUPS = path.join(SYSTEM_ROOT, 'Delivery', 'Backups');
const LOGS = path.join(SYSTEM_ROOT, 'Delivery', 'Logs');
const STATE_PATH = path.join(SYSTEM_ROOT, 'studio-state.json');
const SUPPORTED = /\.(ftupdate|zip)$/i;

function ensureDirs() {
  [LOCAL_INCOMING, LEGACY_INBOX, PROCESSED, REJECTED, BACKUPS, LOGS].forEach(p => fs.mkdirSync(p, { recursive: true }));
  try { fs.mkdirSync(DRIVE_INCOMING, { recursive: true }); } catch {}
}

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function log(message, details = {}) {
  ensureDirs();
  const line = JSON.stringify({ at: new Date().toISOString(), message, ...details });
  fs.appendFileSync(path.join(LOGS, 'delivery.log'), line + os.EOL, 'utf8');
}
function safeJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return {}; }
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function listIncoming() {
  ensureDirs();
  const roots = [
    { key: 'cloud', label: 'Google Drive', folder: DRIVE_INCOMING },
    { key: 'local', label: 'Local incoming', folder: LOCAL_INCOMING },
    { key: 'legacy', label: 'Legacy update inbox', folder: LEGACY_INBOX }
  ];
  const seen = new Set();
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root.folder)) continue;
    for (const name of fs.readdirSync(root.folder)) {
      const full = path.join(root.folder, name);
      if (!SUPPORTED.test(name) || !fs.statSync(full).isFile()) continue;
      const id = `${fs.statSync(full).size}:${name.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      files.push({ path: full, name, source: root.label, sourceKey: root.key, size: fs.statSync(full).size, modified: fs.statSync(full).mtime.toISOString() });
    }
  }
  return files.sort((a,b) => b.modified.localeCompare(a.modified));
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '', stderr = '';
    child.stdout?.on('data', d => stdout += d.toString());
    child.stderr?.on('data', d => stderr += d.toString());
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ code, stdout, stderr }) : reject(new Error(stderr || stdout || `${command} exited with ${code}`)));
  });
}

async function extractPackage(packagePath) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'friendshiptree-delivery-'));
  const zipPath = path.join(temp, 'package.zip');
  fs.copyFileSync(packagePath, zipPath);
  const extract = path.join(temp, 'content');
  fs.mkdirSync(extract, { recursive: true });
  await run('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-Command', `Expand-Archive -LiteralPath '${zipPath.replace(/'/g,"''")}' -DestinationPath '${extract.replace(/'/g,"''")}' -Force`]);
  return { temp, extract };
}

function resolveTargetRoot(packageType) {
  if (packageType === 'app-update') return PROJECT_ROOT;
  if (packageType === 'launcher-update') return path.join(PROJECT_ROOT, 'FriendshipTreeLauncher');
  if (packageType === 'studio-update') {
    const state = safeJson(STATE_PATH);
    if (!state.current) throw new Error('No active Studio version is recorded.');
    return path.join(SYSTEM_ROOT, 'Versions', String(state.current));
  }
  if (packageType === 'ai-workspace-update') return path.join(PROJECT_ROOT, 'AI');
  throw new Error(`Unsupported packageType: ${packageType || 'missing'}`);
}

function normaliseDestination(packageType, destination) {
  let rel = String(destination || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (packageType === 'launcher-update' && rel.toLowerCase().startsWith('friendshiptreelauncher/')) rel = rel.slice('friendshiptreelauncher/'.length);
  if (packageType === 'studio-update' && rel.toLowerCase().startsWith('friendshiptreestudio/')) rel = rel.slice('friendshiptreestudio/'.length);
  if (!rel || rel.includes('..')) throw new Error(`Unsafe destination: ${destination}`);
  return rel;
}

async function inspect(file) {
  const extracted = await extractPackage(file.path);
  try {
    const manifestPath = ['package-manifest.json','manifest.json'].map(n => path.join(extracted.extract,n)).find(fs.existsSync);
    if (!manifestPath) throw new Error('No package-manifest.json or manifest.json was found.');
    const manifest = safeJson(manifestPath);
    if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error('The package manifest has no files.');
    resolveTargetRoot(manifest.packageType);
    const errors = [];
    for (const item of manifest.files) {
      const source = path.join(extracted.extract, String(item.source || ''));
      try {
        normaliseDestination(manifest.packageType, item.destination);
        if (!fs.existsSync(source)) errors.push(`Missing payload file: ${item.source}`);
        else if (item.sha256 && sha256(source).toLowerCase() !== String(item.sha256).toLowerCase()) errors.push(`Hash mismatch: ${item.source}`);
      } catch (e) { errors.push(e.message); }
    }
    return { ...file, ok: errors.length === 0, errors, manifest: { packageId: manifest.packageId, packageType: manifest.packageType, version: manifest.version, displayName: manifest.displayName || file.name, description: manifest.description || '', fileCount: manifest.files.length } };
  } finally { fs.rmSync(extracted.temp, { recursive: true, force: true }); }
}

async function scan() {
  const files = listIncoming();
  const results = [];
  for (const file of files) {
    try { results.push(await inspect(file)); }
    catch (e) { results.push({ ...file, ok: false, errors: [e.message], manifest: { displayName: file.name, packageType: 'unknown', fileCount: 0 } }); }
  }
  return { folders: { cloud: DRIVE_INCOMING, local: LOCAL_INCOMING, legacy: LEGACY_INBOX, processed: PROCESSED, rejected: REJECTED }, items: results, lastScan: new Date().toISOString() };
}

function archive(source, folder, suffix = '') {
  fs.mkdirSync(folder, { recursive: true });
  const ext = path.extname(source);
  const base = path.basename(source, ext);
  const destination = path.join(folder, `${base}${suffix ? '-' + suffix : ''}-${stamp()}${ext}`);
  fs.renameSync(source, destination);
  return destination;
}

async function buildAndInstallApp(progress) {
  progress('Building FriendshipTree web app');
  await run('cmd.exe', ['/d','/s','/c','npm run build'], { cwd: PROJECT_ROOT });
  progress('Synchronising Capacitor Android project');
  await run('cmd.exe', ['/d','/s','/c','npx cap sync android'], { cwd: PROJECT_ROOT });
  progress('Building Android debug APK');
  await run('cmd.exe', ['/d','/s','/c','gradlew.bat assembleDebug'], { cwd: path.join(PROJECT_ROOT,'android') });
  const apk = path.join(PROJECT_ROOT,'android','app','build','outputs','apk','debug','app-debug.apk');
  if (!fs.existsSync(apk)) throw new Error('APK build completed but app-debug.apk was not found.');
  progress('Checking for an authorised Android phone');
  try {
    const devices = await run('cmd.exe', ['/d','/s','/c','adb devices'], { cwd: PROJECT_ROOT });
    const authorised = devices.stdout.split(/\r?\n/).slice(1).map(line => line.trim()).filter(line => /\tdevice$/.test(line));
    if (!authorised.length) {
      return { apk, phoneInstalled: false, phoneVerified: false, phoneMessage: 'No authorised Android phone was available.' };
    }

    progress('Installing APK on connected phone');
    const installResult = await run('cmd.exe', ['/d','/s','/c',`adb install -r "${apk}"`], { cwd: PROJECT_ROOT });
    const installOutput = `${installResult.stdout}\n${installResult.stderr}`;
    if (!/\bSuccess\b/i.test(installOutput)) {
      return { apk, phoneInstalled: false, phoneVerified: false, phoneMessage: installOutput.trim() || 'ADB did not report a successful installation.' };
    }

    progress('Verifying FriendshipTree on the phone');
    const verification = await run('cmd.exe', ['/d','/s','/c','adb shell pm path io.github.josephd93.friendshiptree'], { cwd: PROJECT_ROOT });
    const verified = /package:/i.test(verification.stdout);
    if (!verified) {
      return { apk, phoneInstalled: false, phoneVerified: false, phoneMessage: 'ADB reported success, but Android did not confirm the FriendshipTree package.' };
    }

    return { apk, phoneInstalled: true, phoneVerified: true, phoneMessage: 'FriendshipTree was installed and verified on Android.' };
  } catch (e) {
    return { apk, phoneInstalled: false, phoneVerified: false, phoneMessage: e.message };
  }
}

async function install(packagePath, progress = () => {}) {
  ensureDirs();
  const file = { path: packagePath, name: path.basename(packagePath), source: 'Selected package' };
  const inspection = await inspect(file);
  if (!inspection.ok) throw new Error(inspection.errors.join('\n'));
  const extracted = await extractPackage(packagePath);
  let backupRoot = null;
  try {
    const manifestPath = ['package-manifest.json','manifest.json'].map(n => path.join(extracted.extract,n)).find(fs.existsSync);
    const manifest = safeJson(manifestPath);
    const targetRoot = resolveTargetRoot(manifest.packageType);
    backupRoot = path.join(BACKUPS, `${manifest.packageId || path.basename(packagePath)}-${stamp()}`);
    fs.mkdirSync(backupRoot, { recursive: true });
    progress('Creating transactional backup');
    for (const item of manifest.files) {
      const rel = normaliseDestination(manifest.packageType, item.destination);
      const destination = path.join(targetRoot, rel);
      if (fs.existsSync(destination)) {
        const backup = path.join(backupRoot, rel);
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        fs.copyFileSync(destination, backup);
      }
    }
    progress('Applying verified update files');
    for (const item of manifest.files) {
      const rel = normaliseDestination(manifest.packageType, item.destination);
      const source = path.join(extracted.extract, item.source);
      const destination = path.join(targetRoot, rel);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
    let build = null;
    if (manifest.packageType === 'app-update') build = await buildAndInstallApp(progress);
    const archiveStatus = manifest.packageType === 'app-update' && build && !build.phoneInstalled
      ? 'applied-apk-ready'
      : 'installed';
    const archivedTo = archive(packagePath, PROCESSED, archiveStatus);
    log(build && !build.phoneInstalled ? 'Update applied; APK ready but phone not verified' : 'Update installed', {
      package: file.name,
      packageType: manifest.packageType,
      version: manifest.version,
      backupRoot,
      archivedTo,
      build
    });
    return { ok: true, packageType: manifest.packageType, displayName: manifest.displayName || file.name, version: manifest.version, backupRoot, archivedTo, build, restartRequired: ['launcher-update','studio-update'].includes(manifest.packageType) };
  } catch (error) {
    log('Update installation failed', { package: file.name, error: error.message, backupRoot });
    throw error;
  } finally { fs.rmSync(extracted.temp, { recursive: true, force: true }); }
}

module.exports = { ensureDirs, scan, install, folders: { cloud: DRIVE_INCOMING, local: LOCAL_INCOMING, legacy: LEGACY_INBOX, processed: PROCESSED, rejected: REJECTED } };
