import { beforeAll, describe, expect, it } from "vitest";
import { importNativeModule } from "./helpers/native-esm";
function makeDds(width=16,height=16,mips=5,fourcc="DXT5",payloadBytes){
 const blockBytes=fourcc==="DXT1"?8:16;let required=0,w=width,h=height;
 for(let i=0;i<mips;i++){required+=Math.ceil(w/4)*Math.ceil(h/4)*blockBytes;w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));}
 const offset=fourcc==="DX10"?148:128;const b=Buffer.alloc(offset+(payloadBytes??required));b.write("DDS ",0);b.writeUInt32LE(124,4);b.writeUInt32LE(0x1|0x2|0x4|0x1000,8);
 b.writeUInt32LE(height,12);b.writeUInt32LE(width,16);b.writeUInt32LE(mips,28);b.writeUInt32LE(32,76);b.writeUInt32LE(4,80);b.write(fourcc,84);return b;
}
let inspectDds: typeof import("../tools/dds-audit.mjs").inspectDds;
beforeAll(async () => {
  ({ inspectDds } = await importNativeModule("../tools/dds-audit.mjs"));
});

describe("DDS texture audit",()=>{
 it("accepts BC3 with a complete mip chain",()=>expect(inspectDds(makeDds()).valid).toBe(true));
 it("rejects truncated/non-DDS data",()=>expect(inspectDds(Buffer.from("not a texture")).valid).toBe(false));
 it("rejects unsupported compression",()=>expect(inspectDds(makeDds(16,16,5,"ZZZZ")).valid).toBe(false));
 it("rejects impossible mip counts",()=>expect(inspectDds(makeDds(8,8,20)).valid).toBe(false));
 it("rejects unreasonable dimensions",()=>expect(inspectDds(makeDds(32768,1024,16)).valid).toBe(false));
 it("recognizes DX10 BC7 and accounts for its header",()=>{const b=makeDds(16,16,5,"DX10");b.writeUInt32LE(98,128);expect(inspectDds(b).format).toBe("BC7_UNORM");expect(inspectDds(b).valid).toBe(true);});
 it("rejects a payload shorter than the declared mip chain",()=>expect(inspectDds(makeDds(64,64,7,"DXT5",32)).errors.some(x=>x.includes("payload is truncated"))).toBe(true));
 it("can audit a header against on-disk size without loading the payload",()=>{const b=makeDds();expect(inspectDds(b.subarray(0,128),b.length).valid).toBe(true);expect(inspectDds(b.subarray(0,128),128).valid).toBe(false);});
});
