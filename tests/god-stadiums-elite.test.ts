import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const run = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map(d => rm(d,{recursive:true,force:true}))));

describe("GOD STADIUMS Elite artwork suite", () => {
  it("builds original wide-format board and fascia masters with verified hashes", async () => {
    const dir=await mkdtemp(path.join(os.tmpdir(),"god-stadiums-")); dirs.push(dir);
    const {stdout}=await run(process.execPath,[path.resolve("tools/build-god-stadiums-elite.mjs"),dir]);
    const result=JSON.parse(stdout);
    expect(result.boards).toBe(10);
    expect(result.fascia).toBe(4);
    expect(result.installable).toBe(false);
    const manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));
    expect(manifest.gameFilesModified).toBe(false);
    expect(manifest.assets).toHaveLength(16);
    for(const a of manifest.assets) {
      const bytes=await readFile(path.join(dir,a.file));
      expect(bytes.length).toBe(a.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(a.sha256);
    }
    const night=await readFile(path.join(dir,"boards/european-night.svg"),"utf8");
    expect(night).toContain("UNDER THE LIGHTS");
    expect(night).toContain('width="2048" height="512"');
    const profile=JSON.parse(await readFile(path.join(dir,"profiles/matchday-art-direction.json"),"utf8"));
    expect(profile.profiles).toHaveLength(10);
    expect(profile.status).toContain("no game lighting");
  });
});
