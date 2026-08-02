const { app, BrowserWindow, ipcMain, shell , dialog, clipboard} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { screen } = require("electron");
const delivery = require("./delivery-pipeline");
const studioPackager = require("./studio-update-packager");
const githubBackup = require("./github-backup");

const PROJECT_ROOT = "C:\\Users\\Joe\\FriendshipTree";
const SYSTEM_ROOT = path.join(PROJECT_ROOT, "StudioSystem");
const STATE_PATH = path.join(SYSTEM_ROOT, "studio-state.json");
const VERSIONS_ROOT = path.join(SYSTEM_ROOT, "Versions");
const INBOX_ROOT = path.join(SYSTEM_ROOT, "Updates", "Inbox");
const LOGS_ROOT = path.join(SYSTEM_ROOT, "Logs");
const FORGE_PATH = path.join(SYSTEM_ROOT, "Bootstrap", "FriendshipTree-Forge.ps1");
const FORGE_COMMAND_PATH = path.join(SYSTEM_ROOT, "START FRIENDSHIPTREE FORGE.cmd");
const ANDROID_ROOT = path.join(PROJECT_ROOT, "android");
const DOCS_ROOT = path.join(PROJECT_ROOT, "Documentation");

let win;
let windowStateTimer = null;
const WINDOW_STATE_PATH = path.join(SYSTEM_ROOT, "launcher-window-state.json");

function readWindowBounds(defaults) {
  const saved = safeReadJson(WINDOW_STATE_PATH);
  if (![saved.x, saved.y, saved.width, saved.height].every(Number.isFinite)) return defaults;
  const candidate = { x: saved.x, y: saved.y, width: Math.max(520, saved.width), height: Math.max(480, saved.height) };
  const visible = screen.getAllDisplays().some(({ workArea }) =>
    candidate.x < workArea.x + workArea.width - 80 && candidate.x + candidate.width > workArea.x + 80 &&
    candidate.y < workArea.y + workArea.height - 80 && candidate.y + candidate.height > workArea.y + 80);
  return visible ? candidate : defaults;
}

function rememberWindowBounds(target) {
  clearTimeout(windowStateTimer);
  windowStateTimer = setTimeout(() => {
    if (!target || target.isDestroyed() || target.isMinimized() || target.isMaximized() || target.isFullScreen()) return;
    try {
      fs.mkdirSync(SYSTEM_ROOT, { recursive: true });
      fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(target.getBounds(), null, 2), "utf8");
    } catch {}
  }, 350);
}

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
  delivery.ensureDirs();
  const bounds = readWindowBounds({ width: 1180, height: 790 });
  win = new BrowserWindow({
    ...bounds,
    minWidth: 520,
    minHeight: 480,
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
  win.on("move", () => rememberWindowBounds(win));
  win.on("resize", () => rememberWindowBounds(win));
  win.on("close", () => rememberWindowBounds(win));
}

ipcMain.handle("project:export", () => {
  const exportScript = path.join(PROJECT_ROOT, "FriendshipTreeLauncher", "Export-ChatGPT-Project.ps1");
  if (!fs.existsSync(exportScript)) throw new Error("The ChatGPT Project exporter is missing.");
  startPowerShell(["-File", exportScript], false);
});
const aiWorkspace = require("./ai/workspace");

ipcMain.handle("ai-workspace:refresh", async () => {
  const result = aiWorkspace.refresh();
  shell.showItemInFolder(result.zipPath);
  return result;
});
ipcMain.handle("ai-workspace:validate", async () => {
  const result = aiWorkspace.validate();
  shell.showItemInFolder(path.join(aiWorkspace.AI_ROOT, "VALIDATION_REPORT.md"));
  return result;
});
ipcMain.handle("ai-workspace:open", async () => {
  await shell.openPath(aiWorkspace.AI_ROOT);
  return { ok: true };
});
ipcMain.handle("ai-workspace:copy-instructions", async () => {
  clipboard.writeText(aiWorkspace.PROJECT_INSTRUCTIONS);
  return { ok: true };
});
ipcMain.handle("ai-workspace:requested-file", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select the exact FriendshipTree file requested by the AI",
    defaultPath: PROJECT_ROOT,
    properties: ["openFile"]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const destination = aiWorkspace.exportRequestedFile(result.filePaths[0]);
  shell.showItemInFolder(destination);
  return { canceled: false, destination };
});
aiWorkspace.initialize();

ipcMain.handle("studio-update:build", async () => {
  const selected = await dialog.showOpenDialog({
    title: "Select the prepared FriendshipTree Studio folder",
    defaultPath: path.join(PROJECT_ROOT, "FriendshipTreeStudio"),
    properties: ["openDirectory"]
  });
  if (selected.canceled || !selected.filePaths[0]) return { canceled: true };
  const result = await studioPackager.buildStudioUpdate(selected.filePaths[0], {}, message => {
    try { win?.webContents?.send("studio-update:progress", { message, at: new Date().toISOString() }); } catch {}
  });
  const inspection = await delivery.inspect({ path: result.packagePath, name: path.basename(result.packagePath), source: "Launcher packager" });
  if (!inspection.ok) throw new Error(`The generated package failed validation: ${inspection.errors.join("; ")}`);
  return { ...result, canceled: false, validation: inspection };
});

ipcMain.handle("delivery:scan", async () => delivery.scan());
ipcMain.handle("delivery:install", async (_event, packagePath) => {
  return delivery.install(packagePath, message => {
    try { win?.webContents?.send("delivery:progress", { message, at: new Date().toISOString() }); } catch {}
  });
});
ipcMain.handle("delivery:send-built-apk", async (_event, apkPath) => {
  return delivery.installBuiltApk(message => {
    try { win?.webContents?.send("delivery:progress", { message, at: new Date().toISOString() }); } catch {}
  }, apkPath);
});
ipcMain.handle("delivery:open-folder", (_event, key) => {
  const folder = delivery.folders[key];
  if (!folder) throw new Error("Unknown delivery folder.");
  return openFolder(folder);
});

ipcMain.handle("status:get", () => getStatus());
ipcMain.handle("studio:launch", (_, version) => launchStudio(version));
ipcMain.handle("forge:open", async () => {
  if (!fs.existsSync(FORGE_PATH)) throw new Error("The Forge script is missing.");
  if (!fs.existsSync(FORGE_COMMAND_PATH)) {
    throw new Error("The Forge launch command is missing.");
  }
  const error = await shell.openPath(FORGE_COMMAND_PATH);
  if (error) throw new Error(`Forge could not be opened: ${error}`);
  return { ok: true };
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

ipcMain.handle("github-backup:status", async () => githubBackup.getStatus(PROJECT_ROOT));
ipcMain.handle("github-backup:push", async (_event, request) => {
  return githubBackup.commitAndPush(PROJECT_ROOT, request?.paths, request?.message, message => {
    try { win?.webContents?.send("github-backup:progress", { message, at: new Date().toISOString() }); } catch {}
  });
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
