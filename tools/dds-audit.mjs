import { readdir, lstat, open } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const MAX_DIMENSION=16384;
const DXGI=new Map([[71,"BC1_UNORM"],[72,"BC1_UNORM_SRGB"],[74,"BC2_UNORM"],[75,"BC2_UNORM_SRGB"],[77,"BC3_UNORM"],[78,"BC3_UNORM_SRGB"],[83,"BC5_UNORM"],[84,"BC5_SNORM"],[98,"BC7_UNORM"],[99,"BC7_UNORM_SRGB"]]);
const FOURCC=new Map([["DXT1","BC1"],["DXT3","BC2"],["DXT5","BC3"],["ATI2","BC5"],["BC5U","BC5"],["BC5S","BC5_SNORM"]]);
function blockBytes(format){return format.startsWith("BC1")?8:format.startsWith("BC2")||format.startsWith("BC3")||format.startsWith("BC5")||format.startsWith("BC7")?16:0;}
function expectedPayloadBytes(width,height,mipCount,format){
 const bytes=blockBytes(format);if(!bytes)return 0;let total=0,w=width,h=height;
 for(let level=0;level<mipCount;level++){total+=Math.max(1,Math.ceil(w/4))*Math.max(1,Math.ceil(h/4))*bytes;w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));}
 return total;
}
// totalBytes allows callers to audit a header without loading a potentially huge texture into memory.
export function inspectDds(buffer,totalBytes=buffer.length){
 const errors=[];
 if(buffer.length<128||buffer.toString("ascii",0,4)!=="DDS ")return{valid:false,errors:["Missing DDS magic or truncated header."]};
 if(buffer.readUInt32LE(4)!==124)errors.push("DDS header size must be 124.");
 if(buffer.readUInt32LE(76)!==32)errors.push("DDS pixel-format structure size must be 32.");
 const height=buffer.readUInt32LE(12),width=buffer.readUInt32LE(16),mipCount=Math.max(1,buffer.readUInt32LE(28));
 if(!width||!height||width>MAX_DIMENSION||height>MAX_DIMENSION)errors.push("Texture dimensions are outside audit limits.");
 const maxMips=width&&height?Math.floor(Math.log2(Math.max(width,height)))+1:1;
 if(mipCount>maxMips)errors.push("Mip count exceeds the complete mip chain.");
 const flags=buffer.readUInt32LE(80);let format="UNKNOWN",dataOffset=128;
 if(flags&4){const code=buffer.toString("ascii",84,88);if(code==="DX10"){if(buffer.length<148)errors.push("Truncated DDS DX10 extension header.");else{const dxgi=buffer.readUInt32LE(128);format=DXGI.get(dxgi)??"UNSUPPORTED_DXGI_"+dxgi;dataOffset=148;}}else format=FOURCC.get(code)??"UNSUPPORTED_FOURCC_"+code;}
 else if(flags&0x40)format="UNSUPPORTED_UNCOMPRESSED_RGB";
 if(format.startsWith("UNSUPPORTED")||format==="UNKNOWN")errors.push("Texture format is not in the audited allowlist.");
 const dimensionsSane=width>0&&height>0&&width<=MAX_DIMENSION&&height<=MAX_DIMENSION;
 const mipChainSane=mipCount<=maxMips;
 const required=dimensionsSane&&mipChainSane?expectedPayloadBytes(width,height,mipCount,format):0;
 const actualPayload=Math.max(0,totalBytes-dataOffset);
 if(required&&actualPayload<required)errors.push(`Texture payload is truncated: expected at least ${required} bytes, found ${actualPayload}.`);
 return{valid:errors.length===0,width,height,mipCount,format,dataOffset,requiredPayloadBytes:required,actualPayloadBytes:actualPayload,bytes:totalBytes,errors};
}
async function inspectFile(file){
 const handle=await open(file,"r");
 try{const stat=await handle.stat();const header=Buffer.alloc(148);const{bytesRead}=await handle.read(header,0,148,0);return inspectDds(header.subarray(0,bytesRead),stat.size);}
 finally{await handle.close();}
}
async function walk(dir,results){for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isSymbolicLink()){results.push({file:full,valid:false,errors:["Symbolic links are not followed."]});continue;}if(entry.isDirectory())await walk(full,results);else if(entry.isFile()&&entry.name.toLowerCase().endsWith(".dds")){try{results.push({file:full,...await inspectFile(full)});}catch(error){results.push({file:full,valid:false,errors:[error.message]});}}}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const target=process.argv[2];
 if(!target){console.error("Usage: npm run audit:dds -- <texture-folder>");process.exit(2);}
 const stat=await lstat(target);
 if(!stat.isDirectory()||stat.isSymbolicLink()){console.error("Target must be a real directory, not a symlink.");process.exit(2);}
 const results=[];await walk(path.resolve(target),results);
 console.log(JSON.stringify({scanned:results.length,passed:results.filter(x=>x.valid).length,failed:results.filter(x=>!x.valid).length,results},null,2));
 if(!results.length||results.some(x=>!x.valid))process.exitCode=1;
}
