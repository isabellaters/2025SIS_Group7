// electron/main/main.js
const path = require("path");
const fs = require("fs");

// Safely import electron
let app, BrowserWindow, screen, ipcMain, desktopCapturer;
try {
  const electron = require("electron");
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  screen = electron.screen;
  ipcMain = electron.ipcMain;
  desktopCapturer = electron.desktopCapturer;
} catch (error) {
  console.error("Failed to load Electron:", error);
  process.exit(1);
}

let win = null;

/** Create the single app window */
function createWindow() {
  if (win && !win.isDestroyed()) return;

  const isDev = !app.isPackaged;

  // Default window size - reasonable dimensions for the app
  const { workArea } = screen.getPrimaryDisplay();
  const WIDTH = Math.min(1200, workArea.width - 100);
  const HEIGHT = Math.min(800, workArea.height - 100);
  const X = Math.round(workArea.x + (workArea.width - WIDTH) / 2);
  const Y = Math.round(workArea.y + (workArea.height - HEIGHT) / 2);

  // Preload script path
  const preloadPath = isDev
    ? path.resolve(__dirname, "../preload/index.js")
    : path.resolve(__dirname, "../preload/index.mjs");

  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: X,
    y: Y,
    minWidth: 800,           // Minimum width
    minHeight: 600,          // Minimum height
    show: false,             // show after first paint
    frame: true,             // keep the native titlebar (no duplicate custom bar)
    titleBarStyle: "default",
    backgroundColor: "#ffffff",
    resizable: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,          // Changed to false to allow desktopCapturer
      preload: preloadPath,
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

if (!app) {
  console.error("Electron app is not available");
  process.exit(1);
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

// Desktop Audio Capture - Get available audio sources
ipcMain.handle('get-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: true
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting audio sources:', error);
    throw error;
  }
});
