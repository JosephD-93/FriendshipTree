const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcher", {
  getStatus: () => ipcRenderer.invoke("status:get"),
  launchStudio: version => ipcRenderer.invoke("studio:launch", version),
  openForge: () => ipcRenderer.invoke("forge:open"),
  openFolder: key => ipcRenderer.invoke("folder:open", key),
  getLogs: () => ipcRenderer.invoke("logs:tail")
});
