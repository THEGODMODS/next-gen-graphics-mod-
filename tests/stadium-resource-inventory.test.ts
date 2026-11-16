import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as stadiumInventory from "../tools/stadium-resource-inventory.mjs";

function makeDds() {
  const data = Buffer.alloc(132);
  data.write("DDS ", 0, "ascii");
  data.writeUInt32LE(124, 4);
  data.writeUInt32LE(0x0002100f, 8);
  data.writeUInt32LE(1, 12);
  data.writeUInt32LE(1, 16);
  data.writeUInt32LE(4, 20);
  data.writeUInt32LE(1, 28);
  data.writeUInt32LE(32, 76);
  data.writeUInt32LE(0x41, 80);
  data.writeUInt32LE(32, 88);
  data.writeUInt32LE(0x000000ff, 92);
  data.writeUInt32LE(0x0000ff00, 96);
  data.writeUInt32LE(0x00ff0000, 100);
  data.writeUInt32LE(0xff000000, 104);
  data.writeUInt32LE(0x1000, 108);
  data.set([12, 34, 56, 255], 128);
  return data;
}

describe("Stadium Server resource inventory", () => {
  it("fingerprints model resources and reports DDS metadata without changing files", async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), "stadium-inventory-"));
    try {
      const stadium = path.join(temp, "Example");
      const model = path.join(stadium, "common", "bg", "model", "bg");
      await mkdir(path.join(model, "led"), { recursive: true });
      const dds = makeDds();
      const ddsPath = path.join(model, "led", "board.dds");
      await writeFile(ddsPath, dds);
      await writeFile(path.join(model, "led", "broken.dds"), "not dds");
      await writeFile(path.join(model, "led", "material.bin"), "material");

      const result = await stadiumInventory.inventoryStadiumResources(stadium);
      expect(result.subtree).toBe("common/bg/model/bg");
      expect(result.fileCount).toBe(3);
      expect(result.ddsCount).toBe(2);
      const board = result.records.find((record) => record.path.endsWith("board.dds"));
      expect(board.sha256).toBe(createHash("sha256").update(dds).digest("hex"));
      expect(board.dds.valid).toBe(true);
      expect(board.dds.width).toBe(1);
      expect(board.dds.height).toBe(1);
      const broken = result.records.find((record) => record.path.endsWith("broken.dds"));
      expect(broken.dds.valid).toBe(false);
      expect(await readFile(ddsPath)).toEqual(dds);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("fails when the Stadium Server model subtree is absent", async () => {
    const temp = await mkdtemp(path.join(os.tmpdir(), "stadium-inventory-missing-"));
    try {
      await expect(stadiumInventory.inventoryStadiumResources(temp)).rejects.toThrow(/model subtree not found/);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
