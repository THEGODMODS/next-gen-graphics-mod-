import { contextBridge, ipcRenderer } from "electron";

export type RecoveryStatus = { status: "not-needed" | "recovered" | "blocked"; files: string[]; message: string };
export type ModulePreview = {
  id: string; name: string; version: string; category: string; description: string;
  license: { id: string; redistributionAllowed: boolean };
  files: Array<{ source: string; target: string; action: "add" | "replace" }>;
};
export type GameStatus = {
  gameDirectory: string | null; gameExecutable: string | null; siderExecutable: string | null; siderIni: string | null;
  liveCpkEnabled: boolean; luaEnabled: boolean; luaModules: string[]; startupRecovery: RecoveryStatus;
};
const api = {
  getStatus: (): Promise<GameStatus> => ipcRenderer.invoke("game:get-status"),
  chooseGameDirectory: (): Promise<string | null> => ipcRenderer.invoke("game:choose-directory"),
  previewModule: (): Promise<ModulePreview | null> => ipcRenderer.invoke("modules:preview"),
  launchSider: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("sider:launch")
};
contextBridge.exposeInMainWorld("nextgen", api);
