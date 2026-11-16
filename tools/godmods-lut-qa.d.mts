export interface CubeParseResult { valid: boolean; size?: number; entries: number; domainMin?: number[]; domainMax?: number[]; values: number[][]; errors: string[]; }
export interface LutQaReport { valid: boolean; status: string; profiles: number; luts: Array<{file:string;valid:boolean;lattice?:number;entries?:number;errors:string[]}>; colourSpaceVerified: false; errors: string[]; }
export function parseCube(text: string): CubeParseResult;
export function auditAllLutPacks(generatedRoot?: string): Promise<{valid:boolean;status:string;packs:LutQaReport[];errors:string[]}>;
export function auditLutPack(root: string): Promise<LutQaReport>;
