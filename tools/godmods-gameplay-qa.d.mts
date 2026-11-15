export interface GameplayQaReport { valid: boolean; status: string; profiles: number; scenarios: number; files: Array<{file:string;valid:boolean;errors:string[]}>; errors: string[]; }
export function auditGameplayPack(root: string): Promise<GameplayQaReport>;
