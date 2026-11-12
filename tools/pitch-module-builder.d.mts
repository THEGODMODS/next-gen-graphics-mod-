export interface PitchModuleBuildResult { moduleId: string; files: number; output: string; manifest: Record<string, unknown>; }
export function buildPitchModule(options: { descriptorPath: string; inventoryPath: string; outputPath: string }): Promise<PitchModuleBuildResult>;
