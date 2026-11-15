import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { auditGameplayPack } from "../tools/godmods-gameplay-qa.mjs";
const run=promisify(execFile),dirs:string[]=[];
afterEach(async()=>Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true}))));
async function build(){const d=await mkdtemp(path.join(os.tmpdir(),"godmods-gameplay-qa-"));dirs.push(d);await run(process.execPath,[path.resolve("tools/build-god-gameplay-premium.mjs"),d]);return d;}
describe("GODMODS gameplay profile QA",()=>{
 it("validates all five opt-in profiles and eight offline scenarios",async()=>{
  const result=await auditGameplayPack(await build());
  expect(result.valid).toBe(true);expect(result.status).toBe("profiles-validated-not-game-verified");
  expect(result.profiles).toBe(5);expect(result.scenarios).toBe(8);expect(result.files).toHaveLength(8);
 });
 it("blocks enabled-by-default or out-of-bounds profile changes",async()=>{
  const dir=await build(),file=path.join(dir,"profiles/broadcast-balanced.ini");
  const ini=(await readFile(file,"utf8")).replace("enabled = 0","enabled = 1").replace("ball_weight = 1000","ball_weight = 9000");
  await writeFile(file,ini);
  const result=await auditGameplayPack(dir);
  expect(result.valid).toBe(false);expect(result.errors.join(" ")).toMatch(/enabled must remain 0|outside declared adapter bounds|SHA-256/);
 });
});
