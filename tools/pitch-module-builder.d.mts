export interface PitchModuleBuildResult { moduleId: string; files: number; output: string; manifest: Record<string, unknown>; }
export interface PitchModuleBuildOptions {
  descriptorPath: string;
  inventoryPath: string;
  outputPath: string;
  /** Optional live Stadium Server folder used to re-hash original resources before packaging. */
  stadiumFolder?: string;
  /** Refuse any existing output directory, including an empty one. */
  refuseExistingOutput?: boolean;
}
export function buildPitchModule(options: PitchModuleBuildOptions): Promise<PitchModuleBuildResult>;
