// Expose only the small desktop API the game needs; keep Node integration disabled.
const { contextBridge, ipcRenderer } = require("electron");
const settings = ipcRenderer.sendSync("re-source:get-settings");

contextBridge.exposeInMainWorld("reSourceDesktop", Object.freeze({
  isDesktop: true,
  settings,
  quit: () => ipcRenderer.send("re-source:quit"),
  toggleFullscreen: () => ipcRenderer.send("re-source:toggle-fullscreen")
}));
