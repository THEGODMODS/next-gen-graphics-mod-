export type ModuleCategory =
  | "graphics" | "stadiums" | "kits" | "players" | "gameplay"
  | "audio" | "scoreboards" | "tifos" | "patches" | "other";

export interface ModuleFileEntry {
  source: string;
  target: string;
  sha256: string;
}

export interface LuaModuleEntry {
  source: string;
  moduleName: string;
  sha256: string;
}

export interface ModuleManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description: string;
  category: ModuleCategory;
  game: {
    title: "PES 2017";
    executable: string[];
    sider: string;
  };
  dependencies: string[];
  conflicts: string[];
  files: ModuleFileEntry[];
  luaModules: LuaModuleEntry[];
  license: {
    id: string;
    redistributionAllowed: boolean;
  };
}

export interface ManifestValidation {
  valid: boolean;
  errors: string[];
  manifest?: ModuleManifest;
}
