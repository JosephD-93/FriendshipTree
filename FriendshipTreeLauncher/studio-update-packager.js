const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'C:\\Users\\Joe\\FriendshipTree';
const SYSTEM_ROOT = path.join(PROJECT_ROOT, 'StudioSystem');
const STATE_PATH = path.join(SYSTEM_ROOT, 'studio-state.json');
const VERSIONS_ROOT = path.join(SYSTEM_ROOT, 'Versions');
const INCOMING = path.join(SYSTEM_ROOT, 'Incoming');

const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.cache', 'logs', 'temp', 'tmp']);
const EXCLUDED_FILES = new Set(['package-lock.json']);

function safeJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch { return {}; }
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function sanitiseName(value) {
  return String(value || 'Studio-Update')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'Studio-Update';
}

function listFiles(root, relative = '') {
  const folder = path.join(root, relative);
  const output = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
    if (entry.isFile() && EXCLUDED_FILES.has(entry.name.toLowerCase())) continue;
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(root, rel));
    else if (entry.isFile()) output.push(rel);
  }
  return output;
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '', stderr = '';
    child.stdout?.on('data', data => stdout += data.toString());
    child.stderr?.on('data', data => stderr += data.toString());
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || stdout || `${command} exited with ${code}`)));
  });
}

function changedFiles(candidateRoot, currentRoot) {
  return listFiles(candidateRoot).filter(rel => {
    const candidate = path.join(candidateRoot, rel);
    const current = path.join(currentRoot, rel);
    return !fs.existsSync(current) || sha256(candidate) !== sha256(current);
  });
}

async function buildStudioUpdate(candidateRoot, details = {}, progress = () => {}) {
  const candidatePackagePath = path.join(candidateRoot, 'package.json');
  if (!fs.existsSync(candidatePackagePath)) throw new Error('The selected folder does not contain package.json. Select the root of the prepared Studio version.');

  const state = safeJson(STATE_PATH);
  const currentVersion = String(state.current || '').trim();
  if (!currentVersion) throw new Error('No active Studio version is recorded.');
  const currentRoot = path.join(VERSIONS_ROOT, currentVersion);
  if (!fs.existsSync(path.join(currentRoot, 'package.json'))) throw new Error(`The active Studio slot is incomplete: ${currentRoot}`);

  const candidatePackage = safeJson(candidatePackagePath);
  const nextVersion = String(details.version || candidatePackage.version || '').trim();
  if (!nextVersion) throw new Error('The prepared Studio package.json has no version.');
  if (nextVersion === currentVersion) throw new Error(`The prepared Studio still reports version ${currentVersion}. Update package.json to the new version first.`);

  progress(`Comparing prepared Studio ${nextVersion} with active Studio ${currentVersion}`);
  let files = changedFiles(candidateRoot, currentRoot);
  if (!files.includes('package.json')) files.unshift('package.json');
  files = [...new Set(files)].sort((a, b) => a.localeCompare(b));
  if (!files.length) throw new Error('No changed files were found.');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'friendshiptree-studio-packager-'));
  const packageRoot = path.join(temp, 'package');
  const payloadRoot = path.join(packageRoot, 'payload');
  fs.mkdirSync(payloadRoot, { recursive: true });

  try {
    progress(`Copying ${files.length} changed file(s) into the update payload`);
    const manifestFiles = files.map(rel => {
      const source = path.join(candidateRoot, rel);
      const payloadRel = path.posix.join('payload', rel.split(path.sep).join('/'));
      const payloadFile = path.join(packageRoot, ...payloadRel.split('/'));
      copyFile(source, payloadFile);
      return {
        source: payloadRel,
        destination: rel.split(path.sep).join('/'),
        sha256: sha256(payloadFile),
        size: fs.statSync(payloadFile).size
      };
    });

    const displayName = String(details.displayName || `FriendshipTree Studio ${nextVersion}`).trim();
    const manifest = {
      packageId: `friendshiptree-studio-${sanitiseName(nextVersion).toLowerCase()}-${Date.now()}`,
      packageType: 'studio-update',
      version: nextVersion,
      displayName,
      createdAt: new Date().toISOString(),
      description: String(details.description || `Studio update generated by FriendshipTree Launcher from prepared version ${nextVersion}.`).trim(),
      baseVersion: currentVersion,
      files: manifestFiles
    };
    fs.writeFileSync(path.join(packageRoot, 'package-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    fs.mkdirSync(INCOMING, { recursive: true });
    const fileName = `${sanitiseName(displayName)}.ftupdate`;
    const finalPath = path.join(INCOMING, fileName);
    const tempZip = path.join(temp, 'update.zip');
    progress('Compressing and signing the Studio update package');
    await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Compress-Archive -Path '${path.join(packageRoot, '*').replace(/'/g, "''")}' -DestinationPath '${tempZip.replace(/'/g, "''")}' -Force`]);
    if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { force: true });
    fs.copyFileSync(tempZip, finalPath);

    return { ok: true, packagePath: finalPath, currentVersion, nextVersion, fileCount: manifestFiles.length, files: manifestFiles.map(item => item.destination), manifest };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { buildStudioUpdate, changedFiles, constants: { INCOMING, VERSIONS_ROOT, STATE_PATH } };
