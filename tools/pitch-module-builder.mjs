#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const PITCH_SUBTREE="common/bg/model/bg/pitch";
const ID=/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const SHA=/^[a-f0-9]{64}$/i;
function safeRelative(value,label){
 if(typeof value!=="string"||!value||value.includes("\\")||value.includes("\0")||path.posix.isAbsolute(value)||/^[a-zA-Z]:/.test(value))throw new Error(label+" must be a safe relative POSIX path.");
 const parts=value.split("/");
 if(parts.some(p=>!p||p==="."||p===".."||p.includes(":")))throw new Error(label+" contains an unsafe path segment.");
 return parts.join("/");
}
async function regularFileNoLinks(base,relative,label){
 const safe=safeRelative(relative,label);let current=base;
 for(const part of safe.split("/")){
  current=path.join(current,part);
  const stat=await lstat(current);
  if(stat.isSymbolicLink())throw new Error(label+" must not traverse symbolic links.");
 }
 const stat=await lstat(current);
 if(!stat.isFile())throw new Error(label+" must resolve to a regular file.");
 return current;
}
async function hashFile(file){
 const hash=createHash("sha256");
 for await(const chunk of createReadStream(file))hash.update(chunk);
 return hash.digest("hex");
}
async function readDdsHeader(file,size){
 const {open}=await import("node:fs/promises");const handle=await open(file,"r");
 try{const buf=Buffer.alloc(148);const{bytesRead}=await handle.read(buf,0,148,0);return inspectDds(buf.subarray(0,bytesRead),size);}
 finally{await handle.close();}
}
export async function buildPitchModule({descriptorPath,inventoryPath,outputPath}){
 const descriptorFile=path.resolve(descriptorPath),inventoryFile=path.resolve(inventoryPath),out=path.resolve(outputPath);
 const descriptorBase=path.dirname(descriptorFile);
 const descriptor=JSON.parse(await readFile(descriptorFile,"utf8"));
 const inventory=JSON.parse(await readFile(inventoryFile,"utf8"));
 if(descriptor.schemaVersion!==1)throw new Error("Descriptor schemaVersion must be 1.");
 if(!ID.test(descriptor.id??""))throw new Error("id must be lowercase and namespaced.");
 if(!descriptor.name?.trim()||!descriptor.version||!/^\\d+\\.\\d+\\.\\d+$/.test(descriptor.version))throw new Error("A name and semantic version are required.");
 if(!descriptor.license||typeof descriptor.license.id!=="string"||!descriptor.license.id.trim()||typeof descriptor.license.redistributionAllowed!=="boolean")throw new Error("Explicit license metadata is required.");
 if(inventory.schemaVersion!==1||inventory.subtree!==PITCH_SUBTREE)throw new Error("Inventory is not a supported Stadium Server pitch inventory.");
 if(!Array.isArray(inventory.records)||!Array.isArray(descriptor.replacements)||!descriptor.replacements.length)throw new Error("Inventory records and at least one replacement are required.");
 const inventoryByPath=new Map(inventory.records.filter(r=>r&&typeof r.path==="string"&&typeof r.sha256==="string").map(r=>[r.path,r]));
 const files=[],seen=new Set();
 for(let i=0;i<descriptor.replacements.length;i++){
  const item=descriptor.replacements[i];
  const originalPath=safeRelative(item.inventoryPath,"replacements["+i+"].inventoryPath");
  if(seen.has(originalPath.toLowerCase()))throw new Error("Duplicate pitch resource mapping: "+originalPath);
  seen.add(originalPath.toLowerCase());
  const original=inventoryByPath.get(originalPath);
  if(!original)throw new Error("Resource is absent from the supplied inventory: "+originalPath);
  if(!SHA.test(item.originalSha256??"")||item.originalSha256.toLowerCase()!==original.sha256.toLowerCase())throw new Error("Original resource fingerprint does not match inventory: "+originalPath);
  const replacementPath=safeRelative(item.replacementFile,"replacements["+i+"].replacementFile");
  const source=await regularFileNoLinks(descriptorBase,replacementPath,"replacementFile");
  const targetExt=path.posix.extname(originalPath).toLowerCase(),sourceExt=path.extname(source).toLowerCase();
  if(targetExt!==sourceExt)throw new Error("Replacement extension must match original resource: "+originalPath);
  const sourceHash=await hashFile(source),sourceStat=await lstat(source);
  if(sourceExt===".dds"){
   const audit=await readDdsHeader(source,sourceStat.size);
   if(!audit.valid)throw new Error("Replacement DDS failed audit for "+originalPath+": "+audit.errors.join("; "));
  }
  const packageSource="payload/"+originalPath;
  files.push({source:packageSource,target:"LiveCPK/"+PITCH_SUBTREE+"/"+originalPath,sha256:sourceHash,localSource:source});
 }
 const game={title:"PES 2017",executable:["PES2017.exe","PES2017patched.exe"],sider:">=3.5.0 <4.0.0"};
 const manifest={schemaVersion:1,id:descriptor.id,name:descriptor.name,version:descriptor.version,description:descriptor.description??"Verified Stadium Server pitch resource replacements.",category:"stadiums",game,dependencies:[],conflicts:[],files:files.map(({localSource,...f})=>f),luaModules:[],license:descriptor.license};
 const outputStat=await lstat(out).catch(()=>null);
 if(outputStat){
  if(!outputStat.isDirectory()||outputStat.isSymbolicLink())throw new Error("Output path must be a real directory.");
  if((await readdir(out)).length)throw new Error("Output directory must be empty; refusing to overwrite existing content.");
 }else await mkdir(out,{recursive:true});
 for(let i=0;i<files.length;i++){
  const destination=path.join(out,...files[i].source.split("/"));
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(files[i].localSource,destination,constants.COPYFILE_EXCL);
 }
 await writeFile(path.join(out,"module.json"),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
 return {moduleId:manifest.id,files:manifest.files.length,output:out,manifest};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [descriptorPath,inventoryPath,outputPath]=process.argv.slice(2);
 if(!descriptorPath||!inventoryPath||!outputPath){console.error("Usage: npm run build:pitch-module -- <descriptor.json> <inventory.json> <empty-output-folder>");process.exit(2);}
 try{const result=await buildPitchModule({descriptorPath,inventoryPath,outputPath});console.log(JSON.stringify({moduleId:result.moduleId,files:result.files,output:result.output},null,2));}
 catch(error){console.error("Pitch module build failed: "+error.message);process.exitCode=1;}
}
