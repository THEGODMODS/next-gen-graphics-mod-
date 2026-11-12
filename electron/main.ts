import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ModuleInstaller } from "../src/main/module-engine/installer";
import { JournalStore } from "../src/main/module-engine/journal";
import { parseModuleManifest } from "../src/main/module-engine/manifest";
import { normalizeSafeRelativePath, resolveInsideRoot } from "../src/main/module-engine/path-safety";
import { verifySha256 } from "../src/main/module-engine/sha256";
import { SiderConfigManager } from "../src/main/module-engine/sider-config";

let mainWindow: BrowserWindow | null = null;
let gameDirectory: string | null = null;
let pendingPackage: { root: string; id: string; version: string } | null = null;
let startupRecovery: { status: "not-needed" | "recovered" | "blocked"; files: string[]; message: string } =
  { status: "not-needed", files: [], message: "No recovery required." };

const stateDirectory = () => path.join(app.getPath("userData"), "manager-state");
const settingsPath = () => path.join(app.getPath("userData"), "manager-settings.json");

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
  if (!iniPath || !exists(iniPath)) return { liveCpkEnabled: false, luaEnabled: false, luaModules: [] as string[] };
  const content = fs.readFileSync(iniPath, "utf8");
  const values = (key: string) => content.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].trim().toLowerCase() !== key.toLowerCase()) return [];
    return [match[2].trim().replace(/^["']|["']$/g, "")];
  });
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
    gameDirectory: directory, gameExecutable, siderExecutable, siderIni,
    ...readSiderSettings(siderIni), startupRecovery
  };
}
function assertTrustedSender(event: Electron.IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? "";
  const trusted = app.isPackaged ? url.startsWith("file://") : url.startsWith("http://127.0.0.1:5173");
  if (!trusted) throw new Error("Blocked IPC from an untrusted renderer.");
}
async function persistGameDirectory(directory: string) {
  await fsp.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fsp.writeFile(settingsPath(), JSON.stringify({ gameDirectory: directory }, null, 2), "utf8");
}
async function loadAndRecover() {
  try {
    const raw = await fsp.readFile(settingsPath(), "utf8");
    const saved = JSON.parse(raw) as { gameDirectory?: unknown };
    if (typeof saved.gameDirectory === "string" && fs.existsSync(saved.gameDirectory)) gameDirectory = saved.gameDirectory;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      startupRecovery = { status: "blocked", files: [], message: "Saved game-folder settings could not be read. Select the game folder again." };
      return;
    }
  }
  if (!gameDirectory) return;
  try {
    const installer = new ModuleInstaller(gameDirectory, stateDirectory());
    const files = await installer.recoverPendingTransaction();
    startupRecovery = files.length
      ? { status: "recovered", files, message: `Recovered ${files.length} file(s) from an interrupted module installation.` }
      : { status: "not-needed", files: [], message: "No interrupted installation was found." };
  } catch (error) {
    startupRecovery = { status: "blocked", files: [], message: error instanceof Error ? error.message : "Automatic recovery failed." };
  }
}
function registerIpc() {
  ipcMain.handle("game:get-status", event => { assertTrustedSender(event); return getStatus(); });
  ipcMain.handle("game:choose-directory", async event => {
    assertTrustedSender(event);
    const result = await dialog.showOpenDialog(mainWindow!, { title: "Select your PES 2017 installation folder", properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return null;
    const selected = result.filePaths[0];
    if (!findFirst(selected, ["PES2017.exe", "PES2017patched.exe"])) throw new Error("That folder does not contain a PES 2017 executable.");
    gameDirectory = selected;
    pendingPackage = null;
    await persistGameDirectory(selected);
    await loadAndRecover();
    return gameDirectory;
  });
  ipcMain.handle("modules:preview", async event => {
    assertTrustedSender(event);
    if (!gameDirectory) throw new Error("Select your PES 2017 folder before previewing a module.");
    pendingPackage = null;
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select a module package folder containing module.json", properties: ["openDirectory"] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const packageRoot = await fsp.realpath(picked.filePaths[0]);
    const raw = await fsp.readFile(path.join(packageRoot, "module.json"), "utf8");
    const validation = parseModuleManifest(raw);
    if (!validation.valid || !validation.manifest) throw new Error(validation.errors.join("\n"));
    const manifest = validation.manifest;
    const journal = await new JournalStore(stateDirectory()).read();
    const installedIds = new Set(journal.modules.map(item => item.id));
    const missingDependencies = manifest.dependencies.filter(id => !installedIds.has(id));
    const conflicts = manifest.conflicts.filter(id => installedIds.has(id));
    const alreadyInstalled = installedIds.has(manifest.id);
    const gameRoot = await fsp.realpath(gameDirectory);
    const files = [];
    for (const entry of manifest.files) {
      const source = resolveInsideRoot(packageRoot, normalizeSafeRelativePath(entry.source));
      const sourceStat = await fsp.lstat(source);
      if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`Unsafe package payload: ${entry.source}`);
      if (!(await verifySha256(source, entry.sha256))) throw new Error(`Payload hash mismatch: ${entry.source}`);
      const targetRelative = normalizeSafeRelativePath(entry.target);
      const target = resolveInsideRoot(gameRoot, targetRelative);
      let action: "add" | "replace" = "add";
      try {
        const targetStat = await fsp.lstat(target);
        if (!targetStat.isFile() || targetStat.isSymbolicLink()) throw new Error(`Unsafe existing target: ${targetRelative}`);
        action = "replace";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      files.push({ source: entry.source, target: targetRelative, action });
    }
    for (const entry of manifest.luaModules) {
      const source = resolveInsideRoot(packageRoot, normalizeSafeRelativePath(entry.source));
      const sourceStat = await fsp.lstat(source);
      if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`Unsafe Lua payload: ${entry.source}`);
      if (!(await verifySha256(source, entry.sha256))) throw new Error(`Lua payload hash mismatch: ${entry.source}`);
      const targetRelative = normalizeSafeRelativePath("modules/" + entry.moduleName);
      const target = resolveInsideRoot(gameRoot, targetRelative);
      let action: "add" | "replace" = "add";
      try {
        const targetStat = await fsp.lstat(target);
        if (!targetStat.isFile() || targetStat.isSymbolicLink()) throw new Error(`Unsafe existing Lua target: ${targetRelative}`);
        action = "replace";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      files.push({ source: entry.source, target: targetRelative, action });
    }
    pendingPackage = { root: packageRoot, id: manifest.id, version: manifest.version };
    return { id: manifest.id, name: manifest.name, version: manifest.version, category: manifest.category,
      description: manifest.description, license: manifest.license, dependencies: manifest.dependencies,
      missingDependencies, conflicts, alreadyInstalled, files };
  });
  ipcMain.handle("modules:install-previewed", async event => {
    assertTrustedSender(event);
    if (!gameDirectory || !pendingPackage) throw new Error("Preview a module package again before installing.");
    const selected = pendingPackage;
    pendingPackage = null;
    const raw = await fsp.readFile(path.join(selected.root, "module.json"), "utf8");
    const validation = parseModuleManifest(raw);
    if (!validation.valid || !validation.manifest) throw new Error(validation.errors.join("\\n"));
    const manifest = validation.manifest;
    if (manifest.id !== selected.id || manifest.version !== selected.version) throw new Error("Package changed after preview. Preview it again.");
    const installer = new ModuleInstaller(gameDirectory, stateDirectory());
    return installer.install(selected.root, manifest, {
      approvedOverwriteTargets: manifest.files.map(file => normalizeSafeRelativePath(file.target))
    });
  });
  ipcMain.handle("sider:sync-livecpk", async event => {
    assertTrustedSender(event);
    if (!gameDirectory) throw new Error("Select your PES 2017 folder first.");
    const result = await new SiderConfigManager(gameDirectory, stateDirectory()).syncInstalledModules();
    return result;
  });
  ipcMain.handle("sider:launch", event => {
    assertTrustedSender(event);
    const status = getStatus();
    if (!status.siderExecutable) return { ok: false, message: "sider.exe was not found in the selected game folder." };
    if (!status.gameExecutable) return { ok: false, message: "PES2017.exe was not found. Check the selected folder." };
    try {
      const child = spawn(status.siderExecutable, [], { cwd: path.dirname(status.siderExecutable), detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
      return { ok: true, message: "Sider launched. Keep Sider running, then start PES 2017." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not launch Sider." };
    }
  });
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 720,
    backgroundColor: "#090d13", title: "PES 2017 Next Gen",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (app.isPackaged) void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  else void mainWindow.loadURL("http://127.0.0.1:5173");
}
app.whenReady().then(async () => {
  await loadAndRecover();
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
