import type { DdsComparison, DdsTexture, GameStatus, PitchInventory, PitchLogReport, InstalledModule, LibraryPackage, ModulePreview, SiderSyncResult, UninstallResult } from "./preload";
declare global {
  interface Window {
    nextgen: {
      analyzeSiderPitchLog: () => Promise<{ fileName: string; report: PitchLogReport } | null>;
      scanPitchFolder: () => Promise<PitchInventory | null>;
      choosePitchReplacement: (inventoryPath: string) => Promise<string | null>;
      buildPitchModule: (args: { inventoryPath: string; moduleId: string; moduleName: string }) => Promise<{ moduleId: string; files: number; output: string } | null>;
      chooseDds: (role: "original" | "replacement") => Promise<DdsTexture | null>;
      compareDds: () => Promise<DdsComparison>;
      getStatus: () => Promise<GameStatus>;
      chooseGameDirectory: () => Promise<string | null>;
      scanModuleLibrary: () => Promise<LibraryPackage[]>;
      previewModule: (packageId?: string) => Promise<ModulePreview | null>;
      installPreviewedModule: () => Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }>;
      listInstalledModules: () => Promise<InstalledModule[]>;
      uninstallModule: (moduleId: string) => Promise<UninstallResult>;
      setLuaModuleEnabled: (moduleName: string, enabled: boolean) => Promise<SiderSyncResult>;
      setPackageLuaEnabled: (moduleId: string, enabled: boolean) => Promise<SiderSyncResult>;
      syncSiderModules: () => Promise<SiderSyncResult>;
      launchSider: () => Promise<{ ok: boolean; message: string }>;
      openContentSource: (sourceId: string) => Promise<void>;
    };
  }
}
export {};
