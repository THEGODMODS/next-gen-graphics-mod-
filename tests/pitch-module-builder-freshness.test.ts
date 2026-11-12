import { beforeAll, describe, it, expect } from "vitest";
import { importNativeModule } from "./helpers/native-esm";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

let buildPitchModule: typeof import("../tools/pitch-module-builder.mjs").buildPitchModule;
beforeAll(async () => {
  ({ buildPitchModule } = await importNativeModule("../tools/pitch-module-builder.mjs"));
});

describe("pitch module original fingerprint revalidation", () => {
  it("rejects a source resource changed after the inventory was created", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pitch-freshness-"));
    try {
      const stadium = path.join(root, "stadium");
      const pitch = path.join(stadium, "common", "bg", "model", "bg", "pitch");
      await mkdir(pitch, { recursive: true });
      await writeFile(path.join(pitch, "grass.bin"), "original bytes");
      const digest = createHash("sha256").update("original bytes").digest("hex");
      await mkdir(path.join(root, "source"));
      await writeFile(path.join(root, "source", "replacement.bin"), "replacement bytes");
      await writeFile(path.join(root, "inventory.json"), JSON.stringify({ schemaVersion: 1, subtree: "common/bg/model/bg/pitch", records: [{ path: "grass.bin", sha256: digest }] }));
      await writeFile(path.join(root, "descriptor.json"), JSON.stringify({ schemaVersion: 1, id: "studio.pitch-freshness", name: "Freshness Test", version: "1.0.0", license: { id: "private test", redistributionAllowed: false }, replacements: [{ inventoryPath: "grass.bin", originalSha256: digest, replacementFile: "source/replacement.bin" }] }));
      await writeFile(path.join(pitch, "grass.bin"), "changed bytes");
      await expect(buildPitchModule({ descriptorPath: path.join(root, "descriptor.json"), inventoryPath: path.join(root, "inventory.json"), outputPath: path.join(root, "out"), stadiumFolder: stadium })).rejects.toThrow(/changed after inventory/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
