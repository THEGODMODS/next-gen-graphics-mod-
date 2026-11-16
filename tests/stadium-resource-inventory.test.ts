import { inventoryStadiumResources } from "../tools/stadium-resource-inventory.mjs";
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function dds1x1(): Buffer {
  const bytes = Buffer.alloc(132);
  bytes.write("DDS ", 0, "ascii");
  bytes.writeUInt32LE(124, 4);
  bytes.writeUInt32LE(0x0002100f, 8);
  bytes.writeUInt32LE(1, 12);
  bytes.writeUInt32LE(1, 16);
  bytes.writeUInt32LE(4, 20);
  bytes.writeUInt32LE(1, 28);
  bytes.writeUInt32LE(32, 76);
  bytes.writeUInt32LE(0x41, 80);
  bytes.writeUInt32LE(32, 88);
  bytes.writeUInt32LE(0x000000ff, 92);
  bytes.writeUInt32LE(0x0000ff00, 96);
  bytes.writeUInt32LE(0x00ff0000, 100);
  bytes.writeUInt32LE(0xff000000, 104);
  bytes.writeUInt32LE(0x1000, 108);
  bytes.set([12, 34, 56, 255], 128);
  return bytes;
}

describe("Stadium Server resource inventory", () => {
  it("records exact model-relative paths, hashes and DDS metadata without changing source files", async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), "stadium-resource-inventory-"));
    try {
      const stadium = path.join(temp, "Example Stadium");
      const model = path.join(stadium, "common", "bg", "model", "bg");
      await mkdir(path.join(model, "led"), { recursive: true });
      const dds = dds1x1();
      await writeFile(path.join(model, "led", "board.dds"), dds);
      await writeFile(path.join(model, "led", "broken.dds"), "not a DDS");
      await writeFile(path.join(model, "led", "material.bin"), "material metadata");

      const result = await inventoryStadiumResources(stadium);
      expect(result.subtree).toBe("common/bg/model/bg");
      expect(result.fileCount).toBe(3);
      expect(result.ddsCount).toBe(2);
      const board = result.records.find(record => record.path.endsWith("board.dds"));
      expect(board?.sha256).toBe(createHash("sha256").update(dds).digest("hex"));
      expect(board?.dds.valid).toBe(true);
      expect(board?.dds.width).toBe(1);
      expect(board?.dds.height).toBe(1);
      const broken = result.records.find(record => record.path.endsWith("broken.dds"));
      expect(broken?.dds.valid).toBe(false);
      expect(await import("node:fs/promises").then(fs => fs.readFile(path.join(model, "led", "board.dds")))).toEqual(dds);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("fails cleanly when the Stadium Server model subtree is absent", async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), "stadium-resource-missing-"));
    try {
      await expect(inventoryStadiumResources(temp)).rejects.toThrow(/model subtree not found/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
