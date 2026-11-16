import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ddsService from "./dds-service.cjs";
import pitchService from "./pitch-workflow.cjs";
import { ModuleInstaller } from "../src/main/module-engine/installer";
import { JournalStore } from "../src/main/module-engine/journal";
import { parseModuleManifest } from "../src/main/module-engine/manifest";
import { normalizeSafeRelativePath, resolveInsideRoot } from "../src/main/module-engine/path-safety";
import { verifySha256 } from "../src/main/module-engine/sha256";
import { SiderConfigManager } from "../src/main/module-engine/sider-config";

let mainWindow: BrowserWindow | null = null;
let startupReady: Promise<void> = Promise.resolve();
// Keep the pre-redesign per-user data location so saved game paths, journals and backups survive the product rename.
app.setPath("userData", path.join(app.getPath("appData"), "THEGODMODS PES 2017 Next Gen Graphics Manager"));
let gameDirectory: string | null = null;
let pendingPackage: { root: string; id: string; version: string } | null = null;
let libraryPackages = new Map<string, string>();
let selectedDds: { original: string | null; replacement: string | null } = { original: null, replacement: null };
let selectedPitchInventory: Awaited<ReturnType<typeof pitchService.scan>> | null = null;
let selectedPitchReplacement: string | null = null;
let selectedResourceInventory: unknown = null;
let startupRecovery: { status: "not-needed" | "recovered" | "blocked"; files: string[]; message: string } =
  { status: "not-needed", files: [], message: "No recovery required." };

const stateDirectory = () => path.join(app.getPath("userData"), "manager-state");
const settingsPath = () => path.join(app.getPath("userData"), "manager-settings.json");
// Portable release stores content beside the GODMODS Tool folder, outside app.asar.
const distributionRoot = () => app.isPackaged
  ? path.resolve(path.dirname(app.getPath("exe")), "..")
  : app.getAppPath();

