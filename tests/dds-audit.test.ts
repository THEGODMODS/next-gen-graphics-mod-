import { describe, expect, it } from "vitest";
import { inspectDds } from "../tools/dds-audit.mjs";
function makeDds(width=1024,height=1024,mips=11,fourcc="DXT5"){
 const b=Buffer.alloc(256);b.write("DDS ",0);b.writeUInt32LE(124,4);b.writeUInt32LE(0x1|0x2|0x4|0x1000,8);
 b.writeUInt32LE(height,12);b.writeUInt32LE(width,16);b.writeUInt32LE(mips,28);b.writeUInt32LE(32,76);b.writeUInt32LE(4,80);b.write(fourcc,84);return b;
}
describe("DDS texture audit",()=>{
 it("accepts BC3 with complete mip chain",()=>expect(inspectDds(makeDds()).valid).toBe(true));
 it("rejects truncated/non-DDS data",()=>expect(inspectDds(Buffer.from("not a texture")).valid).toBe(false));
 it("rejects unsupported compression",()=>expect(inspectDds(makeDds(512,512,10,"ZZZZ")).valid).toBe(false));
 it("rejects impossible mip counts",()=>expect(inspectDds(makeDds(64,64,20)).valid).toBe(false));
 it("rejects unreasonable dimensions",()=>expect(inspectDds(makeDds(32768,1024,16)).valid).toBe(false));
 it("recognizes DX10 BC7",()=>{const b=makeDds();b.write("DX10",84);b.writeUInt32LE(98,128);expect(inspectDds(b).format).toBe("BC7_UNORM");});
});
