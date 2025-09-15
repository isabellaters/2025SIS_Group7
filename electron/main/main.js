// electron/main/main.js
const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, screen } = require("electron");

let win = null;
const isDev = !app.isPackaged;

/** Create the single app window */
function createWindow() {
  if (win && !win.isDestroyed()) return;

  // Size & position so it can sit near the bottom of the screen (under Teams)
  const { workArea } = screen.getPrimaryDisplay();
  const WIDTH = Math.min(1100, workArea.width - 24);
  const HEIGHT = 260;
  const X = Math.round(workArea.x + (workArea.width - WIDTH) / 2);
  const Y = Math.round(workArea.y + workArea.height - HEIGHT - 24);

  // Optional preload (only if the file exists)
  const preloadPath = path.resolve(__dirname, "preload.js");
  const hasPreload = fs.existsSync(preloadPath);

  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: X,
    y: Y,
    show: false,             // show after first paint
    frame: true,             // keep the native titlebar (no duplicate custom bar)
    titleBarStyle: "default",
    backgroundColor: "#ffffff",
    resizable: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...(hasPreload ? { preload: preloadPath } : {}),
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => { win = null; });

  if (isDev) {
    // Vite dev server (hash router)
    win.loadURL("http://localhost:5173/#/");
    // Uncomment if you want to inspect:
    // win.webContents.openDevTools({ mode: "detach" });
  } else {
    // Load the built renderer (hash router still works on file://)
    const indexHtml = path.resolve(__dirname, "../../dist/index.html");
    // `hash: '/'` ensures we land on your app's root
    win.loadFile(indexHtml, { hash: "/" });
  }
}

/** Keep a single instance only */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    // Quit on all platforms except macOS (standard behavior)
    if (process.platform !== "darwin") app.quit();
  });
}
