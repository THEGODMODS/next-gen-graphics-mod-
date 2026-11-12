#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, lstat, open } from "node:fs/promises";
import path from "node:path";
import { inspectDds } from "./dds-audit.mjs";

const input=process.argv[2];
if(!input){console.error("Usage: npm run inventory:pitch -- <stadium-folder>");process.exit(2);}
const root=path.resolve(input);
const rootStat=await lstat(root);
if(!rootStat.isDirectory()||rootStat.isSymbolicLink()){console.error("Stadium path must be a real directory, not a symlink.");process.exit(2);}
const relativeSubtree=path.join("common","bg","model","bg","pitch");
const pitchRoot=path.join(root,relativeSubtree);
let pitchStat;
try{pitchStat=await lstat(pitchRoot);}catch{console.error(`Pitch subtree not found: ${relativeSubtree}`);process.exit(2);}
if(!pitchStat.isDirectory()||pitchStat.isSymbolicLink()){console.error("Pitch subtree must be a real directory, not a symlink.");process.exit(2);}
const records=[];
async function hashFile(full){
 const hash=createHash("sha256");
 for await(const chunk of createReadStream(full))hash.update(chunk);
 return hash.digest("hex");
}
async function inspectHeader(full,totalBytes){
 const handle=await open(full,"r");
 try{const header=Buffer.alloc(148);const{bytesRead}=await handle.read(header,0,148,0);return inspectDds(header.subarray(0,bytesRead),totalBytes);}
 finally{await handle.close();}
}
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name),relative=path.relative(pitchRoot,full).split(path.sep).join("/");
  if(entry.isSymbolicLink()){records.push({path:relative,kind:"symlink",warning:"Not followed"});continue;}
  if(entry.isDirectory()){await walk(full);continue;}
  if(!entry.isFile())continue;
  const stat=await lstat(full);
  if(!stat.isFile()||stat.isSymbolicLink()){records.push({path:relative,kind:"non-regular",warning:"Skipped after file type changed during scan"});continue;}
  const record={path:relative,extension:path.extname(entry.name).toLowerCase()||"(none)",bytes:stat.size,sha256:await hashFile(full)};
  if(record.extension===".dds")record.dds=await inspectHeader(full,stat.size);
  records.push(record);
 }
}
await walk(pitchRoot);
records.sort((a,b)=>a.path.localeCompare(b.path));
console.log(JSON.stringify({schemaVersion:1,stadiumFolder:path.basename(root),subtree:relativeSubtree.replaceAll(path.sep,"/"),fileCount:records.filter(x=>x.sha256).length,records},null,2));
