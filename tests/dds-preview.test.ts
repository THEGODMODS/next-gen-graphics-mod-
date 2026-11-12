import { describe, expect, it } from "vitest";
import { ddsToPng } from "../tools/dds-preview.mjs";

function dds(fourcc, block) {
  const buffer=Buffer.alloc(128+block.length);
  buffer.write("DDS ",0,"ascii"); buffer.writeUInt32LE(124,4); buffer.writeUInt32LE(0x1007,8);
  buffer.writeUInt32LE(4,12); buffer.writeUInt32LE(4,16); buffer.writeUInt32LE(32,76);
  buffer.writeUInt32LE(4,80); buffer.write(fourcc,84,"ascii"); block.copy(buffer,128); return buffer;
}
function bc3() {
  const b=Buffer.alloc(16); b[0]=255; b[1]=255; b.writeUInt16LE(0xf800,8); return b;
}
describe("DDS PNG preview",()=>{
  it("writes a valid PNG signature and dimensions for BC3",()=>{
    const result=ddsToPng(dds("DXT5",bc3()));
    expect(result.png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
    expect(result.png.toString("ascii",12,16)).toBe("IHDR");
    expect(result.png.readUInt32BE(16)).toBe(4);
    expect(result.png.readUInt32BE(20)).toBe(4);
    expect(result.previewMode).toContain("RGBA");
  });
  it("labels BC5 output as false-colour RG rather than a normal-map verdict",()=>{
    const b=Buffer.alloc(16); b[0]=128; b[1]=128; b[8]=200; b[9]=200;
    const result=ddsToPng(dds("ATI2",b));
    expect(result.format).toBe("BC5");
    expect(result.previewMode).toContain("false-colour");
  });
  it("rejects unsupported pixel decoders",()=>{
    expect(()=>ddsToPng(dds("BC5S",Buffer.alloc(16)))).toThrow(/supports BC1/);
  });
});
