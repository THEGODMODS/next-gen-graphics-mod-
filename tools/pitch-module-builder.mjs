#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const PITCH_SUBTREE = "common/bg/model/bg/pitch";
const ID = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const SHA = /^[a-f0-9]{64}$/i;

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0") ||
      path.posix.isAbsolute(value) || /^[a-zA-Z]:/.test(value)) {
    throw new Error(label + " must be a safe relative POSIX path.");
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes(":"))) {
    throw new Error(label + " contains an unsafe path segment.");
  }
  return parts.join("/");
}

async function assertRegularFileNoLink(file, label) {
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(label + " must be a regular file, not a symbolic link.");
  }
}

async function regularFileNoLinks(base, relative, label) {
  const safe = safeRelative(relative, label);
  let current = base;
  for (const part of safe.split("/")) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(label + " must not traverse symbolic links.");
  }
  const stat = await lstat(current);
  if (!stat.isFile()) throw new Error(label + " must resolve to a regular file.");
  return current;
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function readDdsHeader(file, size) {
  const { open } = await import("node:fs/promises");
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(148);
    const { bytesRead } = await handle.read(buffer, 0, 148, 0);
    return inspectDds(buffer.subarray(0, bytesRead), size);
  } finally {
    await handle.close();
  }
}

export async function buildPitchModule({ descriptorPath, inventoryPath, outputPath, stadiumFolder }) {
  const descriptorFile = path.resolve(descriptorPath);
  const inventoryFile = path.resolve(inventoryPath);
  const output = path.resolve(outputPath);
  await assertRegularFileNoLink(descriptorFile, "Descriptor");
  await assertRegularFileNoLink(inventoryFile, "Inventory");

  const descriptorBase = path.dirname(descriptorFile);
  const stadiumPitchRoot = stadiumFolder ? path.join(path.resolve(stadiumFolder), "common", "bg", "model", "bg", "pitch") : null;
  if (stadiumPitchRoot) {
    const rootStat = await lstat(path.resolve(stadiumFolder));
    const pitchStat = await lstat(stadiumPitchRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !pitchStat.isDirectory() || pitchStat.isSymbolicLink()) throw new Error("Current Stadium Server pitch folder is not a safe directory.");
  }
  const descriptor = JSON.parse(await readFile(descriptorFile, "utf8"));
  const inventory = JSON.parse(await readFile(inventoryFile, "utf8"));

  if (descriptor.schemaVersion !== 1) throw new Error("Descriptor schemaVersion must be 1.");
  if (!ID.test(descriptor.id ?? "")) throw new Error("id must be lowercase and namespaced.");
  if (typeof descriptor.name !== "string" || !descriptor.name.trim() ||
      typeof descriptor.version !== "string" || !/^\\d+\\.\\d+\\.\\d+$/.test(descriptor.version)) {
    throw new Error("A name and semantic version are required.");
  }
  if (!descriptor.license || typeof descriptor.license.id !== "string" ||
      !descriptor.license.id.trim() || typeof descriptor.license.redistributionAllowed !== "boolean") {
    throw new Error("Explicit license metadata is required.");
  }
  if (inventory.schemaVersion !== 1 || inventory.subtree !== PITCH_SUBTREE) {
    throw new Error("Inventory is not a supported Stadium Server pitch inventory.");
  }
  if (!Array.isArray(inventory.records) || !Array.isArray(descriptor.replacements) ||
      !descriptor.replacements.length) {
    throw new Error("Inventory records and at least one replacement are required.");
  }

  const inventoryByPath = new Map();
  for (const record of inventory.records) {
    if (!record || typeof record.path !== "string" || typeof record.sha256 !== "string") continue;
    const key = safeRelative(record.path, "inventory record path").toLowerCase();
    if (inventoryByPath.has(key)) throw new Error("Inventory contains duplicate paths: " + record.path);
    inventoryByPath.set(key, record);
  }

  const files = [];
  const seenTargets = new Set();
  for (let index = 0; index < descriptor.replacements.length; index++) {
    const item = descriptor.replacements[index];
    const originalPath = safeRelative(item.inventoryPath, "replacements[" + index + "].inventoryPath");
    const targetKey = originalPath.toLowerCase();
    if (seenTargets.has(targetKey)) throw new Error("Duplicate pitch resource mapping: " + originalPath);
    seenTargets.add(targetKey);

    const original = inventoryByPath.get(targetKey);
    if (!original || original.path !== originalPath) {
      throw new Error("Resource is absent from the supplied inventory: " + originalPath);
    }
    if (!SHA.test(item.originalSha256 ?? "") ||
        item.originalSha256.toLowerCase() !== original.sha256.toLowerCase()) {
      throw new Error("Original resource fingerprint does not match inventory: " + originalPath);
    }
    if (stadiumPitchRoot) {
      const currentOriginal = await regularFileNoLinks(stadiumPitchRoot, originalPath, "original pitch resource");
      if ((await hashFile(currentOriginal)).toLowerCase() !== original.sha256.toLowerCase()) throw new Error("Stadium resource changed after inventory; scan again before building: " + originalPath);
    }

    const replacementPath = safeRelative(item.replacementFile, "replacements[" + index + "].replacementFile");
    const source = await regularFileNoLinks(descriptorBase, replacementPath, "replacementFile");
    const targetExtension = path.posix.extname(originalPath).toLowerCase();
    if (targetExtension !== path.extname(source).toLowerCase()) {
      throw new Error("Replacement extension must match original resource: " + originalPath);
    }
    files.push({
      source: "payload/" + originalPath,
      target: "LiveCPK/" + PITCH_SUBTREE + "/" + originalPath,
      localSource: source,
      isDds: targetExtension === ".dds"
    });
  }

  const game = {
    title: "PES 2017",
    executable: ["PES2017.exe", "PES2017patched.exe"],
    sider: ">=3.5.0 <4.0.0"
  };
  const manifest = {
    schemaVersion: 1,
    id: descriptor.id,
    name: descriptor.name.trim(),
    version: descriptor.version,
    description: typeof descriptor.description === "string"
      ? descriptor.description
      : "Verified Stadium Server pitch resource replacements.",
    category: "stadiums",
    game,
    dependencies: [],
    conflicts: [],
    files: [],
    luaModules: [],
    license: descriptor.license
  };

  const parent = path.dirname(output);
  const stage = path.join(parent, "." + path.basename(output) + ".stage-" + randomUUID());
  let existing = null;
  try { existing = await lstat(output); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new Error("Output path must be a real directory.");
  }
  if (existing && (await readdir(output)).length) {
    throw new Error("Output directory must be empty; refusing to overwrite existing content.");
  }

  await mkdir(parent, { recursive: true });
  await mkdir(stage, { recursive: false });
  try {
    for (const file of files) {
      const destination = path.join(stage, ...file.source.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(file.localSource, destination, constants.COPYFILE_EXCL);

      // Hash and validate the staged bytes, not the mutable source path.
      const stagedHash = await hashFile(destination);
      if (file.isDds) {
        const stagedStat = await lstat(destination);
        const audit = await readDdsHeader(destination, stagedStat.size);
        if (!audit.valid) {
          throw new Error("Staged replacement DDS failed audit for " + file.target + ": " + audit.errors.join("; "));
        }
      }
      manifest.files.push({
        source: file.source,
        target: file.target,
        sha256: stagedHash
      });
    }

    await writeFile(path.join(stage, "module.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    // An existing empty destination is removed only after the complete package is staged.
    if (existing) await rmdir(output);
    await rename(stage, output);
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  return { moduleId: manifest.id, files: manifest.files.length, output, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [descriptorPath, inventoryPath, outputPath] = process.argv.slice(2);
  if (!descriptorPath || !inventoryPath || !outputPath) {
    console.error("Usage: npm run build:pitch-module -- <descriptor.json> <inventory.json> <empty-output-folder> [stadium-folder]");
    process.exit(2);
  }
  try {
    const result = await buildPitchModule({ descriptorPath, inventoryPath, outputPath, stadiumFolder: process.argv[5] });
    console.log(JSON.stringify({ moduleId: result.moduleId, files: result.files, output: result.output }, null, 2));
  } catch (error) {
    console.error("Pitch module build failed: " + error.message);
    process.exitCode = 1;
  }
}
