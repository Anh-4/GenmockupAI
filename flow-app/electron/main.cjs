// Electron "thin shell": loads the app from its hosted URL (GitHub Pages) so
// every launch picks up the latest deployed version — you update by pushing
// code; users get it next time they open the app. Falls back to the bundled
// copy when offline or the site is unreachable.
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

// URL GitHub Pages của app (username trên github.io luôn viết thường).
const APP_URL = "https://anh-4.github.io/GenmockupAI/";

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0e0e0e",
    autoHideMenuBar: true,
    title: "Mockup AI",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Avoid CORS issues calling the Gemini API from the renderer.
      webSecurity: false,
    },
  });

  win.removeMenu();

  const fallback = path.join(__dirname, "..", "dist", "index.html");
  const loadFallback = () => win.loadFile(fallback);

  // Prefer the live hosted version; fall back to the bundled build offline.
  win.loadURL(APP_URL).catch(loadFallback);
  win.webContents.on("did-fail-load", (_e, _code, _desc, _url, isMainFrame) => {
    if (isMainFrame) loadFallback();
  });

  // External links open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
