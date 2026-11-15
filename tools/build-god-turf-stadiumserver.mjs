#!/usr/bin/env node
/**
 * Assemble the original GOD TURF collection in a Stadium Server-compatible
 * additive folder layout. No existing Stadium Server files are read or changed.
 *
 * IMPORTANT: these are authored texture assets in the conventional pitch
 * subtree. They are not bound to guessed game resource filenames/materials.
 */
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "content", "originals", "generated", "GOD-TURF");
const target = path.join(source, "stadium-server-layout", "common", "bg", "model", "bg", "pitch", "GODMODS");
const variants = [
  "natural-cut", "stadium-emerald", "heritage-worn",
  "cool-climate", "sunlit-hybrid", "matchday-striped"
];
const maps = ["albedo", "normal-source", "roughness-source"];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");

await mkdir(target, { recursive: true });
const records = [];
for (const variant of variants) {
  const folder = path.join(target, variant);
  await mkdir(folder, { recursive: true });
  for (const map of maps) {
    const filename = variant + "-" + map + ".dds";
    const from = path.join(source, "textures", filename);
    const to = path.join(folder, filename);
    const bytes = await readFile(from);
    await copyFile(from, to);
    records.push({ variant, map, file: path.relative(path.join(source, "stadium-server-layout"), to).replaceAll(path.sep, "/"), bytes: bytes.length, sha256: digest(bytes), format: "DDS RGBA8 mipmapped", resolution: "512x512" });
  }
}
const manifest = {
  schemaVersion: 1,
  id: "thegodmods.god-turf-stadium-server-layout",
  title: "GOD TURF Premium — Stadium Server Additive Asset Layout",
  version: "0.3.0",
  ownership: "THEGODMODS original procedural artwork",
  targetLayout: "common/bg/model/bg/pitch/GODMODS/<variant>/",
  installationMode: "additive-sidecar-assets",
  modifiesExistingFiles: false,
  replacesExistingResources: false,
  variants: variants.map(id => ({ id, maps })),
  assets: records,
  compatibility: {
    stadiumServerLayout: "conventional PES 2017 Stadium Server pitch subtree",
    gameResourceBinding: "not assigned; exact filenames/material references differ by stadium and must not be guessed",
    status: "original assets generated and organized; target-game resource mapping and in-game validation pending"
  }
};
await writeFile(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(target, "README.md"), [
  "# GOD TURF Premium — Stadium Server additive layout",
  "",
  "This folder mirrors the conventional PES 2017 Stadium Server subtree:",
  "`common/bg/model/bg/pitch/`.",
  "",
  "The six GODMODS-authored surface variants are stored below `GODMODS/<variant>/` so they do not collide with existing pitch files. The package is an additive asset library; it does not overwrite or replace any existing stadium resource.",
  "",
  "Important: PES only renders resources requested by the stadium model/material. These variant filenames are not assumed to be referenced by every stadium. Do not rename them over an existing file or claim they are active in-game until a stadium's actual material/resource references have been identified and a controlled virtual-overlay test succeeds.",
  "",
  "Each variant contains albedo, normal-source and roughness-source DDS maps. The normal and roughness maps are source assets; verify the target material's channel convention before use.",
  "",
  "To use this as a starting point, copy the `GODMODS` sidecar folder into the selected stadium's existing `common/bg/model/bg/pitch/` folder. This only adds new files. Remove that one `GODMODS` folder to undo the addition. It will not change the rendered pitch until a compatible resource binding is authored.",
  "",
  "See `manifest.json` for file hashes and compatibility status."
].join("\n") + "\n");
console.log("Built additive GOD TURF Stadium Server layout:", target);
console.log("Variants:", variants.length, "| DDS assets:", records.length, "| Existing stadium files modified: 0");
