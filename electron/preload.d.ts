import type { GameStatus, InstalledModule, ModulePreview, SiderSyncResult } from "./preload";
declare global {
  interface Window {
    nextgen: {
      getStatus: () => Promise<GameStatus>;
      chooseGameDirectory: () => Promise<string | null>;
      previewModule: () => Promise<ModulePreview | null>;
      installPreviewedModule: () => Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }>;
      listInstalledModules: () => Promise<InstalledModule[]>;
      setLuaModuleEnabled: (moduleName: string, enabled: boolean) => Promise<SiderSyncResult>;
      syncSiderModules: () => Promise<SiderSyncResult>;
      launchSider: () => Promise<{ ok: boolean; message: string }>;
    };
  }
}
export {};
