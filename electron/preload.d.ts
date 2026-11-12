import type { GameStatus, ModulePreview } from "./preload";
declare global {
  interface Window {
    nextgen: {
      getStatus: () => Promise<GameStatus>;
      chooseGameDirectory: () => Promise<string | null>;
      previewModule: () => Promise<ModulePreview | null>;
      installPreviewedModule: () => Promise<{ moduleId: string; installedFiles: string[]; backups: string[] }>;
      launchSider: () => Promise<{ ok: boolean; message: string }>;
    };
  }
}
export {};
