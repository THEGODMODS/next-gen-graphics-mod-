#!/usr/bin/env node
// GOD FACES evidence gate. Validates supplied player/face/hair mapping evidence only.
import { readFile } from "node:fs/promises";
import path from "node:path";

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const digest = (v) => typeof v === "string" && /^[a-f0-9]{64}$/i.test(v);
const safeRelative = (v) => nonEmpty(v) && !path.isAbsolute(v) &&
  !v.split(/[\\/]/).some((part) => part === ".." || part === "." || part === "");
const issues = [];
const need = (ok, message) => { if (!ok) issues.push(message); };

function validateTexture(texture, label) {
  need(texture && nonEmpty(texture.resourceId), `${label}.resourceId must identify the exact target resource`);
  need(safeRelative(texture.path), `${label}.path must be a safe relative path`);
  need(digest(texture.sha256), `${label}.sha256 must be a SHA-256 digest`);
  need(Number.isInteger(texture.width) && texture.width > 0, `${label}.width must be a positive integer`);
  need(Number.isInteger(texture.height) && texture.height > 0, `${label}.height must be a positive integer`);
  need(["RGBA8", "BGRA8", "BC1", "BC3", "BC5", "BC7"].includes(texture.format), `${label}.format must be a recognized, verified texture format`);
  need(Number.isInteger(texture.mipCount) && texture.mipCount > 0, `${label}.mipCount must be a positive integer`);
  need(safeRelative(texture.uvMaskPath), `${label}.uvMaskPath must be a safe relative path to a verified UV mask`);
  need(digest(texture.uvMaskSha256), `${label}.uvMaskSha256 must be a SHA-256 digest`);
  need(texture.uvMaskWidth === texture.width && texture.uvMaskHeight === texture.height, `${label} UV mask dimensions must match its texture`);
  need(texture.uvMaskFormat === "R8" || texture.uvMaskFormat === "RGBA8", `${label}.uvMaskFormat must be verified R8 or RGBA8`);
  need(texture.uvMaskMipCount === 1 || texture.uvMaskMipCount === texture.mipCount, `${label} UV mask mip count must be 1 or match the texture`);
  need(nonEmpty(texture.uvSet), `${label}.uvSet must identify the inspected UV set`);
  need(nonEmpty(texture.materialRole), `${label}.materialRole must state the target material role`);
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: node tools/god-faces-mapping.mjs <face-evidence.json>");
  const e = JSON.parse(await readFile(path.resolve(input), "utf8"));
  need(e.schemaVersion === 1, "schemaVersion must be 1");
  need(e.kind === "godmods-face-mapping-evidence", "kind must be godmods-face-mapping-evidence");
  const target = e.target || {};
  for (const key of ["gameBuild", "patchName", "patchVersion", "siderVersion", "faceServerVersion"]) {
    need(nonEmpty(target[key]), `target.${key} must identify the tested environment`);
  }
  const player = e.player || {};
  need(nonEmpty(player.playerId), "player.playerId must identify the exact roster entry");
  need(nonEmpty(player.teamId), "player.teamId must identify the exact team/roster context");
  need(safeRelative(player.rosterFile), "player.rosterFile must be a safe relative path to the inspected roster source");
  need(digest(player.rosterSha256), "player.rosterSha256 must be a SHA-256 digest");
  need(nonEmpty(player.faceAssignmentEvidence), "player.faceAssignmentEvidence must describe how the roster assignment was confirmed");
  const face = e.face || {};
  const hair = e.hair || {};
  validateTexture(face, "face");
  validateTexture(hair, "hair");
  need(nonEmpty(face.uvRegion), "face.uvRegion must describe the inspected face-only UV region");
  need(nonEmpty(hair.uvRegion), "hair.uvRegion must describe the inspected hair-only UV region");
  need(nonEmpty(face.normalConvention), "face.normalConvention must state the target normal-map convention");
  need(nonEmpty(hair.normalConvention), "hair.normalConvention must state the target normal-map convention");
  const safety = e.safety || {};
  need(safeRelative(safety.outputPath) && String(safety.outputPath).replaceAll("\\", "/").startsWith("GODMODS/"),
    "safety.outputPath must stay inside a dedicated GODMODS/ namespace");
  need(safety.originalsUntouched === true, "safety.originalsUntouched must be explicitly true");
  need(nonEmpty(safety.backupReference), "safety.backupReference must identify external backups");
  need(safety.collisionChecked === true, "safety.collisionChecked must be explicitly true");
  const report = {
    schemaVersion: 1, product: "GOD FACES",
    status: issues.length ? "blocked" : "evidence-valid",
    deploymentAuthorized: false, inGameVerified: false,
    target: { gameBuild: target.gameBuild || null, patch: [target.patchName, target.patchVersion].filter(nonEmpty).join(" ") || null, siderVersion: target.siderVersion || null, faceServerVersion: target.faceServerVersion || null },
    player: { playerId: player.playerId || null, teamId: player.teamId || null },
    checks: {
      rosterIdentityEvidence: digest(player.rosterSha256) && nonEmpty(player.faceAssignmentEvidence),
      faceTextureAndUvEvidence: digest(face.sha256) && digest(face.uvMaskSha256) && face.width === face.uvMaskWidth && face.height === face.uvMaskHeight,
      hairTextureAndUvEvidence: digest(hair.sha256) && digest(hair.uvMaskSha256) && hair.width === hair.uvMaskWidth && hair.height === hair.uvMaskHeight,
      separateFaceHairRegions: nonEmpty(face.uvRegion) && nonEmpty(hair.uvRegion),
      additiveOutput: safeRelative(safety.outputPath) && String(safety.outputPath).replaceAll("\\", "/").startsWith("GODMODS/"),
      originalsPreserved: safety.originalsUntouched === true && nonEmpty(safety.backupReference),
      collisionChecked: safety.collisionChecked === true
    },
    issues
  };
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (issues.length) process.exitCode = 1;
}
main().catch((error) => { process.stderr.write(`GOD FACES mapping validation failed: ${error.message}\n`); process.exitCode = 1; });
