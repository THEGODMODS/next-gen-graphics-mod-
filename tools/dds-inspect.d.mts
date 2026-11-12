export interface DdsPixelAnalysis {
  file?: string;
  width: number;
  height: number;
  format: string;
  mipCount: number;
  analyzedMip: 0;
  pixelsAnalyzed: number;
  channels: string;
  channelMean: number[];
  channelMin: number[];
  channelMax: number[];
  alpha: { mean: number; below128Percent: number };
  luminance?: { mean: number; standardDeviation: number };
  reconstructedNormalLength?: {
    mean: number;
    standardDeviation: number;
    note: string;
  };
}
export declare function analyzeDds(buffer: Buffer): DdsPixelAnalysis;
export declare function analyzeDdsFile(filePath: string): Promise<DdsPixelAnalysis>;
