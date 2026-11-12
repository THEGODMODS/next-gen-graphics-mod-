import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { inspectDds } from "../tools/dds-audit.mjs";
import { buildPitchModule } from "../tools/pitch-module-builder.mjs";
function makeDds(width: number, height: number, mips: number) {
  let payload = 0, w = width, h = height;
  for (let i = 0; i < mips; i++) { payload += Math.ceil(w / 4) * Math.ceil(h / 4) * 16; w = Math.max(1, Math.floor(w / 2)); h = Math.max(1, Math.floor(h / 2)); }
  const buffer = Buffer.alloc(128 + payload);
  buffer.write("DDS ", 0); buffer.writeUInt32LE(124, 4); buffer.writeUInt32LE(0x1 | 0x2 | 0x4 | 0x1000, 8);
  buffer.writeUInt32LE(height, 12); buffer.writeUInt32LE(width, 16); buffer.writeUInt32LE(mips, 28);
  buffer.writeUInt32LE(32, 76); buffer.writeUInt32LE(4, 80); buffer.write("DXT5", 84);
  return buffer;
}
describe("pitch DDS mapping checks", () => {
  it("rejects replacement DDS dimensions that differ from the original stadium resource", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pitch-dds-match-"));
    try {
      const stadium = path.join(root, "stadium"), pitch = path.join(stadium, "common", "bg", "model", "bg", "pitch");
      await mkdir(pitch, { recursive: true }); await mkdir(path.join(root, "source"));
      const original = makeDds(16, 16, 5), replacement = makeDds(32, 16, 5);
      await writeFile(path.join(pitch, "grass.dds"), original);
      await writeFile(path.join(root, "source", "replacement.dds"), replacement);
      const digest = createHash("sha256").update(original).digest("hex");
      await writeFile(path.join(root, "inventory.json"), JSON.stringify({ schemaVersion: 1, subtree: "common/bg/model/bg/pitch", records: [{ path: "grass.dds", sha256: digest, dds: inspectDds(original) }] }));
      await writeFile(path.join(root, "descriptor.json"), JSON.stringify({ schemaVersion: 1, id: "studio.pitch-dds", name: "DDS Match", version: "1.0.0", license: { id: "private test", redistributionAllowed: false }, replacements: [{ inventoryPath: "grass.dds", originalSha256: digest, replacementFile: "source/replacement.dds" }] }));
      await expect(buildPitchModule({ descriptorPath: path.join(root, "descriptor.json"), inventoryPath: path.join(root, "inventory.json"), outputPath: path.join(root, "out"), stadiumFolder: stadium })).rejects.toThrow(/width does not match/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
