export interface AudioQaAsset { file: string; valid: boolean; durationSeconds?: number; peak?: number; rms?: number; clippedSamples?: number; errors: string[]; }
export interface AudioQaReport { valid: boolean; status: string; clubStingers: number; ambienceBeds: number; assets: AudioQaAsset[]; errors: string[]; }
export function auditAtmospherePack(root: string): Promise<AudioQaReport>;
