const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const PROJECT_ROOT = "C:\\Users\\Joe\\FriendshipTree";
const SYSTEM_ROOT = path.join(PROJECT_ROOT, "StudioSystem");
const STATE_PATH = path.join(SYSTEM_ROOT, "studio-state.json");
const VERSIONS_ROOT = path.join(SYSTEM_ROOT, "Versions");
const INBOX_ROOT = path.join(SYSTEM_ROOT, "Updates", "Inbox");
const LOGS_ROOT = path.join(SYSTEM_ROOT, "Logs");
const FORGE_PATH = path.join(SYSTEM_ROOT, "Bootstrap", "FriendshipTree-Forge.ps1");
const ANDROID_ROOT = path.join(PROJECT_ROOT, "android");
const DOCS_ROOT = path.join(PROJECT_ROOT, "Documentation");

let win;

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return {};
  }
}

function findElectron(versionPath, projectRoot) {
  const candidates = [
    path.join(versionPath, "node_modules", "electron", "dist", "electron.exe"),
    path.join(projectRoot, "node_modules", "electron", "dist", "electron.exe"),
    path.join(projectRoot, "FriendshipTreeStudio", "node_modules", "electron", "dist", "electron.exe")
  ];
  return candidates.find(fs.existsSync) || null;
}

function getVersions() {
  if (!fs.existsSync(VERSIONS_ROOT)) return [];
  const state = safeReadJson(STATE_PATH);
  return fs.readdirSync(VERSIONS_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const full = path.join(VERSIONS_ROOT, d.name);
      let modified = null;
      let size = 0;
      try {
        modified = fs.statSync(full).mtime.toISOString();
      } catch {}
      return {
        version: d.name,
        status: [
          state.current === d.name ? "Current" : null,
          state.pending === d.name ? "Candidate" : null,
          state.lastWorking === d.name || state.lastConfirmedWorking === d.name ? "Last working" : null
        ].filter(Boolean).join(", "),
        modified,
        size
      };
    })
    .sort((a, b) => (b.modified || "").localeCompare(a.modified || ""));
}

function getStatus() {
  const state = safeReadJson(STATE_PATH);
  const updates = fs.existsSync(INBOX_ROOT)
    ? fs.readdirSync(INBOX_ROOT).filter(n => /\.(ftupdate|zip)$/i.test(n)).length
    : 0;
  const logs = fs.existsSync(LOGS_ROOT)
    ? fs.readdirSync(LOGS_ROOT).filter(n => n.toLowerCase().endsWith(".log")).length
    : 0;
  const currentPath = state.current ? path.join(VERSIONS_ROOT, String(state.current)) : null;
  return {
    current: state.current || "Unknown",
    candidate: state.pending || null,
    lastWorking: state.lastWorking || state.lastConfirmedWorking || state.previous || "Unknown",
    updates,
    logs,
    studioHealthy: !!(currentPath && fs.existsSync(path.join(currentPath, "package.json"))),
    forgeHealthy: fs.existsSync(FORGE_PATH),
    androidHealthy: fs.existsSync(ANDROID_ROOT),
    versions: getVersions()
  };
}

function openFolder(folderPath) {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  return shell.openPath(folderPath);
}

function startPowerShell(args, hidden = false) {
  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    ...args
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: hidden
  });
  child.unref();
}

function launchStudio(version) {
  const state = safeReadJson(STATE_PATH);
  const selected = version || state.current;
  if (!selected) throw new Error("No Studio version is selected.");
  const versionPath = path.join(VERSIONS_ROOT, String(selected));
  if (!fs.existsSync(path.join(versionPath, "package.json"))) {
    throw new Error(`Studio ${selected} is incomplete or missing.`);
  }
  const electron = findElectron(versionPath, String(state.projectRoot || PROJECT_ROOT));
  if (!electron) throw new Error("Electron could not be found in Studio or the project.");
  const child = spawn(electron, [versionPath], {
    cwd: versionPath,
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });
  child.unref();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 790,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#0c1711",
    title: "FriendshipTree Launcher",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile("index.html");
}

ipcMain.handle("project:export", () => {
  const exportScript = path.join(PROJECT_ROOT, "FriendshipTreeLauncher", "Export-ChatGPT-Project.ps1");
  if (!fs.existsSync(exportScript)) throw new Error("The ChatGPT Project exporter is missing.");
  startPowerShell(["-File", exportScript], false);
});
ipcMain.handle("status:get", () => getStatus());
ipcMain.handle("studio:launch", (_, version) => launchStudio(version));
ipcMain.handle("forge:open", () => {
  if (!fs.existsSync(FORGE_PATH)) throw new Error("The Forge script is missing.");
  startPowerShell(["-File", FORGE_PATH], false);
});
ipcMain.handle("folder:open", (_, key) => {
  const folders = {
    project: PROJECT_ROOT,
    android: ANDROID_ROOT,
    docs: DOCS_ROOT,
    inbox: INBOX_ROOT,
    versions: VERSIONS_ROOT,
    logs: LOGS_ROOT,
    forge: path.dirname(FORGE_PATH)
  };
  if (!folders[key]) throw new Error("Unknown folder.");
  return openFolder(folders[key]);
});
ipcMain.handle("logs:tail", () => {
  if (!fs.existsSync(LOGS_ROOT)) return [];
  const files = fs.readdirSync(LOGS_ROOT)
    .filter(n => n.toLowerCase().endsWith(".log"))
    .map(n => ({ n, p: path.join(LOGS_ROOT, n), m: fs.statSync(path.join(LOGS_ROOT, n)).mtimeMs }))
    .sort((a,b) => b.m-a.m);
  if (!files.length) return [];
  const lines = fs.readFileSync(files[0].p, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.slice(-8).reverse();
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
