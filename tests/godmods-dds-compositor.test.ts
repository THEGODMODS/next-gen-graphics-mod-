import { describe, expect, it } from "vitest";
const { compositeMaskedDds } = await import("../tools/godmods-dds-compositor.mjs");
import { inspectDds } from "../tools/dds-audit.mjs";

function rgbaDds(width=2, height=2, mipCount=2, fill=[128,128,128,255]) {
  let w=width,h=height,payload=0;
  for(let i=0;i<mipCount;i++){payload+=w*h*4;w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));}
  const b=Buffer.alloc(128+payload);b.write("DDS ",0);b.writeUInt32LE(124,4);b.writeUInt32LE(0x1007,8);
  b.writeUInt32LE(height,12);b.writeUInt32LE(width,16);b.writeUInt32LE(width*4,20);b.writeUInt32LE(mipCount,28);
  b.writeUInt32LE(32,76);b.writeUInt32LE(0x41,80);b.writeUInt32LE(32,88);
  b.writeUInt32LE(0x000000ff,92);b.writeUInt32LE(0x0000ff00,96);b.writeUInt32LE(0x00ff0000,100);b.writeUInt32LE(0xff000000,104);
  for(let i=128;i<b.length;i+=4){b[i]=fill[0];b[i+1]=fill[1];b[i+2]=fill[2];b[i+3]=fill[3];}
  return b;
}

describe("GODMODS masked DDS compositor",()=>{
  it("applies neutral detail only inside the UV mask and preserves alpha and source buffers",()=>{
    const base=rgbaDds(2,2,2,[100,120,140,200]);
    const overlay=rgbaDds(2,2,2,[228,228,228,255]);
    const mask=rgbaDds(2,2,2,[255,0,255,0]);
    const before=Buffer.from(base);
    const out=compositeMaskedDds(base,overlay,mask);
    expect(base.equals(before)).toBe(true);
    expect(inspectDds(out).valid).toBe(true);
    expect([out[128],out[129],out[130],out[131]]).toEqual([200,220,240,200]);
    expect([out[132],out[133],out[134],out[135]]).toEqual([100,120,140,200]);
    expect(out[128+16]).toBe(200); // second mip is composited too
  });
  it("supports reduced opacity and rejects mismatched UV dimensions",()=>{
    const base=rgbaDds(2,2,2,[100,100,100,255]), overlay=rgbaDds(2,2,2,[228,228,228,255]), mask=rgbaDds(2,2,2,[255,255,255,255]);
    const out=compositeMaskedDds(base,overlay,mask,{opacity:0.5});
    expect(out[128]).toBe(150);
    expect(()=>compositeMaskedDds(base,rgbaDds(4,4,3),mask)).toThrow(/dimensions and mip count/);
  });
  it("rejects compressed DDS until an explicit decoder is available",()=>{
    const compressed=Buffer.alloc(128+16);compressed.write("DDS ",0);compressed.writeUInt32LE(124,4);compressed.writeUInt32LE(0x1007,8);compressed.writeUInt32LE(4,12);compressed.writeUInt32LE(4,16);compressed.writeUInt32LE(1,28);compressed.writeUInt32LE(32,76);compressed.writeUInt32LE(4,80);compressed.write("DXT5",84);
    expect(()=>compositeMaskedDds(compressed,rgbaDds(),rgbaDds())).toThrow(/uncompressed RGBA8 or BGRA8/);
  });
});
