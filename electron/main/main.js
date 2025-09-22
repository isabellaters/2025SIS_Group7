// 1) IMPORTS FIRST — do not reference `app` before this line
const { app, BrowserWindow, screen } = require("electron");
const path = require("path");
const fs = require("fs");

let win = null;
const isDev = !app.isPackaged; // 2) Now it's safe to use `app`

// Keep width consistent with your UI
const WIDTH = 1100;
const MARGIN_BOTTOM = 0;

// Bottom-center position
function positionFor(height) {
  const { workArea } = screen.getPrimaryDisplay();
  const x = Math.round(workArea.x + (workArea.width - WIDTH) / 2);
  const y = Math.round(workArea.y + workArea.height - height - 24);
  return { x, y };
}

// Ask the renderer for the exact card height and fit window to it
async function fitToContent() {
  if (!win) return;
  try {
    const js = `
      (() => {
        const card = document.getElementById('ll-container');
        if (card) {
          const rect = card.getBoundingClientRect();
          return Math.ceil(rect.height);
        }
        const root = document.getElementById('root');
        const child = root && root.firstElementChild;
        if (child) {
          const rect = child.getBoundingClientRect();
          return Math.ceil(rect.height);
        }
        return Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 360);
      })()
    `;
    const cardH = await win.webContents.executeJavaScript(js, true);
    const { workArea } = screen.getPrimaryDisplay();
    const maxH = workArea.height - 24;
    const height = Math.min(Math.max(240, cardH + MARGIN_BOTTOM), maxH);
    const { x, y } = positionFor(height);

    win.setContentSize(WIDTH, height); // use content size (excludes titlebar)
    win.setPosition(x, y);
  } catch {
    // ignore during navigation/teardown
  }
}

// Simple debounce
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function createWindow() {
  const preloadPath = path.resolve(__dirname, "preload.js");
  const hasPreload = fs.existsSync(preloadPath);

  win = new BrowserWindow({
    width: WIDTH,
    height: 360,               // temp; will be fitted after load
    show: false,               // avoid flicker; show after first paint
    frame: true,               // keep native titlebar
    titleBarStyle: "default",
    backgroundColor: "#ffffff",
    useContentSize: true,      // IMPORTANT: sizes refer to web contents
    resizable: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...(hasPreload ? { preload: preloadPath } : {}),
    },
  });

  win.once("ready-to-show", () => {
    win.show();
    setTimeout(fitToContent, 80);
    setTimeout(fitToContent, 200); // second pass after fonts/layout settle
  });

  win.on("closed", () => { win = null; });

  if (isDev) {
    win.loadURL("http://localhost:5173/#/");
    // win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.resolve(__dirname, "../../dist/index.html");
    win.loadFile(indexHtml, { hash: "/" });
  }

  const refit = debounce(fitToContent, 80);
  win.webContents.on("did-finish-load", refit);
  win.webContents.on("did-navigate-in-page", refit);
  win.webContents.on("dom-ready", refit);
}

// Single instance guard — safe to call now that `app` exists
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
    if (process.platform !== "darwin") app.quit();
  });
}
