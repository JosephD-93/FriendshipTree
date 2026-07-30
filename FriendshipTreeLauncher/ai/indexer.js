const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  PROJECT_ROOT, EXCLUDED_DIRS, EXCLUDED_EXTENSIONS,
  INCLUDED_EXTENSIONS, ALWAYS_INCLUDE
} = require("./config");

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function isExcluded(relativePath) {
  return relativePath.split(path.sep).some(part => EXCLUDED_DIRS.has(part));
}

function shouldInclude(filePath, relativePath) {
  if (isExcluded(relativePath)) return false;
  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (EXCLUDED_EXTENSIONS.has(ext)) return false;
  return ALWAYS_INCLUDE.has(name) || INCLUDED_EXTENSIONS.has(ext);
}

function roleFor(relativePath) {
  const p = relativePath.replaceAll("/", "\\");
  if (p.startsWith("AI\\")) return "Canonical AI project knowledge and workflow";
  if (p === "StudioSystem\\Bootstrap\\FriendshipTree-Forge.ps1") return "Canonical Forge update and recovery engine";
  if (p === "FriendshipTreeLauncher\\main.js") return "Electron Launcher main process and IPC";
  if (p === "FriendshipTreeLauncher\\preload.js") return "Electron Launcher secure renderer bridge";
  if (p === "FriendshipTreeLauncher\\renderer.js") return "Electron Launcher interface logic";
  if (p === "FriendshipTreeLauncher\\index.html") return "Electron Launcher interface structure";
  if (p.startsWith("src\\")) return "FriendshipTree React application source";
  if (p.startsWith("android\\")) return "Capacitor Android source or configuration";
  if (p.startsWith("FriendshipTreeStudio\\")) return "FriendshipTree Studio source";
  return "Project source, configuration or documentation";
}

function walk(dir, records) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(PROJECT_ROOT, full);
    if (entry.isDirectory()) {
      if (!isExcluded(relative)) walk(full, records);
    } else if (entry.isFile() && shouldInclude(full, relative)) {
      const stat = fs.statSync(full);
      records.push({
        path: relative,
        canonicalPath: full,
        role: roleFor(relative),
        includedInExport: true,
        sizeBytes: stat.size,
        modifiedUtc: stat.mtime.toISOString(),
        sha256: sha256(full)
      });
    }
  }
}

function buildFileIndex() {
  const records = [];
  walk(PROJECT_ROOT, records);
  records.sort((a, b) => a.path.localeCompare(b.path));
  return records;
}

module.exports = { buildFileIndex, sha256 };
