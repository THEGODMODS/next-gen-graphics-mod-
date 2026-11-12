export interface DdsPngPreview {
  png: Buffer;
  width: number;
  height: number;
  format: string;
  previewMode: string;
}
export declare function ddsToPng(buffer: Buffer): DdsPngPreview;
