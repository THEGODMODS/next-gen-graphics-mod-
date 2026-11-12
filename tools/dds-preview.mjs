#!/usr/bin/env node
import { readFile, lstat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import { inspectDds } from "./dds-audit.mjs";

const MAX_FILE_BYTES = 512 * 1024 * 1024;
const MAX_PIXELS = 16 * 1024 * 1024;
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(buffer) { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const name = Buffer.from(type, "ascii"), body = Buffer.concat([name, data]), out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), data.length + 8); return out;
}
function rgb565(v) { return [Math.round(((v >> 11) & 31) * 255 / 31), Math.round(((v >> 5) & 63) * 255 / 63), Math.round((v & 31) * 255 / 31)]; }
function colorPalette(block, forceFour) {
  const c0 = block.readUInt16LE(0), c1 = block.readUInt16LE(2), a = rgb565(c0), b = rgb565(c1), colors = [a, b];
  if (c0 > c1 || forceFour) colors.push(a.map((v,i)=>Math.round((2*v+b[i])/3)), a.map((v,i)=>Math.round((v+2*b[i])/3)));
  else colors.push(a.map((v,i)=>Math.round((v+b[i])/2)), [0,0,0]);
  return { colors, indices: block.readUInt32LE(4), transparent: c0 <= c1 && !forceFour };
}
function alphaPalette(block) {
  const a0=block[0],a1=block[1],values=[a0,a1];
  if(a0>a1) for(let i=1;i<=6;i++) values.push(Math.round(((7-i)*a0+i*a1)/7));
  else { for(let i=1;i<=4;i++) values.push(Math.round(((5-i)*a0+i*a1)/5)); values.push(0,255); }
  let bits=0n; for(let i=0;i<6;i++) bits |= BigInt(block[2+i]) << BigInt(i*8);
  return Array.from({length:16},(_,i)=>values[Number((bits >> BigInt(i*3)) & 7n)]);
}
function decode(format, block) {
  if(format.startsWith("BC5")) return { rg:[alphaPalette(block.subarray(0,8)),alphaPalette(block.subarray(8,16))] };
  const bc1=format.startsWith("BC1"), bc2=format.startsWith("BC2"), bc3=format.startsWith("BC3");
  const color=colorPalette(block.subarray(bc1?0:8,(bc1?0:8)+8),!bc1);
  let alpha=null;
  if(bc3) alpha=alphaPalette(block.subarray(0,8));
  if(bc2) { let bits=0n; for(let i=0;i<8;i++) bits |= BigInt(block[i]) << BigInt(i*8); alpha=Array.from({length:16},(_,i)=>Number((bits >> BigInt(i*4)) & 15n)*17); }
  return { rgb:Array.from({length:16},(_,i)=>color.colors[(color.indices >>> (i*2)) & 3]), alpha:alpha ?? (bc1 && color.transparent ? Array.from({length:16},(_,i)=>((color.indices >>> (i*2))&3)===3?0:255) : Array(16).fill(255)) };
}
export function ddsToPng(buffer) {
  const audit=inspectDds(buffer);
  if(!audit.valid) throw new Error("DDS audit failed: "+audit.errors.join("; "));
  const format=audit.format;
  if(!["BC1","BC1_UNORM","BC1_UNORM_SRGB","BC2","BC2_UNORM","BC2_UNORM_SRGB","BC3","BC3_UNORM","BC3_UNORM_SRGB","BC5","BC5_UNORM"].includes(format))
    throw new Error("PNG preview supports BC1, BC2, BC3 and BC5_UNORM only; received "+format+".");
  const {width,height}=audit;
  if(width*height>MAX_PIXELS) throw new Error("Decoded preview exceeds the 16-megapixel safety limit.");
  const rgba=Buffer.alloc(width*height*4), blocksX=Math.ceil(width/4), blocksY=Math.ceil(height/4), blockBytes=format.startsWith("BC1")?8:16;
  for(let by=0;by<blocksY;by++) for(let bx=0;bx<blocksX;bx++) {
    const offset=audit.dataOffset+(by*blocksX+bx)*blockBytes, pixels=decode(format,buffer.subarray(offset,offset+blockBytes));
    for(let py=0;py<4;py++) for(let px=0;px<4;px++) {
      const x=bx*4+px,y=by*4+py; if(x>=width||y>=height) continue;
      const i=py*4+px,o=(y*width+x)*4;
      if(pixels.rg) {
        const r=pixels.rg[0][i],g=pixels.rg[1][i];
        rgba[o]=r; rgba[o+1]=g; rgba[o+2]=0; rgba[o+3]=255;
      } else {
        const rgb=pixels.rgb[i]; rgba[o]=rgb[0]; rgba[o+1]=rgb[1]; rgba[o+2]=rgb[2]; rgba[o+3]=pixels.alpha[i];
      }
    }
  }
  const stride=width*4, raw=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++) { const row=y*(stride+1); raw[row]=0; rgba.copy(raw,row+1,y*stride,(y+1)*stride); }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
  return {png,width,height,format,previewMode:format.startsWith("BC5")?"BC5 false-colour RG channels (R=stored red, G=stored green, B=0)":"decoded RGBA colour"};
}
async function safeRead(filePath) {
  const file=path.resolve(filePath),stat=await lstat(file);
  if(stat.isSymbolicLink()||!stat.isFile()) throw new Error("Input must be a regular file, not a symbolic link.");
  if(stat.size>MAX_FILE_BYTES) throw new Error("DDS exceeds the 512 MiB input safety limit.");
  return {file,buffer:await readFile(file)};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input,output]=process.argv.slice(2);
  if(!input||!output) { console.error("Usage: npm run preview:dds -- <input.dds> <output.png>"); process.exit(2); }
  try {
    const source=await safeRead(input),result=ddsToPng(source.buffer),destination=path.resolve(output);
    await writeFile(destination,result.png,{flag:"wx"});
    console.log(JSON.stringify({input:source.file,output:destination,width:result.width,height:result.height,format:result.format,previewMode:result.previewMode,bytes:result.png.length},null,2));
  } catch(error) { console.error("DDS preview failed: "+error.message); process.exitCode=1; }
}
