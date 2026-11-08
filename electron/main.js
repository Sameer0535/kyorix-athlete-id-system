const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1080,
    minHeight: 700,
    title: "Kyorix Athlete ID System - Accreditation Console",
    icon: path.join(__dirname, "../public/app-icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc",
    show: false,
  });

  // Default to the Admin Console URL directly
  const targetUrl = process.env.APP_URL || "https://kyorix-idcard.vercel.app/admin";
  
  mainWindow.loadURL(targetUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes("kyorix-idcard.vercel.app") && !url.includes("localhost")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single instance lock - prevent duplicate windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Set minimal application menu
    Menu.setApplicationMenu(null);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

