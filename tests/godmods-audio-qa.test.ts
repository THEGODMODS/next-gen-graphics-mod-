import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { auditAtmospherePack } from "../tools/godmods-audio-qa.mjs";
const run=promisify(execFile),dirs:string[]=[];
afterEach(async()=>Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true}))));
async function build(){const d=await mkdtemp(path.join(os.tmpdir(),"godmods-audio-qa-"));dirs.push(d);await run(process.execPath,[path.resolve("tools/build-god-atmosphere-premium.mjs"),d]);return d;}
describe("GODMODS audio source QA",()=>{
 it("measures all 25 stingers and four seamless ambience beds from their PCM samples",async()=>{
  const dir=await build(),result=await auditAtmospherePack(dir);
  expect(result.valid).toBe(true);expect(result.status).toBe("audio-source-qa-passed-not-game-routed");
  expect(result.clubStingers).toBe(25);expect(result.ambienceBeds).toBe(4);expect(result.assets).toHaveLength(29);
  expect(result.assets.every(a=>a.valid&&a.clippedSamples===0)).toBe(true);
 });
 it("blocks stale hashes and invalid WAV payloads",async()=>{
  const dir=await build(),manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));
  const file=path.join(dir,manifest.assets[0].file),bytes=await readFile(file);bytes[60]^=0xff;await writeFile(file,bytes);
  const result=await auditAtmospherePack(dir);expect(result.valid).toBe(false);expect(result.errors.join(" ")).toMatch(/SHA-256/);
 });
});
