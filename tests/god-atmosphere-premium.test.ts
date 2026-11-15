import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const run=promisify(execFile),dirs:string[]=[];
afterEach(async()=>Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true}))));
describe("GOD ATMOSPHERE Premium Sound Identity Lab",()=>{
 it("generates 25 original club stingers and four generic ambience beds with valid PCM WAV manifests",async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),"god-atmosphere-premium-"));dirs.push(dir);
  const {stdout}=await run(process.execPath,[path.resolve("tools/build-god-atmosphere-premium.mjs"),dir]);
  const result=JSON.parse(stdout);expect(result.clubStingers).toBe(25);expect(result.ambienceBeds).toBe(4);expect(result.assets).toBe(29);expect(result.installable).toBe(false);
  const manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));
  expect(manifest.clubs).toHaveLength(25);expect(manifest.beds).toHaveLength(4);expect(manifest.assets).toHaveLength(29);
  for(const asset of manifest.assets){
   const bytes=await readFile(path.join(dir,asset.file));expect(bytes.toString("ascii",0,4)).toBe("RIFF");expect(bytes.toString("ascii",8,12)).toBe("WAVE");
   expect(bytes.readUInt16LE(22)).toBe(2);expect(bytes.readUInt32LE(24)).toBe(24000);expect(bytes.readUInt16LE(34)).toBe(16);
   expect(bytes.length).toBe(asset.bytes);expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
   expect(asset.peak).toBeLessThanOrEqual(.98);expect(asset.rms).toBeGreaterThan(0);
  }
  expect(manifest.clubs.every((c:any)=>c.status.includes("listening review"))).toBe(true);
  expect(manifest.rights).toContain("No recordings");
 });
});
