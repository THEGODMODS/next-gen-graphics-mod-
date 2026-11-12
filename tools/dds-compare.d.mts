export interface DdsChannelDifference {
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  maximumAbsoluteError: number;
}
export interface DdsComparison {
  compatibleForPixelComparison: true;
  width: number;
  height: number;
  format: string;
  analyzedMip: 0;
  pixelsCompared: number;
  changedPixelPercent: number;
  channels: Record<"R" | "G" | "B" | "A", DdsChannelDifference> | Record<"R" | "G", DdsChannelDifference>;
  limitations: string[];
}
export declare function compareDds(originalBuffer: Buffer, replacementBuffer: Buffer): DdsComparison;
