import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sha256=b=>createHash("sha256").update(b).digest("hex");
function safeRelative(v){return typeof v==="string"&&!!v&&!path.isAbsolute(v)&&!/^[A-Za-z]:/.test(v)&&!v.replaceAll(String.fromCharCode(92),"/").split("/").some(p=>!p||p==="."||p==="..");}
export function parseCube(text){
 const errors=[],rows=String(text).split(/\r?\n/);let size=null,domainMin=null,domainMax=null;const values=[];
 for(const raw of rows){const line=raw.trim();if(!line||line.startsWith("#")||line.startsWith("TITLE"))continue;
  let m=line.match(/^LUT_3D_SIZE\s+(\d+)$/);if(m){if(size!==null)errors.push("Duplicate LUT_3D_SIZE declaration.");size=Number(m[1]);continue;}
  m=line.match(/^DOMAIN_MIN\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)$/);if(m){domainMin=m.slice(1).map(Number);continue;}
  m=line.match(/^DOMAIN_MAX\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)$/);if(m){domainMax=m.slice(1).map(Number);continue;}
  if(/^[-+0-9.eE]+\s+[-+0-9.eE]+\s+[-+0-9.eE]+$/.test(line)){const v=line.split(/\s+/).map(Number);if(v.length!==3||!v.every(Number.isFinite))errors.push("Non-finite LUT value.");else values.push(v);}
  else errors.push("Unrecognized .cube directive or malformed data row: "+line.slice(0,80));
 }
 if(!Number.isInteger(size)||size<2||size>129)errors.push("LUT_3D_SIZE must be an integer from 2 to 129.");
 if(!domainMin||!domainMax)errors.push("DOMAIN_MIN and DOMAIN_MAX declarations are required.");
 if(domainMin&&domainMax&&([...domainMin,...domainMax].some(v=>!Number.isFinite(v))||domainMin.some((v,i)=>v>=domainMax[i])))errors.push("LUT domain bounds must be finite and increasing.");
 if(size&&values.length!==size**3)errors.push("Expected "+(size**3)+" RGB entries, found "+values.length+".");
 if(values.some(row=>row.some(v=>v<0||v>1)))errors.push("LUT RGB values must remain within [0,1].");
 return {valid:errors.length===0,size,entries:values.length,domainMin,domainMax,values,errors};
}
function identityErrors(cube){
 const errors=[];if(!cube.size||cube.values.length!==cube.size**3)return ["Neutral reference cannot be checked because its lattice is incomplete."];
 const n=cube.size;
 for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++){
  const row=cube.values[b*n*n+g*n+r],expected=[r/(n-1),g/(n-1),b/(n-1)];
  if(row.some((v,i)=>Math.abs(v-expected[i])>0.000001)){errors.push("Neutral reference is not an identity transform.");return errors;}
 }
 return errors;
}
export async function auditLutPack(root){
 const packRoot=path.resolve(root),errors=[];const rootStat=await lstat(packRoot);if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw new Error("LUT pack root must be a real directory.");
 const manifest=JSON.parse(await readFile(path.join(packRoot,"manifest.json"),"utf8"));
 let index=null;try{index=JSON.parse(await readFile(path.join(packRoot,"profiles.json"),"utf8"));}catch{}
 if(manifest.installable!==false)errors.push("LUT source packs must not claim installable status.");
 const profileList=Array.isArray(manifest.profiles)?manifest.profiles:index?.profiles;
 if(!Array.isArray(profileList)||profileList.length===0)errors.push("Manifest/profile index is missing.");
 const pipeline=manifest.colourPipeline||index?.colourPipeline;
 if(!pipeline||!String(pipeline.inputOutputSpace||"").toLowerCase().includes("not encoded"))errors.push("Explicit .cube colour-space limitation is missing.");
 if(!/do not stack|one grade|one lut|one at a time/i.test(JSON.stringify(pipeline||{})))errors.push("Single-LUT/non-stacking guidance is missing.");
 const entries=(manifest.files||[]).filter(f=>typeof f.file==="string"&&f.file.toLowerCase().endsWith(".cube"));
 if(entries.length!==profileList?.length)errors.push("LUT file count does not match profile count.");
 const actual=(await readdir(packRoot,{withFileTypes:true})).filter(e=>e.isFile()&&e.name.toLowerCase().endsWith(".cube")).map(e=>e.name);
 if(actual.length!==entries.length)errors.push("Unmanifested or missing .cube files exist.");
 const results=[];
 for(const entry of entries){
  const rowErrors=[];
  if(!safeRelative(entry.file)){rowErrors.push("Unsafe LUT path.");results.push({file:entry.file,valid:false,errors:rowErrors});continue;}
  const file=path.resolve(packRoot,entry.file);
  if(!file.startsWith(packRoot+path.sep)){rowErrors.push("LUT path escapes pack root.");results.push({file:entry.file,valid:false,errors:rowErrors});continue;}
  let bytes;
  try{const st=await lstat(file);if(!st.isFile()||st.isSymbolicLink())rowErrors.push("LUT is not a regular file.");else bytes=await readFile(file);}catch{rowErrors.push("LUT file is missing.");}
  if(bytes){
   if(bytes.length!==entry.bytes)rowErrors.push("LUT byte count differs from manifest.");
   if(sha256(bytes)!==entry.sha256)rowErrors.push("LUT SHA-256 differs from manifest.");
   const cube=parseCube(bytes.toString("utf8"));
   if(!cube.valid)rowErrors.push(...cube.errors);
   if(cube.size!==33||entry.lattice!=="33x33x33"||entry.entries!==35937)rowErrors.push("Premium LUT must be a complete 33x33x33 lattice with 35,937 entries.");
   if(entry.profile==="neutral-reference"||(profileList||[]).some(p=>p.id==="neutral-reference"&&p.file===entry.file))rowErrors.push(...identityErrors(cube));
   results.push({file:entry.file,valid:rowErrors.length===0,lattice:cube.size,entries:cube.entries,errors:rowErrors});
  }else results.push({file:entry.file,valid:false,errors:rowErrors});
 }
 for(const r of results)if(!r.valid)errors.push(r.file+": "+r.errors.join(" "));
 if(index&&Array.isArray(index.profiles)&&index.profiles.length!==profileList?.length)errors.push("profiles.json count differs from manifest.");
 const valid=errors.length===0&&results.length>0;
 return {valid,status:valid?"lut-source-qa-passed-host-unverified":"blocked",profiles:results.length,luts:results,colourSpaceVerified:false,errors};
}
async function main(args){const root=args[0];if(!root){console.error("Usage: node tools/godmods-lut-qa.mjs <GOD-VISUALS-ELITE|GOD-CINEMATIC-PREMIUM|GOD-NATURAL-PREMIUM> [report.json]");process.exitCode=2;return;}const result=await auditLutPack(root);if(args[1]){const dest=path.resolve(args[1]);if(dest.startsWith(path.resolve(root)+path.sep))throw new Error("Report must be outside the LUT pack.");await writeFile(dest,JSON.stringify(result,null,2)+"\n",{flag:"wx"});}else process.stdout.write(JSON.stringify(result,null,2)+"\n");if(!result.valid)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
