import { contextBridge, ipcRenderer } from "electron";

export type GameStatus = {
  gameDirectory: string | null;
  gameExecutable: string | null;
  siderExecutable: string | null;
  siderIni: string | null;
  liveCpkEnabled: boolean;
  luaEnabled: boolean;
  luaModules: string[];
};

const api = {
  getStatus: (): Promise<GameStatus> => ipcRenderer.invoke("game:get-status"),
  chooseGameDirectory: (): Promise<string | null> => ipcRenderer.invoke("game:choose-directory"),
  launchSider: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("sider:launch")
};

contextBridge.exposeInMainWorld("nextgen", api);