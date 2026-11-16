#!/usr/bin/env node
/**
 * Inventory the real Stadium Server model resources without changing them.
 * Paths are preserved relative to the selected stadium folder for evidence-
 * based LiveCPK mapping; symlinks are reported but never followed.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectDds } from "./dds-audit.mjs";

const SUBTREE = ["common", "bg", "model", "bg"];
async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function inspectHeader(file, bytes) {
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(148);
    const { bytesRead } = await handle.read(header, 0, 148, 0);
    return inspectDds(header.subarray(0, bytesRead), bytes);
  } finally { await handle.close(); }
}

export async function inventoryStadiumResources(input) {
  const root = path.resolve(input);
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("Stadium path must be a real directory, not a symlink.");
  let modelRoot = root;
  for (const segment of SUBTREE) {
    modelRoot = path.join(modelRoot, segment);
    let stat;
    try { stat = await lstat(modelRoot); }
    catch (error) {
      if (error?.code === "ENOENT") throw new Error("Stadium model subtree not found: " + SUBTREE.join("/"));
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Stadium model subtree contains a non-directory or symbolic link: " + segment);
  }

  const records = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      const relative = path.relative(root, full).split(path.sep).join("/");
      if (entry.isSymbolicLink()) {
        records.push({ path: relative, kind: "symlink", warning: "Not followed" });
        continue;
      }
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.isFile()) continue;
      const stat = await lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        records.push({ path: relative, kind: "non-regular", warning: "Skipped after file type changed during scan" });
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      const record = {
        path: relative,
        kind: extension === ".dds" ? "dds" : "file",
        extension: extension || "(none)",
        bytes: stat.size,
        sha256: await hashFile(full)
      };
      if (extension === ".dds") record.dds = await inspectHeader(full, stat.size);
      records.push(record);
    }
  }
  await walk(modelRoot);
  records.sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    stadiumFolder: path.basename(root),
    subtree: SUBTREE.join("/"),
    fileCount: records.filter(record => record.sha256).length,
    ddsCount: records.filter(record => record.kind === "dds").length,
    records
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const stadiumFolder = process.argv[2];
  if (!stadiumFolder) {
    console.error("Usage: npm run inventory:stadium-resources -- <stadium-folder>");
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(await inventoryStadiumResources(stadiumFolder), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stadium resource inventory failed.");
    process.exitCode = 1;
  }
}
