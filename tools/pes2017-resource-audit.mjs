#!/usr/bin/env node
/**
 * Read-only PES 2017 / YosfX resource discovery and mapping gate.
 * Never writes into a game, patch, Stadium Server, Kit Server or LiveCPK root.
 */
import { createHash } from "node:crypto";
import { readdir, lstat, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const RESOURCE_EXTENSIONS = new Set([".dds", ".ftex", ".bin", ".xml", ".mtl", ".json", ".ini", ".lua", ".fpk", ".cpk"]);
const MAX_FILES = 100000;
const MAX_FILE_BYTES = 512 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const normalize = value => String(value).replaceAll("\\\\", "/");

function classifyResource(relativePath) {
  const p = normalize(relativePath).toLowerCase();
  if (p.includes("/pitch/") || p.includes("/bg/model/bg/pitch/")) return "stadium-pitch";
  if (p.includes("stadium") || p.includes("/ad/") || p.includes("adboard") || p.includes("led")) return "stadium-presentation";
  if (p.includes("kit") || p.includes("uniform") || p.includes("wear")) return "kit-equipment";
  if (p.includes("face") || p.includes("hair") || p.includes("player")) return "player-appearance";
  return "unclassified";
}

async function digestFile(file) {
  const handle = await open(file, "r");
  try {
    const stat = await handle.stat();
    if (stat.size > MAX_FILE_BYTES) return { sha256: null, error: "File exceeds the 512 MiB audit limit." };
    const hash = createHash("sha256");
    const chunk = Buffer.alloc(1024 * 1024);
    let position = 0;
    while (position < stat.size) {
      const { bytesRead } = await handle.read(chunk, 0, Math.min(chunk.length, stat.size - position), position);
      if (!bytesRead) break;
      hash.update(chunk.subarray(0, bytesRead));
      position += bytesRead;
    }
    return { sha256: hash.digest("hex"), error: null };
  } finally { await handle.close(); }
}

async function walk(root, current, records, counters) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (records.length >= MAX_FILES) { counters.limitReached = true; return; }
    const absolute = path.join(current, entry.name);
    const relativePath = normalize(path.relative(root, absolute));
    if (entry.isSymbolicLink()) {
      counters.skippedSymlinks++;
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, absolute, records, counters);
      if (counters.limitReached) return;
      continue;
    }
    if (!entry.isFile() || !RESOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = await lstat(absolute);
    const digest = await digestFile(absolute);
    const record = {
      relativePath, bytes: stat.size, extension: path.extname(entry.name).toLowerCase(),
      category: classifyResource(relativePath), sha256: digest.sha256, errors: digest.error ? [digest.error] : []
    };
    if (record.extension === ".dds" && !digest.error) {
      const handle = await open(absolute, "r");
      try {
        const header = Buffer.alloc(148);
        const { bytesRead } = await handle.read(header, 0, 148, 0);
        record.texture = inspectDds(header.subarray(0, bytesRead), stat.size);
        if (!record.texture.valid) record.errors.push(...record.texture.errors);
      } finally { await handle.close(); }
    }
    records.push(record);
  }
}

/** Read-only inventory of candidate game/patch resources. */
export async function scanResourceRoot(inputRoot) {
  const root = path.resolve(inputRoot);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("Scan root must be a real directory, not a symlink.");
  const records = [];
  const counters = { skippedSymlinks: 0, limitReached: false };
  await walk(root, root, records, counters);
  return {
    schemaVersion: 1, generatedAt: new Date().toISOString(), scanMode: "read-only",
    rootLabel: path.basename(root), filesScanned: records.length,
    skippedSymlinks: counters.skippedSymlinks, limitReached: counters.limitReached,
    summary: Object.fromEntries(["stadium-pitch", "stadium-presentation", "kit-equipment", "player-appearance", "unclassified"].map(category => [category, records.filter(r => r.category === category).length])),
    records
  };
}

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function safeRelative(value) {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) return false;
  const parts = normalize(value).split("/");
  return !parts.some(part => !part || part === "." || part === "..");
}

/**
 * Validate an explicitly authored binding manifest against a read-only inventory.
 * Presence and matching hashes prove file identity, not correct shader semantics.
 */
