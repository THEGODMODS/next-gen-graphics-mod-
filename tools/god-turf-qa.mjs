#!/usr/bin/env node
/**
 * Evidence-focused QA for the original GOD TURF nine-surface library and
 * its additive Stadium Server sidecar. Passing this audit is not game mapping.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, open, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ROOT = path.join(ROOT, "content", "originals", "generated", "GOD-TURF");
const VARIANTS = [
  "natural-cut", "stadium-emerald", "heritage-worn", "cool-climate",
  "sunlit-hybrid", "matchday-striped", "broadcast-cut", "natural-pro", "hybrid-elite"
];
const MAPS = ["albedo", "normal-source", "roughness-source"];
const SAFE = value => typeof value === "string" && value.length > 0 &&
  !value.includes("\\") && !value.includes("\0") && !path.posix.isAbsolute(value) &&
  !/^[a-zA-Z]:/.test(value) && value.split("/").every(part => part && part !== "." && part !== ".." && !part.includes(":"));

async function regularFile(base, relative, label) {
  if (!SAFE(relative)) throw new Error(label + " has an unsafe relative path: " + relative);
  let current = base;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(label + " traverses a symbolic link: " + relative);
  }
  const stat = await lstat(current);
  if (!stat.isFile()) throw new Error(label + " is not a regular file: " + relative);
  return { file: current, stat };
}
async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function ddsInfo(file, bytes) {
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(148);
    const { bytesRead } = await handle.read(header, 0, 148, 0);
    const info = inspectDds(header.subarray(0, bytesRead), bytes);
    if (!info.valid) throw new Error(info.errors.join("; "));
    if (info.width !== 512 || info.height !== 512 || info.mipCount !== 10 || info.format !== "RGBA8_UNORM") {
      throw new Error("Expected 512x512 RGBA8 DDS with a complete 10-level mip chain.");
    }
    if (info.bytes !== info.dataOffset + info.requiredPayloadBytes) throw new Error("DDS contains unexpected trailing or missing payload bytes.");
    return info;
  } finally { await handle.close(); }
}

export async function auditGodTurf(input = DEFAULT_ROOT) {
  const root = path.resolve(input);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("GOD TURF root must be a real directory.");
  const packFile = await regularFile(root, "pack.json", "GOD TURF package manifest");
  const libraryFile = await regularFile(root, "surface-library.json", "GOD TURF surface library");
  const pack = JSON.parse(await readFile(packFile.file, "utf8"));
  const library = JSON.parse(await readFile(libraryFile.file, "utf8"));
  if (pack.id !== "thegodmods.god-turf-premium" || pack.installable !== false) throw new Error("Unexpected GOD TURF package identity or installability flag.");
  if (pack.textures?.length !== VARIANTS.length || library.variants?.length !== VARIANTS.length) throw new Error("GOD TURF must contain exactly nine surface variants.");
  if (library.resolution !== 512 || library.format !== "DDS RGBA8 mipmapped") throw new Error("Unexpected GOD TURF library dimensions or format.");
  const ids = pack.textures.map(item => item.id);
  if (ids.join("|") !== VARIANTS.join("|") || library.variants.map(item => item.id).join("|") !== VARIANTS.join("|")) {
    throw new Error("GOD TURF variants are missing, duplicated or out of canonical order.");
  }
  if (pack.assets?.length !== VARIANTS.length * MAPS.length) throw new Error("GOD TURF must contain exactly 27 DDS source maps.");
  const assets = new Map(pack.assets.map(item => [item.file, item]));
  if (assets.size !== pack.assets.length) throw new Error("GOD TURF manifest contains duplicate asset paths.");
  let ddsCount = 0;
  for (const variant of VARIANTS) for (const map of MAPS) {
    const relative = "textures/" + variant + "-" + map + ".dds";
    const record = assets.get(relative);
    if (!record) throw new Error("Missing GOD TURF asset record: " + relative);
    const { file, stat } = await regularFile(root, relative, "GOD TURF asset");
    if (stat.size !== record.bytes) throw new Error("GOD TURF byte count mismatch: " + relative);
    const sha256 = await hashFile(file);
    if (sha256 !== record.sha256) throw new Error("GOD TURF SHA-256 mismatch: " + relative);
    const info = await ddsInfo(file, stat.size);
    if (record.width !== info.width || record.height !== info.height || record.format !== "DDS RGBA8 mipmapped") {
      throw new Error("GOD TURF DDS metadata mismatch: " + relative);
    }
    ddsCount += 1;
  }

  const sidecarRoot = path.join(root, "stadium-server-layout");
  const sidecarManifestFile = await regularFile(root, "stadium-server-layout/common/bg/model/bg/pitch/GODMODS/manifest.json", "Stadium Server sidecar manifest");
  const sidecarManifest = JSON.parse(await readFile(sidecarManifestFile.file, "utf8"));
  if (sidecarManifest.id !== "thegodmods.god-turf-stadium-server-layout" ||
      sidecarManifest.modifiesExistingFiles !== false || sidecarManifest.replacesExistingResources !== false) {
    throw new Error("GOD TURF sidecar identity or non-destructive guarantees are invalid.");
  }
  if (sidecarManifest.variants?.length !== VARIANTS.length || sidecarManifest.assets?.length !== VARIANTS.length * MAPS.length) {
    throw new Error("Stadium Server sidecar must contain all nine variants and 27 DDS assets.");
  }
  if (sidecarManifest.variants.map(item => item.id).join("|") !== VARIANTS.join("|")) throw new Error("Stadium Server sidecar variants do not match the canonical surface library.");
  const sidecarKeys = new Set(sidecarManifest.assets.map(item => item.variant + "/" + item.map));
  if (sidecarKeys.size !== sidecarManifest.assets.length) throw new Error("Stadium Server sidecar contains duplicate variant/map records.");
  if (sidecarManifest.installationMode !== "additive-sidecar-assets" || !String(sidecarManifest.compatibility?.status || "").includes("pending")) throw new Error("Stadium Server sidecar compatibility state is not evidence-gated.");
  for (const item of sidecarManifest.assets) {
    if (!VARIANTS.includes(item.variant) || !MAPS.includes(item.map)) throw new Error("Unexpected sidecar variant or map.");
    const { file, stat } = await regularFile(sidecarRoot, item.file, "Stadium Server sidecar asset");
    if (stat.size !== item.bytes || await hashFile(file) !== item.sha256) throw new Error("Sidecar hash or byte count mismatch: " + item.file);
    const sourceName = "textures/" + path.posix.basename(item.file);
    const sourceRecord = assets.get(sourceName);
    if (!sourceRecord || sourceRecord.sha256 !== item.sha256) throw new Error("Sidecar asset differs from its original source: " + item.file);
  }
  return {
    status: "god-turf-source-and-sidecar-qa-passed-not-game-mapped",
    variants: VARIANTS.length,
    ddsAssets: ddsCount,
    sidecarAssets: sidecarManifest.assets.length,
    resolution: "512x512",
    format: "RGBA8_UNORM",
    mipLevels: 10,
    modifiesExistingFiles: false,
    gameResourceMappingVerified: false
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(await auditGodTurf(process.argv[2] || DEFAULT_ROOT), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "GOD TURF audit failed.");
    process.exitCode = 1;
  }
}
