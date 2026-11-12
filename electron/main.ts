import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let gameDirectory: string | null = null;

function exists(filePath: string | null): boolean {
  return Boolean(filePath && fs.existsSync(filePath));
}

function findFirst(directory: string, names: string[]): string | null {
  for (const name of names) {
    const candidate = path.join(directory, name);
    if (exists(candidate)) return candidate;
  }
  return null;
}

function readSiderSettings(iniPath: string | null) {
  if (!iniPath || !exists(iniPath)) {
    return { liveCpkEnabled: false, luaEnabled: false, luaModules: [] as string[] };
  }
  const content = fs.readFileSync(iniPath, "utf8");
  const values = (key: string) => content.split(/\r?\n/)
    .filter(line => line.trim().toLowerCase().startsWith(key.toLowerCase() + "="))
    .map(line => line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""));
  return {
    liveCpkEnabled: values("livecpk.enabled").some(value => value === "1"),
    luaEnabled: values("lua.enabled").some(value => value === "1"),
    luaModules: values("lua.module")
  };
}

function getStatus() {
  const directory = gameDirectory;
  const gameExecutable = directory ? findFirst(directory, ["PES2017.exe", "PES2017patched.exe"]) : null;
  const siderExecutable = directory ? findFirst(directory, ["sider.exe"]) : null;
  const siderIni = directory ? findFirst(directory, ["sider.ini"]) : null;
  return {
    gameDirectory: directory,
    gameExecutable,
    siderExecutable,
    siderIni,
    ...readSiderSettings(siderIni)
  };
}

function assertTrustedSender(event: Electron.IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? "";
  const trusted = app.isPackaged ? url.startsWith("file://") : url.startsWith("http://127.0.0.1:5173");
  if (!trusted) throw new Error("Blocked IPC from an untrusted renderer.");
}

function registerIpc() {
  ipcMain.handle("game:get-status", event => {
    assertTrustedSender(event);
    return getStatus();
  });
  ipcMain.handle("game:choose-directory", async event => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Select your PES 2017 installation folder",
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    gameDirectory = result.filePaths[0];
    return gameDirectory;
  });
  ipcMain.handle("sider:launch", event => {
    assertTrustedSender(event);
    const status = getStatus();
    if (!status.siderExecutable) return { ok: false, message: "sider.exe was not found in the selected game folder." };
    if (!status.gameExecutable) return { ok: false, message: "PES2017.exe was not found. Check the selected folder." };
    try {
      const child = spawn(status.siderExecutable, [], {
        cwd: path.dirname(status.siderExecutable),
        detached: true,
        stdio: "ignore",
        windowsHide: false
      });
      child.unref();
      return { ok: true, message: "Sider launched. Keep Sider running, then start PES 2017." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not launch Sider." };
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#090d13",
    title: "PES 2017 Next Gen",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    void mainWindow.loadURL("http://127.0.0.1:5173");
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});