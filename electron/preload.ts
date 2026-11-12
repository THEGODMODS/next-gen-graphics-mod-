import { contextBridge, ipcRenderer } from "electron";

export type DdsTexture = { file: string; width: number; height: number; format: string; mipCount: number; previewMode: string; previewBase64: string; channels: string; channelMean: number[]; channelMin: number[]; channelMax: number[]; alpha: { mean: number; below128Percent: number }; luminance?: { mean: number; standardDeviation: number }; reconstructedNormalLength?: { mean: number; standardDeviation: number; note: string } };
export type DdsComparison = { compatibleForPixelComparison: true; width: number; height: number; format: string; analyzedMip: 0; pixelsCompared: number; changedPixelPercent: number; channels: Record<string, { meanAbsoluteError: number; rootMeanSquareError: number; maximumAbsoluteError: number }>; limitations: string[] };
export type PitchInventoryRecord = { path: string; extension?: string; bytes?: number; sha256?: string; kind?: string; warning?: string; dds?: { valid: boolean; format?: string; width?: number; height?: number; errors?: string[] } };
export type PitchInventory = { schemaVersion: 1; stadiumFolder: string; stadiumRoot: string; subtree: string; fileCount: number; records: PitchInventoryRecord[] };
export type PitchLogReport = { schemaVersion: 1; totalLines: number; scannedLines: number; truncated: boolean; matchedLines: number; uniqueResources: number; issueLines: number; positiveLines: number; references: Array<{path:string;occurrences:number;issueOccurrences:number;positiveOccurrences:number}>; evidence: Array<{line:number;classification:"issue"|"positive"|"unclassified";text:string}>; limitations: string[] };
export type RecoveryStatus = { status: "not-needed" | "recovered" | "blocked"; files: string[]; message: string };
export type ModulePreview = {
  id: string; name: string; version: string; category: string; description: string;
  license: { id: string; redistributionAllowed: boolean };
  dependencies: string[]; missingDependencies: string[]; conflicts: string[]; alreadyInstalled: boolean;
  files: Array<{ source: string; target: string; action: "add" | "replace" }>;
};
export type LibraryPackage = { id: string; name: string; version: string; category: string; description: string; valid: boolean; errors: string[]; files: number; missingDependencies: string[]; conflicts: string[]; alreadyInstalled: boolean };
export type InstalledModule = { id: string; version: string; installedAt: string; dependencies: string[]; files: string[]; luaModules: string[]; };
export type UninstallResult = { removed: string[]; restored: string[]; preservedModified: string[]; siderSyncWarning: string | null };
export type SiderSyncResult = { registeredRoots: string[]; registeredLuaModules: string[]; changed: boolean; backupPath: string | null };
export type GameStatus = {
  gameDirectory: string | null; gameExecutable: string | null; siderExecutable: string | null; siderIni: string | null;
  liveCpkEnabled: boolean; luaEnabled: boolean; luaModules: string[]; startupRecovery: RecoveryStatus;
};
const api = {
  analyzeSiderPitchLog: (): Promise<{fileName:string;report:PitchLogReport} | null> => ipcRenderer.invoke("sider:analyze-pitch-log"),
  scanPitchFolder: (): Promise<PitchInventory | null> => ipcRenderer.invoke("pitch:scan"),
  choosePitchReplacement: (inventoryPath: string): Promise<string | null> => ipcRenderer.invoke("pitch:choose-replacement", inventoryPath),
  buildPitchModule: (args: { inventoryPath: string; moduleId: string; moduleName: string }): Promise<{ moduleId: string; files: number; output: string } | null> => ipcRenderer.invoke("pitch:build", args),
  chooseDds: (role: "original" | "replacement"): Promise<DdsTexture | null> => ipcRenderer.invoke("dds:choose", role),
  compareDds: (): Promise<DdsComparison> => ipcRenderer.invoke("dds:compare"),
  getStatus: (): Promise<GameStatus> => ipcRenderer.invoke("game:get-status"),
  chooseGameDirectory: (): Promise<string | null> => ipcRenderer.invoke("game:choose-directory"),
  scanModuleLibrary: (): Promise<LibraryPackage[]> => ipcRenderer.invoke("modules:scan-library"),
  previewModule: (packageId?: string): Promise<ModulePreview | null> => ipcRenderer.invoke("modules:preview", packageId),
  installPreviewedModule: (): Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }> => ipcRenderer.invoke("modules:install-previewed"),
  listInstalledModules: (): Promise<InstalledModule[]> => ipcRenderer.invoke("modules:list-installed"),
  uninstallModule: (moduleId: string): Promise<UninstallResult> => ipcRenderer.invoke("modules:uninstall", moduleId),
  setLuaModuleEnabled: (moduleName: string, enabled: boolean): Promise<SiderSyncResult> => ipcRenderer.invoke("modules:set-lua-enabled", moduleName, enabled),
  syncSiderModules: (): Promise<SiderSyncResult> => ipcRenderer.invoke("sider:sync-installed-modules"),
  launchSider: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("sider:launch")
};
contextBridge.exposeInMainWorld("nextgen", api);
