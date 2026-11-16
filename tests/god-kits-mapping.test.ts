import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];
afterEach(async () => Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

const validEvidence = () => ({
  schemaVersion: 1,
  kind: "godmods-kit-mapping-evidence",
  target: { gameBuild: "PES 2017 build supplied by tester", patchName: "YosfX", patchVersion: "tester-recorded", siderVersion: "tester-recorded", kitServerVersion: "tester-recorded" },
  source: {
    kitId: "team-kit-id-confirmed-by-user",
    texturePath: "kit-server/GDB/uni/team/home.png",
    textureSha256: "a".repeat(64),
    width: 1024, height: 1024, format: "RGBA8", mipCount: 1,
    uvMaskPath: "evidence/home-fabric-mask.dds",
    uvMaskSha256: "b".repeat(64),
    uvMaskWidth: 1024, uvMaskHeight: 1024, uvMaskFormat: "RGBA8", uvMaskMipCount: 1
  },
  mapping: { fabricRegion: "shirt body fabric only; seams and badges excluded", uvMaskChannel: "r", materialRole: "albedo-detail", normalConvention: "target-tested tangent-space convention", roughnessConvention: "target-tested roughness channel" },
  safety: { outputPath: "GODMODS/Kits/team-kit-id/home-detail.dds", originalUntouched: true, backupReference: "backup stored outside game directory", collisionChecked: true }
});

async function run(evidence: unknown) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "god-kits-map-"));
  tempDirs.push(dir);
  const file = path.join(dir, "evidence.json");
  await writeFile(file, JSON.stringify(evidence));
  return execFileAsync(process.execPath, [path.resolve(process.cwd(), "tools/god-kits-mapping.mjs"), file]);
}

describe("GOD KITS mapping evidence gate", () => {
  it("accepts complete matching evidence but never authorizes deployment or claims in-game verification", async () => {
    const { stdout } = await run(validEvidence());
    const report = JSON.parse(stdout);
    expect(report.status).toBe("evidence-valid");
    expect(report.deploymentAuthorized).toBe(false);
    expect(report.inGameVerified).toBe(false);
    expect(report.checks.matchingUvMask).toBe(true);
  });

  it("blocks missing target and texture evidence", async () => {
    const evidence = validEvidence();
    evidence.target.siderVersion = "";
    evidence.source.textureSha256 = "not-a-hash";
    const { stdout } = await run(evidence).catch((error) => ({ stdout: error.stdout }));
    const report = JSON.parse(stdout);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("target.siderVersion must identify the tested environment");
    expect(report.issues).toContain("source.textureSha256 must be a SHA-256 digest");
  });

  it("rejects mismatched masks, traversal paths and output outside GODMODS", async () => {
    const evidence = validEvidence();
    evidence.source.uvMaskWidth = 512;
    evidence.source.texturePath = "../../Data/original.dds";
    evidence.safety.outputPath = "Data/overwrite.dds";
    const { stdout } = await run(evidence).catch((error) => ({ stdout: error.stdout }));
    const report = JSON.parse(stdout);
    expect(report.status).toBe("blocked");
    expect(report.issues).toContain("source.texturePath must be a safe relative path to the inspected texture");
    expect(report.issues).toContain("UV mask dimensions must exactly match the source texture");
    expect(report.issues).toContain("safety.outputPath must stay inside a dedicated GODMODS/ namespace");
  });
});
