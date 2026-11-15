import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { auditLutPack, parseCube } from "../tools/godmods-lut-qa.mjs";
const dirs:string[]=[];
afterEach(async()=>Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true}))));
function identityCube(n=33){const rows=['TITLE "neutral-reference"',"LUT_3D_SIZE "+n,"DOMAIN_MIN 0.0 0.0 0.0","DOMAIN_MAX 1.0 1.0 1.0"];for(let b=0;b<n;b++)for(let g=0;g<n;g++)for(let r=0;r<n;r++)rows.push([r/(n-1),g/(n-1),b/(n-1)].map(v=>v.toFixed(7)).join(" "));return rows.join("\n")+"\n";}
describe("GODMODS LUT QA",()=>{
 it("parses and validates a complete identity 3D LUT",()=>{const cube=parseCube(identityCube(3));expect(cube.valid).toBe(true);expect(cube.size).toBe(3);expect(cube.entries).toBe(27);});
 it("audits a full 33-cube identity pack and catches hash drift",async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),"godmods-lut-qa-"));dirs.push(dir);
  const body=identityCube(),bytes=Buffer.from(body),hash=createHash("sha256").update(bytes).digest("hex");
  await writeFile(path.join(dir,"neutral-reference.cube"),bytes);
  const manifest={schemaVersion:1,id:"fixture",installable:false,profiles:[{id:"neutral-reference"}],colourPipeline:{inputOutputSpace:"Not encoded by .cube; verify host primaries and transfer function.",warning:"Do not stack LUTs."},files:[{file:"neutral-reference.cube",bytes:bytes.length,sha256:hash,lattice:"33x33x33",entries:35937,profile:"neutral-reference"}]};
  await writeFile(path.join(dir,"manifest.json"),JSON.stringify(manifest));
  expect((await auditLutPack(dir)).valid).toBe(true);
  await writeFile(path.join(dir,"neutral-reference.cube"),body.replace("0.0000000 0.0000000 0.0000000","0.1000000 0.0000000 0.0000000"));
  expect((await auditLutPack(dir)).valid).toBe(false);
 });
 it("rejects malformed or incomplete LUT data",()=>{expect(parseCube("LUT_3D_SIZE 2\n0 0 0\n").valid).toBe(false);});
});
