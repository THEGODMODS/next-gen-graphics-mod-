#!/usr/bin/env node
// GOD KITS mapping workbench: validate user-supplied kit evidence before any overlay is considered.
import { readFile } from "node:fs/promises";
import path from "node:path";

const fail = (message) => { throw new Error(message); };
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const sha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const safeRelative = (value) => nonEmpty(value) && !path.isAbsolute(value) &&
  !value.split(/[\\/]/).some((part) => part === ".." || part === "." || part === "");
const issues = [];
const need = (condition, message) => { if (!condition) issues.push(message); };

async function main() {
  const input = process.argv[2];
  if (!input) fail("Usage: node tools/god-kits-mapping.mjs <kit-evidence.json>");
  const evidence = JSON.parse(await readFile(path.resolve(input), "utf8"));
  need(evidence.schemaVersion === 1, "schemaVersion must be 1");
  need(evidence.kind === "godmods-kit-mapping-evidence", "kind must be godmods-kit-mapping-evidence");

  const target = evidence.target || {};
  for (const key of ["gameBuild", "patchName", "patchVersion", "siderVersion", "kitServerVersion"]) {
    need(nonEmpty(target[key]), `target.${key} must identify the tested environment`);
  }

  const source = evidence.source || {};
  need(nonEmpty(source.kitId), "source.kitId must identify the exact kit");
  need(safeRelative(source.texturePath), "source.texturePath must be a safe relative path to the inspected texture");
  need(sha256(source.textureSha256), "source.textureSha256 must be a SHA-256 digest");
  need(Number.isInteger(source.width) && source.width > 0, "source.width must be a positive integer");
  need(Number.isInteger(source.height) && source.height > 0, "source.height must be a positive integer");
  need(["RGBA8", "BGRA8"].includes(source.format), "source.format must be verified RGBA8 or BGRA8");
  need(Number.isInteger(source.mipCount) && source.mipCount > 0, "source.mipCount must be a positive integer");
  need(safeRelative(source.uvMaskPath), "source.uvMaskPath must be a safe relative path to a verified UV mask");
  need(sha256(source.uvMaskSha256), "source.uvMaskSha256 must be a SHA-256 digest");
  need(source.uvMaskWidth === source.width && source.uvMaskHeight === source.height, "UV mask dimensions must exactly match the source texture");
  need(source.uvMaskFormat === source.format, "UV mask format must match the source texture format");
  need(source.uvMaskMipCount === source.mipCount, "UV mask mip count must match the source texture mip count");

  const mapping = evidence.mapping || {};
  need(nonEmpty(mapping.fabricRegion), "mapping.fabricRegion must describe the inspected fabric-only UV region");
  need(["r", "g", "b", "a"].includes(mapping.uvMaskChannel), "mapping.uvMaskChannel must be r, g, b, or a");
  need(["albedo-detail", "normal-detail", "roughness-detail"].includes(mapping.materialRole), "mapping.materialRole must use a supported, explicit material role");
  need(nonEmpty(mapping.normalConvention), "mapping.normalConvention must state the target normal-map convention");
  need(nonEmpty(mapping.roughnessConvention), "mapping.roughnessConvention must state the target roughness channel/convention");

  const safety = evidence.safety || {};
  need(safeRelative(safety.outputPath) && safety.outputPath.replaceAll("\\", "/").startsWith("GODMODS/"),
    "safety.outputPath must stay inside a dedicated GODMODS/ namespace");
  need(safety.originalUntouched === true, "safety.originalUntouched must be explicitly true");
  need(nonEmpty(safety.backupReference), "safety.backupReference must identify the external backup of the original texture");
  need(safety.collisionChecked === true, "safety.collisionChecked must be explicitly true");

  const report = {
    schemaVersion: 1,
    product: "GOD KITS",
    status: issues.length ? "blocked" : "evidence-valid",
    deploymentAuthorized: false,
    inGameVerified: false,
    target: {
      gameBuild: target.gameBuild || null,
      patch: [target.patchName, target.patchVersion].filter(nonEmpty).join(" ") || null,
      siderVersion: target.siderVersion || null,
      kitServerVersion: target.kitServerVersion || null
    },
    kitId: source.kitId || null,
    checks: {
      sourceTextureEvidence: Boolean(sha256(source.textureSha256)),
      matchingUvMask: source.width === source.uvMaskWidth && source.height === source.uvMaskHeight &&
        source.format === source.uvMaskFormat && source.mipCount === source.uvMaskMipCount,
      fabricOnlyMapping: nonEmpty(mapping.fabricRegion),
      materialSemanticsDeclared: nonEmpty(mapping.normalConvention) && nonEmpty(mapping.roughnessConvention),
      additiveGODMODSOutput: safeRelative(safety.outputPath) && String(safety.outputPath).replaceAll("\\", "/").startsWith("GODMODS/"),
      originalPreserved: safety.originalUntouched === true && nonEmpty(safety.backupReference),
      collisionChecked: safety.collisionChecked === true
    },
    issues
  };
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (issues.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`GOD KITS mapping validation failed: ${error.message}\n`);
  process.exitCode = 1;
});
