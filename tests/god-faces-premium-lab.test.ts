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
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("GOD FACES Premium Appearance Lab", () => {
  it("builds deterministic skin and hair source maps with complete DDS mip chains and hashes", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "god-faces-premium-"));
    tempDirs.push(dir);
    const builder = path.resolve(process.cwd(), "tools/build-god-faces-premium-lab.mjs");
    const { stdout } = await execFileAsync(process.execPath, [builder, dir], { maxBuffer: 2 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    expect(result.skinProfiles).toBe(5);
    expect(result.hairProfiles).toBe(4);
    expect(result.textureMaps).toBe(27);

    const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
    expect(manifest.files).toHaveLength(27);
    expect(manifest.skinProfiles).toHaveLength(5);
    expect(manifest.hairProfiles).toHaveLength(4);
    expect(manifest.status).toContain("UV/material mapping");

    for (const entry of manifest.files) {
      const file = path.join(dir, entry.path);
      const bytes = await readFile(file);
      expect((await stat(file)).isFile()).toBe(true);
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("DDS ");
      expect(bytes.readUInt32LE(12)).toBe(512);
      expect(bytes.readUInt32LE(16)).toBe(512);
      expect(bytes.readUInt32LE(28)).toBe(10);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
      expect(entry.format).toBe("DDS RGBA8 mipmapped");
    }
    expect(manifest.files.filter((f: { path: string }) => f.path.includes("/skin/"))).toHaveLength(15);
    expect(manifest.files.filter((f: { path: string }) => f.path.includes("/hair/"))).toHaveLength(12);
    expect(manifest.guardrails).toContain("No real-person likenesses, face meshes, player IDs or roster assignments are generated.");
    const readme = await readFile(path.join(dir, "README.md"), "utf8");
    expect(readme).toContain("not a drop-in replacement pack");
  });
});
