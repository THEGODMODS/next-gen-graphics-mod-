#!/usr/bin/env node
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
const MAX_DIMENSION=16384;
const DXGI=new Map([[71,"BC1_UNORM"],[72,"BC1_UNORM_SRGB"],[74,"BC2_UNORM"],[75,"BC2_UNORM_SRGB"],[77,"BC3_UNORM"],[78,"BC3_UNORM_SRGB"],[83,"BC5_UNORM"],[84,"BC5_SNORM"],[98,"BC7_UNORM"],[99,"BC7_UNORM_SRGB"]]);
const FOURCC=new Map([["DXT1","BC1"],["DXT3","BC2"],["DXT5","BC3"],["ATI2","BC5"],["BC5U","BC5"],["BC5S","BC5"]]);
export function inspectDds(buffer){
 const errors=[];
 if(buffer.length<128||buffer.toString("ascii",0,4)!=="DDS ")return{valid:false,errors:["Missing DDS magic or truncated header."]};
 if(buffer.readUInt32LE(4)!==124)errors.push("DDS header size must be 124.");
 if(buffer.readUInt32LE(76)!==32)errors.push("DDS pixel-format structure size must be 32.");
 const height=buffer.readUInt32LE(12),width=buffer.readUInt32LE(16),mipCount=Math.max(1,buffer.readUInt32LE(28));
 if(!width||!height||width>MAX_DIMENSION||height>MAX_DIMENSION)errors.push("Texture dimensions are outside audit limits.");
 const maxMips=Math.floor(Math.log2(Math.max(width,height)))+1;
 if(mipCount>maxMips)errors.push("Mip count exceeds the complete mip chain.");
 const flags=buffer.readUInt32LE(80);let format="UNKNOWN",dataOffset=128;
 if(flags&4){const code=buffer.toString("ascii",84,88);if(code==="DX10"){if(buffer.length<148)errors.push("Truncated DDS DX10 extension header.");else{const dxgi=buffer.readUInt32LE(128);format=DXGI.get(dxgi)??"UNSUPPORTED_DXGI_"+dxgi;dataOffset=148;}}else format=FOURCC.get(code)??"UNSUPPORTED_FOURCC_"+code;}
 else if(flags&0x40)format="UNCOMPRESSED_RGB";
 if(format.startsWith("UNSUPPORTED")||format==="UNKNOWN")errors.push("Texture format is not in the audited allowlist.");
 if(buffer.length<=dataOffset)errors.push("DDS contains no texture payload.");
 return{valid:errors.length===0,width,height,mipCount,format,dataOffset,bytes:buffer.length,errors};
}
async function walk(dir,results){for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isSymbolicLink()){results.push({file:full,valid:false,errors:["Symbolic links are not followed."]});continue;}if(entry.isDirectory())await walk(full,results);else if(entry.isFile()&&entry.name.toLowerCase().endsWith(".dds")){try{results.push({file:full,...inspectDds(await readFile(full))});}catch(error){results.push({file:full,valid:false,errors:[error.message]});}}}}
const target=process.argv[2];
if(!target){console.error("Usage: npm run audit:dds -- <texture-folder>");process.exit(2);}
const stat=await lstat(target);
if(!stat.isDirectory()||stat.isSymbolicLink()){console.error("Target must be a real directory, not a symlink.");process.exit(2);}
const results=[];await walk(path.resolve(target),results);
console.log(JSON.stringify({scanned:results.length,passed:results.filter(x=>x.valid).length,failed:results.filter(x=>!x.valid).length,results},null,2));
if(!results.length||results.some(x=>!x.valid))process.exitCode=1;
