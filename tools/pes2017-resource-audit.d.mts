export interface ResourceRecord {
  relativePath: string; bytes: number; extension: string; category: string;
  sha256: string | null; errors: string[];
  texture?: { valid: boolean; width?: number; height?: number; mipCount?: number; format?: string; errors: string[] };
}
export interface ResourceScanReport {
  schemaVersion: 1; generatedAt: string; scanMode: "read-only"; rootLabel: string;
  filesScanned: number; skippedSymlinks: number; limitReached: boolean;
  summary: Record<string, number>; records: ResourceRecord[];
}
export interface MappingValidation {
  valid: boolean; status: "blocked" | "resource-mapped-not-game-verified" | "in-game-verified";
  errors: string[];
  mappings: Array<{ index: number; targetRelativePath?: string | null; valid: boolean; errors: string[] }>;
}
export function scanResourceRoot(root: string): Promise<ResourceScanReport>;
export function validateBindingManifest(manifestPath: string, resourceRoot: string): Promise<MappingValidation>;
