import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync=promisify(execFile),tempDirs:string[]=[];
afterEach(async()=>{await Promise.all(tempDirs.splice(0).map(dir=>rm(dir,{recursive:true,force:true})));});
describe("GOD NATURAL Premium Realism Suite",()=>{it("generates six bounded natural LUTs, a 24-patch chart, QA and hashes",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"god-natural-"));tempDirs.push(dir);
 const {stdout}=await execFileAsync(process.execPath,[path.resolve(process.cwd(),"tools/build-god-natural-premium.mjs"),dir],{maxBuffer:2*1024*1024});
 const result=JSON.parse(stdout);expect(result.profiles).toBe(6);expect(result.entriesPerProfile).toBe(35937);expect(result.totalLutEntries).toBe(215622);expect(result.chartPatches).toBe(24);expect(result.sceneChecks).toBe(5);
 const manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));expect(manifest.installable).toBe(false);expect(manifest.files).toHaveLength(9);
 const index=JSON.parse(await readFile(path.join(dir,"profiles.json"),"utf8"));expect(index.profiles).toHaveLength(6);expect(index.sceneGuidance).toHaveLength(5);expect(index.calibration.patchCount).toBe(24);expect(index.colourPipeline.rule).toContain("Do not stack");
 for(const entry of manifest.files){const file=path.join(dir,entry.file),raw=await readFile(file);expect((await stat(file)).isFile()).toBe(true);expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
  if(entry.file.endsWith(".cube")){const lines=raw.toString("utf8").trimEnd().split("\n");expect(lines[3]).toBe("LUT_3D_SIZE 33");const values=lines.slice(6).map(line=>line.trim().split(" ").map(Number));expect(values).toHaveLength(35937);expect(values.every(row=>row.length===3&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1))).toBe(true);
   if(entry.profile==="neutral-reference")for(let b=0;b<33;b++)for(let g=0;g<33;g++)for(let r=0;r<33;r++){const row=values[b*1089+g*33+r];expect(row[0]).toBeCloseTo(r/32,6);expect(row[1]).toBeCloseTo(g/32,6);expect(row[2]).toBeCloseTo(b/32,6);}
  }}
 const chart=await readFile(path.join(dir,"reference-chart.svg"),"utf8");expect(chart.match(/<rect x=/g)).toHaveLength(24);expect(chart).toContain("not a certified colour target");
 const readme=await readFile(path.join(dir,"README.md"),"utf8");expect(readme).toContain("not a PES 2017 shader injector");expect(readme).toContain("No original game");
},30000);});
