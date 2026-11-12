export type DdsAuditResult = { valid: boolean; width?: number; height?: number; mipCount?: number; format?: string; dataOffset?: number; bytes?: number; errors: string[] };
export function inspectDds(buffer: Buffer): DdsAuditResult;
