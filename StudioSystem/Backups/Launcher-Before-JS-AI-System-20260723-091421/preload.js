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
  getLogs: () => ipcRenderer.invoke("logs:tail")
});
