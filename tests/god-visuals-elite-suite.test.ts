import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive:true, force:true })));
});

describe("GOD VISUALS Elite Colour Suite", () => {
  it("generates eight bounded 33-cube LUTs with complete entries and integrity hashes", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "god-visuals-elite-"));
    tempDirs.push(dir);
    const builder = path.resolve(process.cwd(), "tools/build-god-visuals-elite-suite.mjs");
    const { stdout } = await execFileAsync(process.execPath, [builder, dir], { maxBuffer:2*1024*1024 });
    const result = JSON.parse(stdout);
    expect(result.profiles).toBe(8);
    expect(result.lattice).toBe("33³");
    expect(result.entriesPerProfile).toBe(35937);
    expect(result.files).toBe(8);

    const manifest = JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));
    expect(manifest.profiles).toHaveLength(8);
    expect(manifest.installable).toBe(false);
    expect(manifest.colourPipeline.inputOutputSpace).toContain("Not encoded");
    expect(manifest.files).toHaveLength(8);

    for (const entry of manifest.files) {
      const file = path.join(dir,entry.file);
      const raw = await readFile(file);
      expect((await stat(file)).isFile()).toBe(true);
      expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
      const lines = raw.toString("utf8").trimEnd().split("\n");
      expect(lines[3]).toBe("LUT_3D_SIZE 33");
      expect(lines.filter(line => /^[-+0-9.]+\s+[-+0-9.]+\s+[-+0-9.]+$/.test(line))).toHaveLength(35937);
      for (const line of lines.slice(6)) {
        const values = line.split(/\s+/).map(Number);
        expect(values).toHaveLength(3);
        expect(values.every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
      }
    }
    const neutral = (await readFile(path.join(dir,"neutral-reference.cube"),"utf8")).trimEnd().split("\n").slice(6);
    expect(neutral[0]).toBe("0.0000000 0.0000000 0.0000000");
    expect(neutral[16]).toBe("0.5000000 0.0000000 0.0000000");
    expect(neutral[16*33*33 + 16*33 + 16]).toBe("0.5000000 0.5000000 0.5000000");
    expect(neutral[35936]).toBe("1.0000000 1.0000000 1.0000000");
    const readme = await readFile(path.join(dir,"README.md"),"utf8");
    expect(readme).toContain("Do not stack LUTs");
    expect(readme).toContain("not a shader injector");
  }, 30000);
});
