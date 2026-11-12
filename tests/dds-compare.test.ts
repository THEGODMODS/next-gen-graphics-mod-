import { describe, expect, it } from "vitest";
import { compareDds } from "../tools/dds-compare.mjs";

function dds(fourcc, block) {
  const buffer = Buffer.alloc(128 + block.length);
  buffer.write("DDS ", 0, "ascii"); buffer.writeUInt32LE(124, 4);
  buffer.writeUInt32LE(0x1007, 8); buffer.writeUInt32LE(4, 12); buffer.writeUInt32LE(4, 16);
  buffer.writeUInt32LE(32, 76); buffer.writeUInt32LE(4, 80); buffer.write(fourcc, 84, "ascii");
  block.copy(buffer, 128); return buffer;
}
function bc3(red565) {
  const block = Buffer.alloc(16); block[0] = 255; block[1] = 255;
  block.writeUInt16LE(red565, 8); block.writeUInt16LE(0, 10); return block;
}
describe("DDS decoded pixel comparison", () => {
  it("reports zero error for identical decoded pixels", () => {
    const file = dds("DXT5", bc3(0xf800));
    const result = compareDds(file, file);
    expect(result.pixelsCompared).toBe(16);
    expect(result.changedPixelPercent).toBe(0);
    expect(result.channels.R.meanAbsoluteError).toBe(0);
    expect(result.channels.A.rootMeanSquareError).toBe(0);
  });
  it("reports channel errors and changed-pixel percentage", () => {
    const result = compareDds(dds("DXT5", bc3(0xf800)), dds("DXT5", bc3(0x001f)));
    expect(result.changedPixelPercent).toBe(100);
    expect(result.channels.R.meanAbsoluteError).toBeGreaterThan(0);
    expect(result.channels.B.meanAbsoluteError).toBeGreaterThan(0);
  });
  it("rejects mismatched dimensions", () => {
    const small = dds("DXT5", bc3(0xf800));
    const large = Buffer.from(small); large.writeUInt32LE(8, 12);
    expect(() => compareDds(small, large)).toThrow(/dimensions differ/);
  });
  it("rejects mismatched formats", () => {
    expect(() => compareDds(dds("DXT5", bc3(0xf800)), dds("DXT1", Buffer.alloc(8)))).toThrow(/formats differ/);
  });
});