export async function validateBindingManifest(manifestPath, resourceRoot) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const errors = [];
  if (!isObject(manifest) || manifest.schemaVersion !== 1) return { valid: false, status: "blocked", errors: ["Manifest must be an object with schemaVersion 1."], mappings: [] };
  if (!["stadiums", "kits", "players"].includes(manifest.department)) errors.push("department must be stadiums, kits or players.");
  if (!isObject(manifest.target) || manifest.target.game !== "PES 2017") errors.push("target.game must be PES 2017.");
  if (!isObject(manifest.compatibility) || !manifest.compatibility.patch || !manifest.compatibility.siderVersion) errors.push("Exact patch and Sider version must be declared; use 'unknown' only for discovery, not release.");
  if (!Array.isArray(manifest.mappings) || manifest.mappings.length === 0) errors.push("At least one mapping is required.");
  const root = path.resolve(resourceRoot);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("Resource root must be a real directory, not a symlink.");
  const mappings = [];
  for (const [index, item] of (Array.isArray(manifest.mappings) ? manifest.mappings : []).entries()) {
    const rowErrors = [];
    if (!isObject(item)) { mappings.push({ index, valid: false, errors: ["Mapping must be an object."] }); continue; }
    if (!safeRelative(item.targetRelativePath)) rowErrors.push("targetRelativePath must be a safe relative path without traversal.");
    if (!safeRelative(item.sourceRelativePath)) rowErrors.push("sourceRelativePath must be a safe relative path.");
    if (!SHA256.test(item.targetSha256 || "")) rowErrors.push("targetSha256 must be a lowercase SHA-256 digest.");
    if (!SHA256.test(item.sourceSha256 || "")) rowErrors.push("sourceSha256 must be a lowercase SHA-256 digest.");
    if (!["diffuse", "normal", "roughness", "mask", "adboard", "pitch", "face-detail", "hair-detail", "other"].includes(item.resourceRole)) rowErrors.push("resourceRole is missing or unsupported.");
    if (!isObject(item.mappingEvidence) || !["sider-log", "controlled-overlay-test", "creator-resource-map", "manual-inspection"].includes(item.mappingEvidence.method) || !safeRelative(item.mappingEvidence.evidenceRelativePath)) rowErrors.push("Mapping evidence must identify an allowed method and a safe evidence file path.");
    if (isObject(item.mappingEvidence) && safeRelative(item.mappingEvidence.evidenceRelativePath)) {
      const evidencePath = path.resolve(root, item.mappingEvidence.evidenceRelativePath);
      if (!evidencePath.startsWith(root + path.sep)) rowErrors.push("Evidence path escapes the selected resource root.");
      else {
        try {
          const evidenceStat = await lstat(evidencePath);
          if (!evidenceStat.isFile() || evidenceStat.isSymbolicLink()) rowErrors.push("Mapping evidence is not a regular file.");
        } catch { rowErrors.push("Mapping evidence file does not exist in the selected resource root."); }
      }
    }
    if (safeRelative(item.targetRelativePath)) {
      const target = path.resolve(root, item.targetRelativePath);
      if (!target.startsWith(root + path.sep)) rowErrors.push("Target path escapes the selected resource root.");
      else {
        try {
          const st = await lstat(target);
          if (!st.isFile() || st.isSymbolicLink()) rowErrors.push("Target resource is not a regular file.");
          else {
            const d = await digestFile(target);
            if (d.sha256 !== item.targetSha256) rowErrors.push("Target SHA-256 does not match the installed resource.");
          }
        } catch { rowErrors.push("Target resource does not exist in the selected resource root."); }
      }
    }
    if (safeRelative(item.sourceRelativePath)) {
      const source = path.resolve(path.dirname(path.resolve(manifestPath)), item.sourceRelativePath);
      try {
        const st = await lstat(source);
        if (!st.isFile() || st.isSymbolicLink()) rowErrors.push("Source asset is not a regular file.");
        else {
          const d = await digestFile(source);
          if (d.sha256 !== item.sourceSha256) rowErrors.push("Source SHA-256 does not match the GODMODS asset.");
        }
      } catch { rowErrors.push("Source asset does not exist relative to the manifest."); }
    }
    if (item.uvLayoutConfirmed !== true) rowErrors.push("UV layout is not confirmed.");
    if (item.materialRoleConfirmed !== true) rowErrors.push("Material role is not confirmed.");
    if (item.pixelFormatConfirmed !== true) rowErrors.push("Target pixel format is not confirmed.");
    mappings.push({ index, targetRelativePath: item.targetRelativePath || null, valid: rowErrors.length === 0, errors: rowErrors });
  }
  const mappingErrors = mappings.flatMap(m => m.errors.map(e => `Mapping ${m.index + 1}: ${e}`));
  errors.push(...mappingErrors);
  let gameVerified = false;
  if (isObject(manifest.gameValidation) && manifest.gameValidation.status === "passed") {
    const g = manifest.gameValidation;
    gameVerified = Boolean(g.testedAt && !Number.isNaN(Date.parse(g.testedAt)) && g.gameBuild && g.patch && g.siderVersion && g.evidenceRelativePath && safeRelative(g.evidenceRelativePath) && g.rollbackTested === true);
    if (!gameVerified) errors.push("gameValidation.status cannot be passed without timestamp, exact build/patch/Sider, evidence path and rollback confirmation.");
  }
  const valid = errors.length === 0 && mappings.length > 0;
  return { valid, status: !valid ? "blocked" : gameVerified ? "in-game-verified" : "resource-mapped-not-game-verified", errors, mappings };
}

async function main(args) {
  const [command, root, output] = args;
  if (command === "scan" && root) {
    const report = await scanResourceRoot(root);
    const json = JSON.stringify(report, null, 2) + "\n";
    if (output) await writeFile(path.resolve(output), json);
    else process.stdout.write(json);
    if (report.limitReached) process.exitCode = 1;
    return;
  }
  if (command === "validate" && root && args[2]) {
    const result = await validateBindingManifest(root, args[2]);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.valid) process.exitCode = 1;
    return;
  }
  console.error("Usage:\n  node tools/pes2017-resource-audit.mjs scan <game-or-stadium-root> [report.json]\n  node tools/pes2017-resource-audit.mjs validate <binding-manifest.json> <game-or-stadium-root>");
  process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main(process.argv.slice(2));
