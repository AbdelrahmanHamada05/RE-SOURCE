// Electron main process: load the local game in a secure, fullscreen window.
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const settings = require("./desktop-settings.json");

app.setName(settings.appTitle);
app.setAppUserModelId(settings.appId);

ipcMain.on("re-source:get-settings", (event) => {
  event.returnValue = settings;
});

ipcMain.on("re-source:quit", () => {
  app.quit();
});

ipcMain.on("re-source:toggle-fullscreen", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.setFullScreen(!window.isFullScreen());
});

function createWindow() {
  const window = new BrowserWindow({
    title: settings.appTitle,
    width: settings.window.width,
    height: settings.window.height,
    minWidth: settings.window.minWidth,
    minHeight: settings.window.minHeight,
    fullscreen: settings.fullscreen,
    autoHideMenuBar: settings.autoHideMenuBar,
    backgroundColor: settings.backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.loadFile(path.join(__dirname, "..", "public", "mission-trainer.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
