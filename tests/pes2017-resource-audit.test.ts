import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { scanResourceRoot, validateBindingManifest } from "../tools/pes2017-resource-audit.mjs";

const roots: string[] = [];
async function temp() { const p = await mkdtemp(path.join(os.tmpdir(), "godmods-audit-")); roots.push(p); return p; }
const hash = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
function dds() {
  const b = Buffer.alloc(128 + 16 * 16 * 16);
  b.write("DDS ", 0); b.writeUInt32LE(124, 4); b.writeUInt32LE(0x1007, 8);
  b.writeUInt32LE(16, 12); b.writeUInt32LE(16, 16); b.writeUInt32LE(5, 28);
  b.writeUInt32LE(32, 76); b.writeUInt32LE(4, 80); b.write("DXT5", 84);
  return b;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(p => rm(p, { recursive: true, force: true }))); });

describe("PES 2017 read-only resource audit", () => {
  it("inventories stadium pitch resources, hashes files and audits DDS", async () => {
    const root = await temp();
    const dir = path.join(root, "common/bg/model/bg/pitch"); await mkdir(dir, { recursive: true });
    const texture = dds(); await writeFile(path.join(dir, "pitch.dds"), texture);
    await writeFile(path.join(root, "kit.bin"), "kit-resource");
    const report = await scanResourceRoot(root);
    expect(report.scanMode).toBe("read-only");
    expect(report.summary["stadium-pitch"]).toBe(1);
    expect(report.summary["kit-equipment"]).toBe(1);
    expect(report.records.find(r => r.relativePath.endsWith("pitch.dds"))?.sha256).toBe(hash(texture));
    expect(report.records.find(r => r.relativePath.endsWith("pitch.dds"))?.texture?.valid).toBe(true);
  });
  it("does not follow symbolic links", async () => {
    const root = await temp(); const outside = await temp();
    await writeFile(path.join(outside, "secret.dds"), dds());
    await symlink(outside, path.join(root, "linked"), "junction");
    const report = await scanResourceRoot(root);
    expect(report.records).toHaveLength(0);
    expect(report.skippedSymlinks).toBe(1);
  });
  it("rejects a symlink scan root", async () => {
    const root = await temp(); const link = path.join(root, "root-link");
    await symlink(root, link, "junction");
    await expect(scanResourceRoot(link)).rejects.toThrow(/real directory/);
  });
  it("validates only evidenced mappings with exact source and target hashes", async () => {
    const root = await temp(); const game = path.join(root, "game"); await mkdir(game);
    const source = Buffer.from("GODMODS original mapped DDS"); const target = Buffer.from("installed target resource");
    await writeFile(path.join(root, "source.dds"), source); await writeFile(path.join(game, "pitch.dds"), target);
    await writeFile(path.join(game, "sider.log"), "controlled path evidence");
    const manifest = {
      schemaVersion: 1, department: "stadiums", target: { game: "PES 2017" },
      compatibility: { patch: "YosfX test build", siderVersion: "3.5.x" },
      mappings: [{
        sourceRelativePath: "source.dds", sourceSha256: hash(source),
        targetRelativePath: "pitch.dds", targetSha256: hash(target), resourceRole: "pitch",
        mappingEvidence: { method: "sider-log", evidenceRelativePath: "sider.log" },
        uvLayoutConfirmed: true, materialRoleConfirmed: true, pixelFormatConfirmed: true
      }]
    };
    const manifestPath = path.join(root, "mapping.json"); await writeFile(manifestPath, JSON.stringify(manifest));
    const result = await validateBindingManifest(manifestPath, game);
    expect(result.valid).toBe(true);
    expect(result.status).toBe("resource-mapped-not-game-verified");
  });
  it("blocks hash drift, unsafe traversal and unconfirmed material semantics", async () => {
    const root = await temp(); const game = path.join(root, "game"); await mkdir(game);
    const source = Buffer.from("source"); await writeFile(path.join(root, "source.dds"), source);
    await writeFile(path.join(game, "target.dds"), "target");
    const manifest = {
      schemaVersion: 1, department: "kits", target: { game: "PES 2017" }, compatibility: { patch: "YosfX", siderVersion: "3.5" },
      mappings: [{
        sourceRelativePath: "source.dds", sourceSha256: hash(source), targetRelativePath: "../outside.dds",
        targetSha256: hash("wrong"), resourceRole: "diffuse",
        mappingEvidence: { method: "manual-inspection", evidenceRelativePath: "notes.txt" },
        uvLayoutConfirmed: false, materialRoleConfirmed: false, pixelFormatConfirmed: false
      }]
    };
    const manifestPath = path.join(root, "bad.json"); await writeFile(manifestPath, JSON.stringify(manifest));
    const result = await validateBindingManifest(manifestPath, game);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/safe relative path|UV layout|Material role|pixel format/);
  });
  it("does not grant in-game verified status without complete real-game evidence", async () => {
    const root = await temp(); const game = path.join(root, "game"); await mkdir(game);
    const source = Buffer.from("source"), target = Buffer.from("target");
    await writeFile(path.join(root, "source.dds"), source); await writeFile(path.join(game, "target.dds"), target);
    await writeFile(path.join(game, "evidence.png"), "capture");
    const manifest = {
      schemaVersion: 1, department: "players", target: { game: "PES 2017" }, compatibility: { patch: "YosfX", siderVersion: "3.5" },
      mappings: [{ sourceRelativePath: "source.dds", sourceSha256: hash(source), targetRelativePath: "target.dds", targetSha256: hash(target), resourceRole: "face-detail", mappingEvidence: { method: "controlled-overlay-test", evidenceRelativePath: "evidence.png" }, uvLayoutConfirmed: true, materialRoleConfirmed: true, pixelFormatConfirmed: true }],
      gameValidation: { status: "passed", rollbackTested: false }
    };
    const p = path.join(root, "mapping.json"); await writeFile(p, JSON.stringify(manifest));
    const result = await validateBindingManifest(p, game);
    expect(result.valid).toBe(false);
    expect(result.status).toBe("blocked");
  });
});
