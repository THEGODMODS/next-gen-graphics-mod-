import type { DdsComparison } from "../tools/dds-compare.mjs";
import type { DdsPixelAnalysis } from "../tools/dds-inspect.mjs";
import type { SiderPitchLogReport } from "../tools/sider-pitch-log.cjs";
export interface DdsTextureResult extends DdsPixelAnalysis { file: string; previewMode: string; previewBase64: string; }
declare const service: {
  inspect(filePath: string, root: string): Promise<DdsTextureResult>;
  compare(originalPath: string, replacementPath: string, root: string): Promise<DdsComparison>;
  analyzeLog(filePath: string, root: string): Promise<{ fileName: string; report: SiderPitchLogReport }>;
};
export default service;
