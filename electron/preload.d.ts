import type { GameStatus } from "./preload";

declare global {
  interface Window {
    nextgen: {
      getStatus: () => Promise<GameStatus>;
      chooseGameDirectory: () => Promise<string | null>;
      launchSider: () => Promise<{ ok: boolean; message: string }>;
    };
  }
}

export {};