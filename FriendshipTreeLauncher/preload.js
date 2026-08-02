const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcher", {
  getStatus: () => ipcRenderer.invoke("status:get"),
  refreshAIWorkspace: () => ipcRenderer.invoke("ai-workspace:refresh"),
  validateAIWorkspace: () => ipcRenderer.invoke("ai-workspace:validate"),
  exportRequestedFile: () => ipcRenderer.invoke("ai-workspace:requested-file"),
  openAIWorkspace: () => ipcRenderer.invoke("ai-workspace:open"),
  copyAIInstructions: () => ipcRenderer.invoke("ai-workspace:copy-instructions"),
  exportProject: () => ipcRenderer.invoke("project:export"),
  launchStudio: version => ipcRenderer.invoke("studio:launch", version),
  openForge: () => ipcRenderer.invoke("forge:open"),
  openFolder: key => ipcRenderer.invoke("folder:open", key),
  getLogs: () => ipcRenderer.invoke("logs:tail"),
  buildStudioUpdate: () => ipcRenderer.invoke("studio-update:build"),
  scanDeliveries: () => ipcRenderer.invoke("delivery:scan"),
  installDelivery: packagePath => ipcRenderer.invoke("delivery:install", packagePath),
  sendBuiltApk: apkPath => ipcRenderer.invoke("delivery:send-built-apk", apkPath),
  openDeliveryFolder: key => ipcRenderer.invoke("delivery:open-folder", key),
  getGitHubBackupStatus: () => ipcRenderer.invoke("github-backup:status"),
  pushGitHubBackup: request => ipcRenderer.invoke("github-backup:push", request),
  onStudioUpdateProgress: callback => ipcRenderer.on("studio-update:progress", (_event, payload) => callback(payload)),
  onDeliveryProgress: callback => ipcRenderer.on("delivery:progress", (_event, payload) => callback(payload)),
  onGitHubBackupProgress: callback => ipcRenderer.on("github-backup:progress", (_event, payload) => callback(payload))
});
