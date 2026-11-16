#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packsRoot = path.join(root, "content", "packs");
const coreId = "thegodmods.core-loader";
const hash = value => createHash("sha256").update(value).digest("hex");
const luaString = value => JSON.stringify(value);
const dirs = (await readdir(packsRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && entry.name !== "GODMODS-CORE-LOADER");
const features = [];

for (const dir of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
  const packageRoot = path.join(packsRoot, dir.name);
  const manifestPath = path.join(packageRoot, "module.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const luaEntry = manifest.files.find(file => file.source.toLowerCase().endsWith(".lua"));
  if (!luaEntry) throw new Error("Package has no first-party Lua source: " + manifest.id);
  const configEntry = manifest.files.find(file => file.target.startsWith("GODMODS/") && file.target.toLowerCase().endsWith(".ini"));
  if (!configEntry) throw new Error("Package has no activation/config INI: " + manifest.id);

  const sourcePath = path.resolve(packageRoot, luaEntry.source);
  const payloadRoot = path.resolve(packageRoot, "payload");
  if (!sourcePath.startsWith(payloadRoot + path.sep)) throw new Error("Lua source escapes package payload: " + manifest.id);
  const source = await readFile(sourcePath, "utf8");
  if (!source.includes("function M.init(ctx)") || !source.trimEnd().endsWith("return M")) {
    throw new Error("Unexpected Lua module structure: " + manifest.id);
  }

  const config = configEntry.target.replaceAll("/", "\\");
  const index = features.length;
  const factory = "local function create_" + index + "()\n" + source + "\nend";
  features.push({ id: manifest.id, name: manifest.name, config, factory });

  // Keep department Lua source alongside the product in the PES content tree.
  luaEntry.target = "content/GODMODS/" + manifest.category + "/" + dir.name + "/" + path.basename(luaEntry.source);
  manifest.dependencies = [...new Set([...(manifest.dependencies || []), coreId])];

  for (const item of manifest.files) {
    if (!item.target.endsWith("/README.md")) continue;
    const readmePath = path.resolve(packageRoot, item.source);
    const readme = await readFile(readmePath, "utf8");
    const paragraphs = readme.split(/\n\s*\n/).filter(paragraph =>
      !(paragraph.includes("Sider/modules") && paragraph.includes("sider.ini"))
    );
    const revised = paragraphs.join("\n\n") +
      "\n\nThe GODMODS master loader is installed and registered automatically as a dependency. This product is activated by its installed configuration file; no separate Lua module entry is required.\n";
    await writeFile(readmePath, revised, "utf8");
    item.sha256 = hash(Buffer.from(revised.replace(/\r\n/g, "\n"), "utf8"));
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

const featureTable = features.map((feature, index) =>
  "  { id = " + luaString(feature.id) +
  ", name = " + luaString(feature.name) +
  ", config = " + luaString(feature.config) +
  ", create = create_" + index + " }"
).join(",\n");
const factories = features.map(feature => feature.factory).join("\n\n");
const loader = [
  "-- THEGODMODS unified PES 2017 / Sider 3.5 master loader.",
  "-- All department feature logic is embedded below; this is the only Sider lua.module entry required.",
  "local M = {}",
  factories,
  "local features = {",
  featureTable,
  "}",
  "local function config_exists(relative_path)",
  "  local file = io.open(relative_path, \"r\")",
  "  if not file then return false end",
  "  file:close()",
  "  return true",
  "end",
  "function M.init(ctx)",
  "  local loaded = 0",
  "  for _, feature in ipairs(features) do",
  "    if config_exists(feature.config) then",
      "      local module = feature.create()",
      "      if type(module) == \"table\" and type(module.init) == \"function\" then",
      "        module.init(ctx)",
      "        loaded = loaded + 1",
      "        log(\"THEGODMODS: enabled \" .. feature.name)",
      "      else",
      "        log(\"THEGODMODS: invalid feature \" .. feature.id)",
      "      end",
  "    end",
  "  end",
  "  log(\"THEGODMODS master loader initialized; active features: \" .. tostring(loaded) .. \" / \" .. tostring(#features))",
  "end",
  "return M",
  ""
].join("\n");

const coreRoot = path.join(packsRoot, "GODMODS-CORE-LOADER");
await rm(coreRoot, { recursive: true, force: true });
await mkdir(path.join(coreRoot, "payload"), { recursive: true });
const loaderPath = path.join(coreRoot, "payload", "GODMODS_Loader.lua");
await writeFile(loaderPath, loader, "utf8");
const loaderBytes = Buffer.from(loader.replace(/\r\n/g, "\n"), "utf8");
const coreManifest = {
  schemaVersion: 1, id: coreId, name: "GODMODS Master Loader", version: "0.2.0",
  description: "One Sider 3.5 Lua entry point that coordinates every installed GODMODS department feature.",
  category: "other", deployment: { strategy: "lua", manualSteps: [] },
  game: { title: "PES 2017", executable: ["PES2017.exe", "PES2017patched.exe"], sider: ">=3.5.0 <4.0.0" },
  dependencies: [], conflicts: [], files: [],
  luaModules: [{ source: "payload/GODMODS_Loader.lua", moduleName: "GODMODS_Loader.lua", sha256: hash(loaderBytes) }],
  license: { id: "THEGODMODS-ORIGINAL-1.0", redistributionAllowed: true }
};
await writeFile(path.join(coreRoot, "module.json"), JSON.stringify(coreManifest, null, 2) + "\n", "utf8");
await writeFile(path.join(coreRoot, "README.md"),
  "# GODMODS Master Loader\n\nInstall this dependency once. It registers the single GODMODS_Loader.lua entry in Sider and activates only features whose GODMODS configuration files are installed. Individual department packages depend on this loader.\n",
  "utf8");
await writeFile(path.join(packsRoot, "README.md"), [
  "# THEGODMODS — Built-in original module library",
  "",
  "This folder contains first-party department packages plus one shared GODMODS Master Loader.",
  "Install any department package from GODMODS Manager; the manager installs the master-loader dependency automatically.",
  "Only one Sider entry is required: lua.module = GODMODS_Loader.lua.",
  "Features activate when their package configuration is installed. Uninstalling a department package removes its configuration and deactivates that feature.",
  "",
  "Texture source collections remain non-installable until exact PES patch resource mappings and material/UV validation exist.",
  ...features.map(feature => "- " + feature.name + " (" + feature.id + ")"),
  ""
].join("\n"), "utf8");
console.log(JSON.stringify({ masterLoader: "GODMODS_Loader.lua", features: features.length, package: coreId }, null, 2));
