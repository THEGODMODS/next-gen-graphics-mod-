#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = path.join(root, "release");
const unpacked = path.join(release, "win-unpacked");
const stage = path.join(release, "portable");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const godmods = path.join(stage, "GODMODS");
const tool = path.join(godmods, "GODMODS Tool");

await rm(godmods, { recursive: true, force: true });
await mkdir(tool, { recursive: true });
await cp(unpacked, tool, { recursive: true });
await cp(path.join(root, "content"), path.join(godmods, "content"), { recursive: true });

// Only the unified master loader is installed into Sider; department Lua sources remain in content/GODMODS.
const modules = path.join(godmods, "modules");
await mkdir(modules, { recursive: true });
const packsRoot = path.join(root, "content", "packs");
let loaderCount = 0;
for (const pack of await readdir(packsRoot, { withFileTypes: true })) {
  if (!pack.isDirectory() || pack.isSymbolicLink()) continue;
  const packRoot = path.join(packsRoot, pack.name);
  const manifest = JSON.parse(await readFile(path.join(packRoot, "module.json"), "utf8"));
  for (const entry of manifest.luaModules ?? []) {
    if (entry.moduleName !== "GODMODS_Loader.lua") throw new Error("Unexpected non-master Lua module in portable package.");
    const source = path.resolve(packRoot, entry.source);
    const payloadRoot = path.resolve(packRoot, "payload");
    if (!source.startsWith(payloadRoot + path.sep)) throw new Error("Master loader path escapes its package payload.");
    await cp(source, path.join(modules, entry.moduleName));
    loaderCount += 1;
  }
}
if (loaderCount !== 1) throw new Error("Portable package must contain exactly one GODMODS master Lua loader.");

const readme = [
  "GODMODS MANAGER — PORTABLE PACKAGE",
  "",
  "1. Extract this archive.",
  "2. Copy the complete GODMODS folder into your PES 2017 content folder.",
  "   Example: C:\\Games\\PES 2017\\content\\GODMODS",
  "3. Open GODMODS\\GODMODS Tool\\GODMODS Manager.exe.",
  "4. In the manager, select your PES 2017 game directory and scan the bundled module library.",
  "",
  "The original game, patch, CPK files and Stadium Server files are not overwritten.",
  "Settings, transaction journals and backups remain in your Windows user profile.",
  "",
  "MANUAL SIDER MODULE INSTALLATION",
  "The modules folder contains the single GODMODS_Loader.lua entry point.",
  "The manager installs and registers this one module automatically when you install your first GODMODS product.",
  "For manual recovery, copy modules\\\\GODMODS_Loader.lua into Sider\\\\modules and add lua.module = GODMODS_Loader.lua under Extension modules in sider.ini.",
  "",
  "A successful archive build does not prove every asset is mapped or verified in PES 2017."
].join("\r\n") + "\r\n";
await writeFile(path.join(godmods, "README.txt"), readme, "utf8");

const archive = path.join(stage, "GODMODS-Manager-" + pkg.version + "-Portable.zip");
const result = spawnSync("tar", ["-a", "-c", "-f", archive, "-C", stage, "GODMODS"], { stdio: "inherit" });
if (result.status !== 0) throw new Error("Could not create the portable ZIP archive.");
console.log("Created " + archive);
