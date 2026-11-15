import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const sha256=b=>createHash("sha256").update(b).digest("hex");
const KEYS=["ball_weight","ball_physics","ball_bounce","ball_friction","ball_magnus","shooting_power","speed","speed_global"];
function safeRelative(v){return typeof v==="string"&&!!v&&!path.isAbsolute(v)&&!/^[A-Za-z]:/.test(v)&&!v.replaceAll(String.fromCharCode(92),"/").split("/").some(p=>!p||p==="."||p==="..");}
export async function auditGameplayPack(root){
 const packRoot=path.resolve(root),errors=[];const st=await lstat(packRoot);if(!st.isDirectory()||st.isSymbolicLink())throw new Error("Gameplay pack root must be a real directory.");
 const manifest=JSON.parse(await readFile(path.join(packRoot,"manifest.json"),"utf8"));
 const profiles=JSON.parse(await readFile(path.join(packRoot,"profiles.json"),"utf8"));
 const matrix=JSON.parse(await readFile(path.join(packRoot,"qa/scenario-matrix.json"),"utf8"));
 if(manifest.id!=="thegodmods.god-gameplay-premium"||manifest.installable!==false)errors.push("Unexpected gameplay pack identity or installable flag.");
 if(manifest.files?.length!==8)errors.push("Expected five profiles, scenario matrix, profile index and README in the integrity manifest.");
 if(profiles.profiles?.length!==5)errors.push("Expected five gameplay profiles.");
 if(profiles.enabledByDefault!==false)errors.push("Gameplay profiles must remain disabled by default.");
 if(profiles.target!=="PES 2017 / Sider 3.5 gameplay library")errors.push("Unexpected target declaration.");
 if(profiles.compatibility?.module!=="godmods_gameplay.lua"||profiles.compatibility?.event!=="set_home_team"||profiles.compatibility?.liveGameVerified!==false)errors.push("Gameplay adapter metadata must remain explicitly unverified.");
 if(matrix.scenarios?.length!==8||!String(matrix.status||"").includes("offline"))errors.push("Expected eight offline QA scenarios.");
 const files=[];
 for(const entry of manifest.files||[]){
  const rowErrors=[];
  if(!safeRelative(entry.file)){rowErrors.push("Unsafe file path.");files.push({file:entry.file,valid:false,errors:rowErrors});continue;}
  const file=path.resolve(packRoot,entry.file);
  if(!file.startsWith(packRoot+path.sep)){rowErrors.push("File path escapes pack root.");files.push({file:entry.file,valid:false,errors:rowErrors});continue;}
  let bytes;
  try{const fs=await lstat(file);if(!fs.isFile()||fs.isSymbolicLink())rowErrors.push("Not a regular file.");else bytes=await readFile(file);}catch{rowErrors.push("File is missing.");}
  if(bytes){if(bytes.length!==entry.bytes)rowErrors.push("Byte count differs from manifest.");if(sha256(bytes)!==entry.sha256)rowErrors.push("SHA-256 differs from manifest.");}
  files.push({file:entry.file,valid:rowErrors.length===0,errors:rowErrors});
 }
 const configKeys=new Set(KEYS),seen=new Set();
 for(const profile of profiles.profiles||[]){
  if(!profile.id||seen.has(profile.id))errors.push("Profile IDs must be unique and non-empty.");seen.add(profile.id);
  if(!safeRelative(profile.config)){errors.push(profile.id+": unsafe config path.");continue;}
  let text;
  try{text=await readFile(path.resolve(packRoot,profile.config),"utf8");}catch{errors.push(profile.id+": profile INI is missing.");continue;}
  const values=new Map();let enabledCount=0;
  for(const raw of text.split(/\r?\n/)){
   const line=raw.trim();if(!line||line.startsWith(";"))continue;
   const match=/^([a-z_]+)\s*=\s*(-?[0-9]+(?:\.[0-9]+)?)$/.exec(line);
   if(!match){errors.push(profile.id+": malformed INI line: "+line);continue;}
   if(match[1]==="enabled"){enabledCount++;if(Number(match[2])!==0)errors.push(profile.id+": enabled must remain 0 by default.");continue;}
   if(!configKeys.has(match[1])){errors.push(profile.id+": unsupported gameplay property "+match[1]);continue;}
   if(values.has(match[1]))errors.push(profile.id+": duplicate property "+match[1]);
   values.set(match[1],Number(match[2]));
   const range=profiles.parameterBounds?.[match[1]];
   if(!Array.isArray(range)||range.length!==2||!Number.isFinite(Number(match[2]))||Number(match[2])<range[0]||Number(match[2])>range[1])errors.push(profile.id+": "+match[1]+" is outside declared adapter bounds.");
  }
  if(enabledCount!==1)errors.push(profile.id+": exactly one enabled = 0 setting is required.");
  if(values.size!==KEYS.length||KEYS.some(k=>!values.has(k)))errors.push(profile.id+": profile must contain exactly the eight supported adapter properties.");
  if(!Array.isArray(profile.keys)||KEYS.some(k=>!profile.keys.includes(k))||profile.keys.length!==KEYS.length)errors.push(profile.id+": profile index key list does not match supported adapter.");
 }
 for(const scenario of matrix.scenarios||[])if(!scenario.id||!Array.isArray(scenario.steps)||scenario.steps.length<2||!Array.isArray(scenario.metrics)||scenario.metrics.length<2)errors.push("Scenario entries need an ID, repeatable steps and measurable outcomes.");
 for(const f of files)if(!f.valid)errors.push(f.file+": "+f.errors.join(" "));
 const valid=errors.length===0&&files.length===8&&profiles.profiles?.length===5;
 return {valid,status:valid?"profiles-validated-not-game-verified":"blocked",profiles:profiles.profiles?.length||0,scenarios:matrix.scenarios?.length||0,files,errors};
}
async function main(args){const root=args[0]||path.resolve("content/originals/generated/GOD-GAMEPLAY-PREMIUM"),result=await auditGameplayPack(root);if(args[1]){const dest=path.resolve(args[1]);if(dest.startsWith(path.resolve(root)+path.sep))throw new Error("Report must be outside the gameplay pack.");await writeFile(dest,JSON.stringify(result,null,2)+"\n",{flag:"wx"});}else process.stdout.write(JSON.stringify(result,null,2)+"\n");if(!result.valid)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
