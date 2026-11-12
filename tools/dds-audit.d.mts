export type DdsAuditResult = { valid: boolean; width?: number; height?: number; mipCount?: number; format?: string; dataOffset?: number; requiredPayloadBytes?: number; actualPayloadBytes?: number; bytes?: number; errors: string[] };
export function inspectDds(buffer: Buffer, totalBytes?: number): DdsAuditResult;
