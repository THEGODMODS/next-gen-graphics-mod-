export interface CompositeDdsOptions { opacity?: number; maskChannel?: "r" | "g" | "b" | "a"; }
export function compositeMaskedDds(base: Buffer, overlay: Buffer, mask: Buffer, options?: CompositeDdsOptions): Buffer;
