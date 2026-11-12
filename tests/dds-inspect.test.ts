import { beforeAll, describe, expect, it } from "vitest";
import { importNativeModule } from "./helpers/native-esm";

function dds(fourcc, block) {
  const offset = fourcc === "DX10" ? 148 : 128;
  const buffer = Buffer.alloc(offset + block.length);
  buffer.write("DDS ", 0, "ascii");
  buffer.writeUInt32LE(124, 4);
  buffer.writeUInt32LE(0x1007, 8);
  buffer.writeUInt32LE(4, 12);
  buffer.writeUInt32LE(4, 16);
  buffer.writeUInt32LE(32, 76);
  buffer.writeUInt32LE(4, 80);
  buffer.write(fourcc, 84, "ascii");
  if (fourcc === "DX10") buffer.writeUInt32LE(98, 128);
  block.copy(buffer, offset);
  return buffer;
}
function bc3Block(red565 = 0xf800) {
  const b = Buffer.alloc(16);
  b[0] = 255; b[1] = 255;
  b.writeUInt16LE(red565, 8);
  b.writeUInt16LE(0, 10);
  b.writeUInt32LE(0, 12);
  return b;
}
let analyzeDds: typeof import("../tools/dds-inspect.mjs").analyzeDds;
beforeAll(async () => {
  ({ analyzeDds } = await importNativeModule("../tools/dds-inspect.mjs"));
});

describe("DDS pixel inspector", () => {
  it("reports base-level dimensions and red-channel statistics for BC3", () => {
    const result = analyzeDds(dds("DXT5", bc3Block()));
    expect(result.pixelsAnalyzed).toBe(16);
    expect(result.channelMean[0]).toBe(255);
    expect(result.channelMean[1]).toBe(0);
    expect(result.alpha.mean).toBe(255);
    expect(result.luminance.mean).toBeGreaterThan(50);
  });
  it("decodes BC2 alpha nibbles across all sixteen pixels", () => {
    const block = Buffer.alloc(16);
    block.writeBigUInt64LE(0xffffffffffffffffn, 0);
    block.writeUInt16LE(0xf800, 8);
    block.writeUInt16LE(0, 10);
    const result = analyzeDds(dds("DXT3", block));
    expect(result.alpha.mean).toBe(255);
  });
  it("reports BC5 RG channels and a clearly qualified normal diagnostic", () => {
    const block = Buffer.alloc(16);
    block[0] = 128; block[1] = 128;
    block[8] = 128; block[9] = 128;
    const result = analyzeDds(dds("ATI2", block));
    expect(result.channels).toContain("normal-map candidate");
    expect(result.channelMean).toEqual([128, 128]);
    expect(result.reconstructedNormalLength).toBeDefined();
  });
  it("does not misread signed BC5 as unsigned channel data", () => {
    expect(() => analyzeDds(dds("BC5S", Buffer.alloc(16)))).toThrow(/supports BC1/);
  });
  it("rejects DDS formats without a supported pixel decoder", () => {
    const block = Buffer.alloc(16);
    expect(() => analyzeDds(dds("DX10", block))).toThrow(/supports BC1/);
  });
});
