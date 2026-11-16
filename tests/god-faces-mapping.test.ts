import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true }))));
const texture = (id: string, role: string) => ({
  resourceId: id, path: `face-server/${id}.dds`, sha256: "a".repeat(64),
  width: 1024, height: 1024, format: "BC3", mipCount: 11,
  uvMaskPath: `evidence/${id}-uv.png`, uvMaskSha256: "b".repeat(64),
  uvMaskWidth: 1024, uvMaskHeight: 1024, uvMaskFormat: "R8", uvMaskMipCount: 1,
  uvSet: "UV0 confirmed in inspected model", materialRole: role,
  uvRegion: `${role} region only`, normalConvention: "verified target tangent-space convention"
});
const evidence = () => ({
  schemaVersion: 1, kind: "godmods-face-mapping-evidence",
  target: { gameBuild: "PES build recorded by tester", patchName: "YosfX", patchVersion: "recorded", siderVersion: "recorded", faceServerVersion: "recorded" },
  player: { playerId: "roster-id-confirmed", teamId: "team-id-confirmed", rosterFile: "database/roster.bin", rosterSha256: "c".repeat(64), faceAssignmentEvidence: "assignment cross-checked against installed roster" },
  face: texture("face-resource", "skin detail"),
  hair: texture("hair-resource", "hair detail"),
  safety: { outputPath: "GODMODS/Players/face-resource/", originalsUntouched: true, backupReference: "backup outside game directory", collisionChecked: true }
});
async function run(data: unknown) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "god-faces-map-")); dirs.push(dir);
  const file = path.join(dir, "evidence.json"); await writeFile(file, JSON.stringify(data));
  return execFileAsync(process.execPath, [path.resolve(process.cwd(), "tools/god-faces-mapping.mjs"), file]);
}
describe("GOD FACES mapping evidence gate", () => {
  it("accepts complete evidence without authorizing deployment or claiming in-game verification", async () => {
    const { stdout } = await run(evidence()); const report = JSON.parse(stdout);
    expect(report.status).toBe("evidence-valid"); expect(report.deploymentAuthorized).toBe(false); expect(report.inGameVerified).toBe(false);
    expect(report.checks.rosterIdentityEvidence).toBe(true); expect(report.checks.separateFaceHairRegions).toBe(true);
  });
  it("blocks missing roster identity and mismatched face UV evidence", async () => {
    const e = evidence(); e.player.playerId = ""; e.face.uvMaskWidth = 512;
    const { stdout } = await run(e).catch((err) => ({ stdout: err.stdout })); const report = JSON.parse(stdout);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("player.playerId must identify the exact roster entry");
    expect(report.issues).toContain("face UV mask dimensions must match its texture");
  });
  it("rejects path traversal, unsafe output and missing hair resource evidence", async () => {
    const e = evidence(); e.hair.path = "../../original.dds"; e.hair.sha256 = "bad"; e.safety.outputPath = "Data/overwrite.dds";
    const { stdout } = await run(e).catch((err) => ({ stdout: err.stdout })); const report = JSON.parse(stdout);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("hair.path must be a safe relative path");
    expect(report.issues).toContain("hair.sha256 must be a SHA-256 digest");
    expect(report.issues).toContain("safety.outputPath must stay inside a dedicated GODMODS/ namespace");
  });
});
