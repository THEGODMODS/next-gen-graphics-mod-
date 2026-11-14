#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "packs");
const dirs = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory());
const ids = new Set();
const failures = [];
let count = 0;

for (const dir of dirs) {
  const packageRoot = path.join(root, dir.name);
  const manifestPath = path.join(packageRoot, "module.json");
  try {
    const manifestStat = await lstat(manifestPath);
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) throw new Error("module.json must be a regular file");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest.schemaVersion !== 1 || !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(manifest.id)) throw new Error("invalid package identity");
    if (ids.has(manifest.id)) throw new Error("duplicate package ID");
    ids.add(manifest.id);
    if (manifest.game?.title !== "PES 2017" || manifest.game?.sider !== ">=3.5.0 <4.0.0") throw new Error("unexpected game/Sider target");
    if (manifest.deployment?.strategy !== "direct" || manifest.files?.length !== 1 || manifest.luaModules?.length !== 0) throw new Error("package must be a content-folder Lua module package");
    if (manifest.license?.id !== "THEGODMODS-ORIGINAL-1.0" || manifest.license?.redistributionAllowed !== true) throw new Error("first-party rights metadata missing");
    for (const item of manifest.files) {
      const relative = item.source.replaceAll("\\", "/");
      if (relative.startsWith("/") || relative.split("/").includes("..")) throw new Error("unsafe payload path");
      const payloadPath = path.resolve(packageRoot, relative);
      if (!payloadPath.startsWith(packageRoot + path.sep)) throw new Error("payload escapes package");
      const stat = await lstat(payloadPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("payload is not a regular file");
      const bytes = await readFile(payloadPath);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (digest !== item.sha256) throw new Error("payload hash mismatch: " + item.source);
      const lua = bytes.toString("utf8");
      if (!lua.includes("function M.init(ctx)") || !lua.includes("return M")) throw new Error("Lua module structure missing");
      if (!item.target.startsWith("content/GODMODS/") || !item.target.endsWith(".lua")) throw new Error("module must install into its own content/GODMODS department folder");
      if (manifest.category === "graphics" && (!lua.includes("gfx.brightness") || !lua.includes("gfx.sharpness"))) throw new Error("graphics module does not use documented gfx controls");
      if (manifest.category === "stadiums" && (!lua.includes('ctx.register("set_conditions"') || !lua.includes("changed.weather"))) throw new Error("stadium module does not use documented conditions event");
      if (manifest.category === "gameplay" && (!lua.includes("gameplay.ball_weight") || !lua.includes("gameplay.ball_bounce"))) throw new Error("gameplay module does not use documented gameplay controls");
      count += 1;
    }
  } catch (error) {
    failures.push(dir.name + ": " + (error instanceof Error ? error.message : String(error)));
  }
}
if (count !== 9) failures.push("Expected 9 original installable content-folder Lua modules, found " + count);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Verified " + count + " original THEGODMODS PES 2017 content-folder Lua module packages.");
}
