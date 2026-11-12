import { contextBridge, ipcRenderer } from "electron";

export type RecoveryStatus = { status: "not-needed" | "recovered" | "blocked"; files: string[]; message: string };
export type ModulePreview = {
  id: string; name: string; version: string; category: string; description: string;
  license: { id: string; redistributionAllowed: boolean };
  dependencies: string[]; missingDependencies: string[]; conflicts: string[]; alreadyInstalled: boolean;
  files: Array<{ source: string; target: string; action: "add" | "replace" }>;
};
export type InstalledModule = { id: string; version: string; installedAt: string; files: string[]; luaModules: string[]; };
export type SiderSyncResult = { registeredRoots: string[]; registeredLuaModules: string[]; changed: boolean; backupPath: string | null };
export type GameStatus = {
  gameDirectory: string | null; gameExecutable: string | null; siderExecutable: string | null; siderIni: string | null;
  liveCpkEnabled: boolean; luaEnabled: boolean; luaModules: string[]; startupRecovery: RecoveryStatus;
};
const api = {
  getStatus: (): Promise<GameStatus> => ipcRenderer.invoke("game:get-status"),
  chooseGameDirectory: (): Promise<string | null> => ipcRenderer.invoke("game:choose-directory"),
  previewModule: (): Promise<ModulePreview | null> => ipcRenderer.invoke("modules:preview"),
  installPreviewedModule: (): Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }> => ipcRenderer.invoke("modules:install-previewed"),
  listInstalledModules: (): Promise<InstalledModule[]> => ipcRenderer.invoke("modules:list-installed"),
  setLuaModuleEnabled: (moduleName: string, enabled: boolean): Promise<SiderSyncResult> => ipcRenderer.invoke("modules:set-lua-enabled", moduleName, enabled),
  syncSiderModules: (): Promise<SiderSyncResult> => ipcRenderer.invoke("sider:sync-installed-modules"),
  launchSider: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("sider:launch")
};
contextBridge.exposeInMainWorld("nextgen", api);
