import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");

describe("GOD GAMEPLAY Premium Simulation Lab", () => {
  it("builds five opt-in profiles, bounded values, scenario QA and verified hashes", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "god-gameplay-premium-"));
    try {
      const { stdout } = await execFileAsync(process.execPath, [
        path.resolve(process.cwd(), "tools/build-god-gameplay-premium.mjs"), dir
      ]);
      const result = JSON.parse(stdout);
      expect(result).toEqual({ product: "thegodmods.god-gameplay-premium", files: 8, installable: false });

      const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
      expect(manifest.installable).toBe(false);
      expect(manifest.files).toHaveLength(8);
      for (const entry of manifest.files) {
        const bytes = await readFile(path.join(dir, entry.file));
        expect(bytes.length).toBe(entry.bytes);
        expect(sha256(bytes)).toBe(entry.sha256);
      }

      const profiles = JSON.parse(await readFile(path.join(dir, "profiles.json"), "utf8"));
      expect(profiles.profiles).toHaveLength(5);
      expect(profiles.enabledByDefault).toBe(false);
      for (const profile of profiles.profiles) {
        const ini = await readFile(path.join(dir, profile.config), "utf8");
        expect(ini).toContain("enabled = 0");
        for (const line of ini.split(/\r?\n/)) {
          const match = /^([a-z_]+) = (-?[0-9.]+)$/.exec(line);
          if (!match || match[1] === "enabled") continue;
          const range = profiles.parameterBounds[match[1]];
          expect(range).toBeDefined();
          const value = Number(match[2]);
          expect(value).toBeGreaterThanOrEqual(range[0]);
          expect(value).toBeLessThanOrEqual(range[1]);
        }
      }
      const matrix = JSON.parse(await readFile(path.join(dir, "qa/scenario-matrix.json"), "utf8"));
      expect(matrix.scenarios).toHaveLength(8);
      expect(matrix.scenarios.every((scenario: { steps: string[]; metrics: string[] }) =>
        scenario.steps.length >= 2 && scenario.metrics.length >= 2)).toBe(true);
      expect(await readdir(path.join(dir, "profiles"))).toHaveLength(5);
      expect(await readFile(path.join(dir, "README.md"), "utf8")).toContain("Rollback");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
