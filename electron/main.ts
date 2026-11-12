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
let libraryPackages = new Map<string, string>();
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
async function assertNoSymlinkParents(root: string, relativePath: string) {
  const segments = normalizeSafeRelativePath(relativePath).split("/");
  let current = root;
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    try {
      const stat = await fsp.lstat(current);
      if (stat.isSymbolicLink()) throw new Error("Package payload path contains a symbolic link: " + relativePath);
      if (index < segments.length - 1 && !stat.isDirectory()) throw new Error("Package payload parent is not a directory: " + relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("Package payload is missing: " + relativePath);
      throw error;
    }
  }
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
  ipcMain.handle("modules:scan-library", async event => {
    assertTrustedSender(event);
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select a folder containing module packages", properties: ["openDirectory"] });
    if (picked.canceled || !picked.filePaths[0]) return [];
    const root = await fsp.realpath(picked.filePaths[0]);
    const entries = await fsp.readdir(root, { withFileTypes: true });
    const installed = await new JournalStore(stateDirectory()).read();
    const installedIds = new Set(installed.modules.map(item => item.id));
    const results: Array<{id:string;name:string;version:string;category:string;description:string;valid:boolean;errors:string[];files:number;missingDependencies:string[];conflicts:string[];alreadyInstalled:boolean}> = [];
    const next = new Map<string,string>();
    for (const entry of entries.filter(item => item.isDirectory() && !item.isSymbolicLink()).slice(0, 200)) {
      const packageRoot = path.join(root, entry.name);
      try {
        const manifestPath = path.join(packageRoot, "module.json");
        const stat = await fsp.lstat(manifestPath);
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const validation = parseModuleManifest(await fsp.readFile(manifestPath, "utf8"));
        if (!validation.valid || !validation.manifest) {
          results.push({ id: entry.name, name: entry.name, version: "—", category: "other", description: "Manifest validation failed.", valid: false, errors: validation.errors, files: 0, missingDependencies: [], conflicts: [], alreadyInstalled: false });
          continue;
        }
        const manifest = validation.manifest;
        const errors: string[] = [];
        const payloads = [...manifest.files, ...manifest.luaModules.map(item => ({ source: item.source, sha256: item.sha256 }))];
        for (const file of payloads) {
          try {
            const safeSource = normalizeSafeRelativePath(file.source);
            await assertNoSymlinkParents(packageRoot, safeSource);
            const source = resolveInsideRoot(packageRoot, safeSource);
            const sourceStat = await fsp.lstat(source);
            if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error("Not a regular file.");
            if (!(await verifySha256(source, file.sha256))) throw new Error("SHA-256 mismatch.");
          } catch (error) { errors.push(file.source + ": " + (error instanceof Error ? error.message : "invalid payload")); }
        }
        const missingDependencies = manifest.dependencies.filter(id => !installedIds.has(id));
        const conflicts = manifest.conflicts.filter(id => installedIds.has(id));
        const alreadyInstalled = installedIds.has(manifest.id);
        if (next.has(manifest.id)) errors.push("Duplicate module ID in library."); else next.set(manifest.id, packageRoot);
        results.push({ id: manifest.id, name: manifest.name, version: manifest.version, category: manifest.category, description: manifest.description, valid: errors.length === 0, errors, files: payloads.length, missingDependencies, conflicts, alreadyInstalled });
      } catch (error) {
        results.push({ id: entry.name, name: entry.name, version: "—", category: "other", description: "Could not inspect package.", valid: false, errors: [error instanceof Error ? error.message : "Unknown package error."], files: 0, missingDependencies: [], conflicts: [], alreadyInstalled: false });
      }
    }
    libraryPackages = next;
    return results;
  });
  ipcMain.handle("modules:preview", async (event, packageId?: unknown) => {
    assertTrustedSender(event);
    if (!gameDirectory) throw new Error("Select your PES 2017 folder before previewing a module.");
    pendingPackage = null;
    let packageRoot: string;
    if (packageId !== undefined) {
      if (typeof packageId !== "string" || !libraryPackages.has(packageId)) throw new Error("That library package is no longer available. Scan the library again.");
      packageRoot = await fsp.realpath(libraryPackages.get(packageId)!);
    } else {
      const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select a module package folder containing module.json", properties: ["openDirectory"] });
      if (picked.canceled || !picked.filePaths[0]) return null;
      packageRoot = await fsp.realpath(picked.filePaths[0]);
    }
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
      approvedOverwriteTargets: [...manifest.files.map(file => normalizeSafeRelativePath(file.target)), ...manifest.luaModules.map(module => normalizeSafeRelativePath("modules/" + module.moduleName))]
    });
  });
  ipcMain.handle("modules:list-installed", async event => {
    assertTrustedSender(event);
    return new JournalStore(stateDirectory()).read().then(journal => journal.modules.map(module => ({
      id: module.id, version: module.version, installedAt: module.installedAt,
      dependencies: module.dependencies ?? [],
      files: module.files.map(file => file.target),
      luaModules: module.files.map(file => file.target.replace(/\\/g, "/"))
        .filter(target => /^modules\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.lua$/i.test(target))
        .map(target => target.slice(8)),
    })));
  });
  ipcMain.handle("modules:uninstall", async (event, moduleId: unknown) => {
    assertTrustedSender(event);
    if (typeof moduleId !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(moduleId)) throw new Error("Invalid module ID.");
    if (!gameDirectory) throw new Error("Select your PES 2017 folder first.");
    const result = await new ModuleInstaller(gameDirectory, stateDirectory()).uninstall(moduleId);
    let siderSyncWarning: string | null = null;
    try { await new SiderConfigManager(gameDirectory, stateDirectory()).syncInstalledModules(); }
    catch (error) { siderSyncWarning = error instanceof Error ? error.message : "Sider synchronization failed."; }
    return { ...result, siderSyncWarning };
  });
  ipcMain.handle("modules:set-lua-enabled", async (event, moduleName: unknown, enabled: unknown) => {
    assertTrustedSender(event);
    if (typeof moduleName !== "string" || typeof enabled !== "boolean") throw new Error("Invalid module activation request.");
    if (!gameDirectory) throw new Error("Select your PES 2017 folder first.");
    return new SiderConfigManager(gameDirectory, stateDirectory()).setLuaModuleEnabled(moduleName, enabled);
  });
  ipcMain.handle("sider:sync-installed-modules", async event => {
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