async function findFirst(directory: string, names: string[]): Promise<string | null> {
  for (const name of names) {
    const candidate = path.join(directory, name);
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
    }
  }
  return null;
}
async function readSiderSettings(iniPath: string | null) {
  if (!iniPath) return { liveCpkEnabled: false, luaEnabled: false, luaModules: [] as string[] };
  let content: string;
  try { content = await fsp.readFile(iniPath, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { liveCpkEnabled: false, luaEnabled: false, luaModules: [] as string[] }; throw error; }
  const values = (key: string) => content.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].trim().toLowerCase() !== key.toLowerCase()) return [];
    return [match[2].trim().replace(/^[\"']|[\"']$/g, "")];
  });
  return { liveCpkEnabled: values("livecpk.enabled").some(value => value === "1"), luaEnabled: values("lua.enabled").some(value => value === "1"), luaModules: values("lua.module") };
}
async function getStatus() {
  await startupReady;
  const directory = gameDirectory;
  const [gameExecutable, siderExecutable, siderIni] = directory ? await Promise.all([findFirst(directory, ["PES2017.exe", "PES2017patched.exe"]), findFirst(directory, ["sider.exe"]), findFirst(directory, ["sider.ini"])]) : [null, null, null];
  return { gameDirectory: directory, gameExecutable, siderExecutable, siderIni, ...await readSiderSettings(siderIni), startupRecovery };
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
function isTrustedRendererUrl(value: string): boolean {
  if (app.isPackaged) {
    return value === pathToFileURL(path.join(__dirname, "../../dist/index.html")).href;
  }
  try {
    const candidate = new URL(value);
    return candidate.origin === "http://127.0.0.1:5173" &&
      (candidate.pathname === "/" || candidate.pathname === "/index.html");
  } catch {
    return false;
  }
}
function assertTrustedSender(event: Electron.IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? "";
  if (!isTrustedRendererUrl(url)) throw new Error("Blocked IPC from an untrusted renderer.");
}
async function persistGameDirectory(directory: string) {
  await fsp.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fsp.writeFile(settingsPath(), JSON.stringify({ gameDirectory: directory }, null, 2), "utf8");
}
async function loadAndRecover() {
  try {
    const raw = await fsp.readFile(settingsPath(), "utf8");
    const saved = JSON.parse(raw) as { gameDirectory?: unknown };
    if (typeof saved.gameDirectory === "string") { try { const stat = await fsp.stat(saved.gameDirectory); if (stat.isDirectory()) gameDirectory = saved.gameDirectory; } catch { /* Missing saved path: leave the game unconfigured. */ } }
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
  ipcMain.handle("content:open-source", async (event, sourceId: unknown) => {
    assertTrustedSender(event);
    const sources: Record<string, string> = {
      pesmodding: "https://www.pesmodding.com/p/pes-2017.html",
      moddingway: "https://www.moddingway.com/game/387/pro-evolution-soccer-2017/mods",
      nexus: "https://www.nexusmods.com/pes2017/mods/top",
      profacemods: "https://profacemods.com/",
      "gfx-pitch-2026": "https://pes-files.com/pes-2017-gfx-pitch-from-efootball-2026/",
      "gfx-combined-2025": "https://pes-files.com/pes-2017-gfx-combined-update-2024-2025/",
      "pesfiles-graphics": "https://pes-files.com/pes2017/pes2017-graphics-mod/"
    };
    if (typeof sourceId !== "string" || !Object.prototype.hasOwnProperty.call(sources, sourceId)) {
      throw new Error("Unknown community content source.");
    }
    await shell.openExternal(sources[sourceId]);
  });
  ipcMain.handle("sider:analyze-pitch-log", async event => {
    assertTrustedSender(event);
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select Sider log file (usually sider.log)", properties: ["openFile"], filters: [{ name: "Log files", extensions: ["log", "txt"] }] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const logPath = picked.filePaths[0];
    return ddsService.analyzeLog(logPath, app.getAppPath());
  });
  ipcMain.handle("resources:scan-game", async event => {
    assertTrustedSender(event);
    if (!gameDirectory) throw new Error("Select your PES 2017 game folder before scanning resources.");
    const reportPath = path.join(stateDirectory(), "resource-inventory.json");
    await fsp.mkdir(stateDirectory(), { recursive: true });
    await fsp.rm(reportPath, { force: true });
    const auditScript = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "tools", "pes2017-resource-audit.mjs")
      : path.join(app.getAppPath(), "tools", "pes2017-resource-audit.mjs");
    const child = spawn(process.execPath, [auditScript, "scan", gameDirectory, reportPath], {
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    });
    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", chunk => { stderr += String(chunk); });
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", code => resolve(code ?? 1));
    });
    if (exitCode !== 0) throw new Error(stderr.trim() || "Resource scanner exited with code " + exitCode + ".");
    const report = JSON.parse(await fsp.readFile(reportPath, "utf8"));
    selectedResourceInventory = report;
    return {
      rootLabel: report.rootLabel, generatedAt: report.generatedAt,
      filesScanned: report.filesScanned, skippedSymlinks: report.skippedSymlinks,
      limitReached: report.limitReached, summary: report.summary
    };
  });
  ipcMain.handle("resources:export-inventory", async event => {
    assertTrustedSender(event);
    if (!selectedResourceInventory) throw new Error("Run a resource scan before exporting the inventory.");
    const picked = await dialog.showSaveDialog(mainWindow!, {
      title: "Export GODMODS PES 2017 resource inventory",
      defaultPath: "GODMODS-PES2017-Resource-Inventory.json",
      filters: [{ name: "JSON inventory", extensions: ["json"] }]
    });
    if (picked.canceled || !picked.filePath) return null;
    await fsp.writeFile(picked.filePath, JSON.stringify(selectedResourceInventory, null, 2), "utf8");
    return picked.filePath;
  });
  ipcMain.handle("pitch:scan", async event => {
    assertTrustedSender(event);
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select Stadium Server stadium folder", properties: ["openDirectory"] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const inventory = await pitchService.scan(picked.filePaths[0], app.getAppPath());
    selectedPitchInventory = inventory;
    selectedPitchReplacement = null;
    return inventory;
  });
  ipcMain.handle("pitch:choose-replacement", async (event, inventoryPath: unknown) => {
    assertTrustedSender(event);
    if (!selectedPitchInventory || typeof inventoryPath !== "string") throw new Error("Scan a Stadium Server folder and select a pitch resource first.");
    const record = selectedPitchInventory.records.find(item => item.path === inventoryPath && typeof item.sha256 === "string");
    if (!record) throw new Error("Selected pitch resource is not part of the current inventory.");
    const extension = path.extname(record.path).slice(1).toLowerCase();
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Choose replacement for " + record.path, properties: ["openFile"], filters: [{ name: extension.toUpperCase() + " replacement", extensions: [extension] }] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    selectedPitchReplacement = picked.filePaths[0];
    return path.basename(selectedPitchReplacement);
  });
  ipcMain.handle("pitch:build", async (event, args: { inventoryPath?: unknown; moduleId?: unknown; moduleName?: unknown }) => {
    assertTrustedSender(event);
    if (!selectedPitchInventory || !selectedPitchReplacement) throw new Error("Scan a stadium folder, select a resource and choose its replacement first.");
    if (typeof args?.inventoryPath !== "string" || typeof args?.moduleId !== "string" || typeof args?.moduleName !== "string") throw new Error("Invalid pitch module details.");
    const picked = await dialog.showOpenDialog(mainWindow!, { title: "Choose parent folder for the generated module", properties: ["openDirectory", "createDirectory"] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const result = await pitchService.build({ stadiumFolder: selectedPitchInventory.stadiumRoot, inventory: selectedPitchInventory, inventoryPath: args.inventoryPath, replacementPath: selectedPitchReplacement, moduleId: args.moduleId, moduleName: args.moduleName, outputParent: picked.filePaths[0] }, app.getAppPath());
    selectedPitchReplacement = null;
    libraryPackages.set(result.moduleId, result.output);
    return result;
  });
  ipcMain.handle("dds:choose", async (event, role: "original" | "replacement") => {
    assertTrustedSender(event);
    if (role !== "original" && role !== "replacement") throw new Error("Invalid DDS selection role.");
    const picked = await dialog.showOpenDialog(mainWindow!, { title: role === "original" ? "Choose original DDS texture" : "Choose replacement DDS texture", properties: ["openFile"], filters: [{ name: "DirectDraw Surface", extensions: ["dds"] }] });
    if (picked.canceled || !picked.filePaths[0]) return null;
    const result = await ddsService.inspect(picked.filePaths[0], app.getAppPath());
    selectedDds[role] = picked.filePaths[0];
    return result;
  });
  ipcMain.handle("dds:compare", async event => {
    assertTrustedSender(event);
    if (!selectedDds.original || !selectedDds.replacement) throw new Error("Choose both original and replacement DDS textures first.");
    return ddsService.compare(selectedDds.original, selectedDds.replacement, app.getAppPath());
  });
  ipcMain.handle("game:get-status", async event => { assertTrustedSender(event); return getStatus(); });
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
    // Prefer the first-party GODMODS packages bundled with the installed app.
    // Fall back to a user-selected folder for community/local modules.
    const bundledRoot = path.join(distributionRoot(), "content", "packs");
    let root: string;
    try {
      const bundledStat = await fsp.stat(bundledRoot);
      if (!bundledStat.isDirectory()) throw new Error("Bundled package folder is unavailable.");
      root = await fsp.realpath(bundledRoot);
    } catch {
      const picked = await dialog.showOpenDialog(mainWindow!, { title: "Select a folder containing module packages", properties: ["openDirectory"] });
      if (picked.canceled || !picked.filePaths[0]) return [];
      root = await fsp.realpath(picked.filePaths[0]);
    }
    const entries = await fsp.readdir(root, { withFileTypes: true });
    const installed = await new JournalStore(stateDirectory()).read();
    const installedIds = new Set(installed.modules.map(item => item.id));
    const results: Array<{id:string;name:string;version:string;category:string;description:string;valid:boolean;errors:string[];files:number;missingDependencies:string[];conflicts:string[];alreadyInstalled:boolean;enabled:boolean}> = [];
    const next = new Map<string,string>();
    for (const entry of entries.filter(item => item.isDirectory() && !item.isSymbolicLink()).slice(0, 200)) {
      const packageRoot = path.join(root, entry.name);
      try {
        const manifestPath = path.join(packageRoot, "module.json");
        const stat = await fsp.lstat(manifestPath);
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        const validation = parseModuleManifest(await fsp.readFile(manifestPath, "utf8"));
        if (!validation.valid || !validation.manifest) {
          results.push({ id: entry.name, name: entry.name, version: "—", category: "other", description: "Manifest validation failed.", valid: false, errors: validation.errors, files: 0, missingDependencies: [], conflicts: [], alreadyInstalled: false, enabled: false });
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
        const conflicts: string[] = [];
        for (const id of manifest.conflicts) {
          const conflictingRecord = installed.modules.find(item => item.id === id);
          if (!conflictingRecord) continue;
          const marker = conflictingRecord.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
          let conflictEnabled = true;
          if (marker && gameDirectory) {
            try {
              const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
              conflictEnabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
            } catch { conflictEnabled = false; }
          }
          if (conflictEnabled) conflicts.push(id);
        }
        for (const installedRecord of installed.modules) {
          if (!installedRecord.conflicts?.includes(manifest.id) || conflicts.includes(installedRecord.id)) continue;
          const marker = installedRecord.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
          let conflictEnabled = true;
          if (marker && gameDirectory) {
            try {
              const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
              conflictEnabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
            } catch { conflictEnabled = false; }
          }
          if (conflictEnabled) conflicts.push(installedRecord.id);
        }
        const alreadyInstalled = installedIds.has(manifest.id);
        let enabled = true;
        if (alreadyInstalled) {
          const installedRecord = installed.modules.find(item => item.id === manifest.id);
          const marker = installedRecord?.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
          if (marker && gameDirectory) {
            try {
              const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
              enabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
            } catch { enabled = false; }
          }
        }
        if (next.has(manifest.id)) errors.push("Duplicate module ID in library."); else next.set(manifest.id, packageRoot);
        results.push({ id: manifest.id, name: manifest.name, version: manifest.version, category: manifest.category, description: manifest.description, valid: errors.length === 0, errors, files: payloads.length, missingDependencies, conflicts, alreadyInstalled, enabled });
      } catch (error) {
        results.push({ id: entry.name, name: entry.name, version: "—", category: "other", description: "Could not inspect package.", valid: false, errors: [error instanceof Error ? error.message : "Unknown package error."], files: 0, missingDependencies: [], conflicts: [], alreadyInstalled: false, enabled: false });
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
    const conflicts: string[] = [];
    for (const id of manifest.conflicts) {
      const conflictingRecord = journal.modules.find(item => item.id === id);
      if (!conflictingRecord) continue;
      const marker = conflictingRecord.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
      let conflictEnabled = true;
      if (marker) {
        try {
          const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
          conflictEnabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
        } catch { conflictEnabled = false; }
      }
      if (conflictEnabled) conflicts.push(id);
    }
    for (const installedRecord of journal.modules) {
      if (!installedRecord.conflicts?.includes(manifest.id) || conflicts.includes(installedRecord.id)) continue;
      const marker = installedRecord.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
      let conflictEnabled = true;
      if (marker) {
        try {
          const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
          conflictEnabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
        } catch { conflictEnabled = false; }
      }
      if (conflictEnabled) conflicts.push(installedRecord.id);
    }
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
      description: manifest.description, license: manifest.license, deployment: manifest.deployment ?? { strategy: "direct", manualSteps: [] }, dependencies: manifest.dependencies,
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
    const initialJournal = await new JournalStore(stateDirectory()).read();
    const installedIds = new Set(initialJournal.modules.map(item => item.id));
    const newlyInstalledDependencies: string[] = [];
    const visiting = new Set<string>();
    const ensureDependency = async (dependencyId: string): Promise<void> => {
      if (installedIds.has(dependencyId)) return;
      if (visiting.has(dependencyId)) throw new Error("Circular package dependency detected: " + dependencyId);
      const dependencyRoot = libraryPackages.get(dependencyId);
      if (!dependencyRoot) throw new Error("Required GODMODS dependency is missing from the bundled library: " + dependencyId);
      visiting.add(dependencyId);
      const dependencyRaw = await fsp.readFile(path.join(dependencyRoot, "module.json"), "utf8");
      const dependencyValidation = parseModuleManifest(dependencyRaw);
      if (!dependencyValidation.valid || !dependencyValidation.manifest || dependencyValidation.manifest.id !== dependencyId) {
        throw new Error("Required dependency package is invalid: " + dependencyId);
      }
      const dependencyManifest = dependencyValidation.manifest;
      for (const nestedDependency of dependencyManifest.dependencies) await ensureDependency(nestedDependency);
      await installer.install(dependencyRoot, dependencyManifest, {
        approvedOverwriteTargets: [...dependencyManifest.files.map(file => normalizeSafeRelativePath(file.target)), ...dependencyManifest.luaModules.map(module => normalizeSafeRelativePath("modules/" + module.moduleName))]
      });
      installedIds.add(dependencyId);
      newlyInstalledDependencies.push(dependencyId);
      visiting.delete(dependencyId);
    };

    let productInstalled = false;
    try {
      for (const dependencyId of manifest.dependencies) await ensureDependency(dependencyId);
      const installed = await installer.install(selected.root, manifest, {
        approvedOverwriteTargets: [...manifest.files.map(file => normalizeSafeRelativePath(file.target)), ...manifest.luaModules.map(module => normalizeSafeRelativePath("modules/" + module.moduleName))]
      });
      productInstalled = true;
      if (manifest.luaModules.length > 0 || newlyInstalledDependencies.length > 0) {
        await new SiderConfigManager(gameDirectory, stateDirectory()).syncInstalledModules();
      }
      return installed;
    } catch (installError) {
      try {
        if (productInstalled) await installer.uninstall(manifest.id);
        for (const dependencyId of [...newlyInstalledDependencies].reverse()) await installer.uninstall(dependencyId);
        if (manifest.luaModules.length > 0 || newlyInstalledDependencies.length > 0) {
          await new SiderConfigManager(gameDirectory, stateDirectory()).syncInstalledModules();
        }
      } catch (rollbackError) {
        throw new Error("GODMODS installation failed and automatic dependency rollback was incomplete. Keep manager state/backups intact and run recovery before launching PES 2017. Install error: " +
          (installError instanceof Error ? installError.message : String(installError)) + "; rollback error: " +
          (rollbackError instanceof Error ? rollbackError.message : String(rollbackError)));
      }
      throw installError;
    }
  });
  ipcMain.handle("modules:list-installed", async event => {
    assertTrustedSender(event);
    const journal = await new JournalStore(stateDirectory()).read();
    return Promise.all(journal.modules.map(async module => {
      const marker = module.files.find(file => file.target.replace(/\\/g, "/").toLowerCase().endsWith("/enabled.ini"));
      let enabled = true;
      if (marker && gameDirectory) {
        try {
          const markerPath = path.join(gameDirectory, ...marker.target.replace(/\\/g, "/").split("/"));
          enabled = /^\s*enabled\s*=\s*1\s*$/mi.test(await fsp.readFile(markerPath, "utf8"));
        } catch { enabled = false; }
      }
      return {
        id: module.id, version: module.version, installedAt: module.installedAt, enabled,
        dependencies: module.dependencies ?? [],
        files: module.files.map(file => file.target),
        backupCount: module.files.filter(file => Boolean(file.backupPath)).length,
        luaModules: module.files.map(file => file.target.replace(/\\/g, "/"))
          .filter(target => /^modules\\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.lua$/i.test(target))
          .map(target => target.slice(8)),
      };
    }));
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
  ipcMain.handle("modules:set-package-lua-enabled", async (event, moduleId: unknown, enabled: unknown) => {
    assertTrustedSender(event);
    if (typeof moduleId !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(moduleId) || typeof enabled !== "boolean") throw new Error("Invalid package activation request.");
    if (!gameDirectory) throw new Error("Select your PES 2017 folder first.");
    await new ModuleInstaller(gameDirectory, stateDirectory()).setPackageEnabled(moduleId, enabled);
    return { enabled };
  });
  ipcMain.handle("modules:apply-lua-profile", async (event, enabledModuleNames: unknown) => {
    assertTrustedSender(event);
    if (!Array.isArray(enabledModuleNames) || enabledModuleNames.length > 1000 || enabledModuleNames.some(name => typeof name !== "string")) {
      throw new Error("Invalid Lua activation profile.");
    }
    if (!gameDirectory) throw new Error("Select your PES 2017 folder first.");
    return new SiderConfigManager(gameDirectory, stateDirectory()).applyLuaActivationProfile(enabledModuleNames);
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
  ipcMain.handle("sider:launch", async event => {
    assertTrustedSender(event);
    const status = await getStatus();
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
    width: 1600, height: 1000, minWidth: 900, minHeight: 680, show: false,
    backgroundColor: "#090b0d", title: "GODMODS Manager",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.once("ready-to-show", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("render-process-gone", (_event, details) => { console.error("GODMODS Manager renderer exited:", details.reason, details.exitCode); });
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isTrustedRendererUrl(navigationUrl)) event.preventDefault();
  });
  if (app.isPackaged) void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  else void mainWindow.loadURL("http://127.0.0.1:5173");
}
app.whenReady().then(() => {
  app.setName("GODMODS Manager");
  registerIpc();
  createWindow();
  startupReady = loadAndRecover();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
