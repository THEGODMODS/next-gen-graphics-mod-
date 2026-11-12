import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { inventoryPitch } from "../tools/pitch-inventory.mjs";

describe("pitch inventory API", () => {
  it("returns a stable relative resource path and SHA-256", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pitch-inventory-"));
    try {
      const pitch = path.join(root, "Stadium", "common", "bg", "model", "bg", "pitch");
      await mkdir(pitch, { recursive: true });
      await writeFile(path.join(pitch, "grass.bin"), "pitch resource");
      const result = await inventoryPitch(path.join(root, "Stadium"));
      expect(result.subtree).toBe("common/bg/model/bg/pitch");
      expect(result.records[0].path).toBe("grass.bin");
      expect(result.records[0].sha256).toBe(createHash("sha256").update("pitch resource").digest("hex"));
      expect(result.fileCount).toBe(1);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("fails cleanly when the expected pitch subtree is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pitch-inventory-missing-"));
    try {
      await expect(inventoryPitch(root)).rejects.toThrow(/Pitch subtree not found/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
