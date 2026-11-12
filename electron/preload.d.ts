import type { GameStatus, InstalledModule, LibraryPackage, ModulePreview, SiderSyncResult, UninstallResult } from "./preload";
declare global {
  interface Window {
    nextgen: {
      getStatus: () => Promise<GameStatus>;
      chooseGameDirectory: () => Promise<string | null>;
      scanModuleLibrary: () => Promise<LibraryPackage[]>;
      previewModule: (packageId?: string) => Promise<ModulePreview | null>;
      installPreviewedModule: () => Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }>;
      listInstalledModules: () => Promise<InstalledModule[]>;
      uninstallModule: (moduleId: string) => Promise<UninstallResult>;
      setLuaModuleEnabled: (moduleName: string, enabled: boolean) => Promise<SiderSyncResult>;
      syncSiderModules: () => Promise<SiderSyncResult>;
      launchSider: () => Promise<{ ok: boolean; message: string }>;
    };
  }
}
export {};
