import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync=promisify(execFile);
const tempDirs:string[]=[];
afterEach(async()=>{await Promise.all(tempDirs.splice(0).map(dir=>rm(dir,{recursive:true,force:true})));});

describe("GOD CINEMATIC Premium Matchday Suite",()=>{
  it("generates six bounded 33-cube LUTs, scene guidance and verified hashes",async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),"god-cinematic-"));
    tempDirs.push(dir);
    const builder=path.resolve(process.cwd(),"tools/build-god-cinematic-premium.mjs");
    const {stdout}=await execFileAsync(process.execPath,[builder,dir],{maxBuffer:2*1024*1024});
    const result=JSON.parse(stdout);
    expect(result.profiles).toBe(6);
    expect(result.entriesPerProfile).toBe(35937);
    expect(result.sceneChecks).toBe(6);
    expect(result.lattice).toBe("33³");
    const manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));
    expect(manifest.installable).toBe(false);
    expect(manifest.files).toHaveLength(8);
    const index=JSON.parse(await readFile(path.join(dir,"profiles.json"),"utf8"));
    expect(index.profiles).toHaveLength(6);
    expect(index.sceneGuidance).toHaveLength(6);
    expect(index.colourPipeline.rule).toContain("do not stack");
    for(const entry of manifest.files){
      const file=path.join(dir,entry.file);
      const raw=await readFile(file);
      expect((await stat(file)).isFile()).toBe(true);
      expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
      if(entry.file.endsWith(".cube")){
        const lines=raw.toString("utf8").trimEnd().split("\n");
        expect(lines[3]).toBe("LUT_3D_SIZE 33");
        const values=lines.slice(6).map(line=>line.split(/\\s+/).map(Number));
        expect(values).toHaveLength(35937);
        expect(values.every(row=>row.length===3&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1))).toBe(true);
      }
    }
    const readme=await readFile(path.join(dir,"README.md"),"utf8");
    expect(readme).toContain("not a PES 2017 shader injector");
    expect(readme).toContain("No CPK");
  },30000);
});
