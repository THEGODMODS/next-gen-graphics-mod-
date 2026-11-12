export interface PitchInventoryRecord {
  path: string; extension?: string; bytes?: number; sha256?: string; kind?: string;
  warning?: string; dds?: { valid: boolean; format?: string; width?: number; height?: number; errors?: string[] };
}
export interface PitchInventory {
  schemaVersion: 1; stadiumFolder: string; stadiumRoot: string; subtree: string;
  fileCount: number; records: PitchInventoryRecord[];
}
declare const service: {
  scan(stadiumFolder: string, root: string): Promise<PitchInventory>;
  build(args: { stadiumFolder: string; inventory: PitchInventory; inventoryPath: string; replacementPath: string; moduleId: string; moduleName: string; outputParent: string }, root: string): Promise<{ moduleId: string; files: number; output: string }>;
};
export default service;
