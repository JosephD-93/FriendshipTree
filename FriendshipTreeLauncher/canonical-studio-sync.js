const fs = require("fs");
const path = require("path");

const APPROVED_SOURCE_FILES = [
  "command-registry.js",
  "index.html",
  "main.js",
  "notification-centre.js",
  "package-lock.json",
  "package.json",
  "preload.js",
  "renderer.js",
  "studio-core.js",
  "studio-self-test.css",
  "studio-self-test.js",
  "studio3-enhancements.css",
  "studio3-enhancements.js",
  "styles.css",
  "universal-search.js"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function filesMatch(left, right) {
  if (!fs.existsSync(right)) return false;
  const leftStat = fs.statSync(left);
  const rightStat = fs.statSync(right);
  if (leftStat.size !== rightStat.size) return false;
  return fs.readFileSync(left).equals(fs.readFileSync(right));
}

function syncConfirmedStudio(projectRoot) {
  const systemRoot = path.join(projectRoot, "StudioSystem");
  const statePath = path.join(systemRoot, "studio-state.json");
  if (!fs.existsSync(statePath)) throw new Error("Forge studio-state.json is missing.");

  const state = readJson(statePath);
  const confirmedVersion = String(state.lastGood || state.lastConfirmedWorking || "").trim();
  if (!confirmedVersion) throw new Error("Forge has no confirmed Studio version to back up.");
  if (state.pending && String(state.pending) === String(state.current)) {
    throw new Error(`Studio ${state.pending} is still a candidate. Confirm it before creating a GitHub backup.`);
  }

  const sourceRoot = path.join(systemRoot, "Versions", confirmedVersion);
  const canonicalRoot = path.join(projectRoot, "FriendshipTreeStudio");
  const sourcePackage = path.join(sourceRoot, "package.json");
  if (!fs.existsSync(sourcePackage)) throw new Error(`Confirmed Studio ${confirmedVersion} is incomplete or missing.`);
  const packageVersion = String(readJson(sourcePackage).version || "").trim();
  if (packageVersion !== confirmedVersion) {
    throw new Error(`Confirmed slot ${confirmedVersion} contains package version ${packageVersion || "Unknown"}; canonical source was not changed.`);
  }

  fs.mkdirSync(canonicalRoot, { recursive: true });
  const copied = [];
  for (const fileName of APPROVED_SOURCE_FILES) {
    const source = path.join(sourceRoot, fileName);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
    const destination = path.join(canonicalRoot, fileName);
    if (filesMatch(source, destination)) continue;
    fs.copyFileSync(source, destination);
    copied.push(`FriendshipTreeStudio/${fileName}`);
  }

  return { confirmedVersion, copied };
}

module.exports = { syncConfirmedStudio };
