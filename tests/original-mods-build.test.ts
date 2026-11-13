import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildOriginalAssets } from "../tools/build-original-mods.mjs";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("THEGODMODS original six-department asset build", () => {
  it("generates source deliverables and integrity metadata for all six departments", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "godmods-originals-"));
    tempDirs.push(dir);
    const result = await buildOriginalAssets(dir);
    expect(result.products.map((p: { department: string }) => p.department).sort()).toEqual(
      ["audio", "gameplay", "graphics", "kits", "players", "stadiums"].sort()
    );
    expect(result.products).toHaveLength(6);
    for (const product of result.products) {
      expect(product.files.length).toBeGreaterThan(0);
      for (const entry of product.files) {
        expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect((await stat(path.join(dir, product.name.startsWith("GOD TURF") ? "GOD-TURF" : product.name.split(" — ")[0].replaceAll(" ", "-"), entry.file))).isFile()).toBe(true);
      }
    }
    const catalogue = JSON.parse(await readFile(path.join(dir, "catalogue.json"), "utf8"));
    expect(catalogue.products).toHaveLength(6);
    expect(catalogue.products.every((p: { installable: boolean }) => p.installable === false)).toBe(true);
    const turf = JSON.parse(await readFile(path.join(dir, "GOD-TURF", "pack.json"), "utf8"));
    expect(turf.textures).toHaveLength(3);
    expect(turf.textures.every((t: { sha256: string }) => /^[a-f0-9]{64}$/.test(t.sha256))).toBe(true);
    expect((await readdir(path.join(dir, "GOD-ATMOSPHERE", "audio"))).length).toBe(2);
  });
});
