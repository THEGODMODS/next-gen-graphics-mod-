#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "packs");
const dirs = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory());
const ids = new Set();
const failures = [];
let packageCount = 0;
let luaCount = 0;
let gameplayIniCount = 0;
let graphicsIniCount = 0;

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
    if (manifest.deployment?.strategy !== "direct" || ![2, 3].includes(manifest.files?.length) || manifest.luaModules?.length !== 0) throw new Error("package must contain a Lua module, README, and optional game-root INI");
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
      if (!item.target.startsWith("content/GODMODS/") && !item.target.startsWith("GODMODS/Gameplay/") && !item.target.startsWith("GODMODS/Graphics/")) throw new Error("package files must install under the existing PES 2017 content folder or GODMODS game-root config folder");
      if (item.target.endsWith(".lua")) {
        const lua = bytes.toString("utf8");
        if (!lua.includes("function M.init(ctx)") || !lua.includes("return M")) throw new Error("Lua module structure missing");
        if (manifest.category === "gameplay" && (!lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path") || (!lua.includes("set_home_team") || !lua.includes("set_match_time")))) throw new Error("gameplay module must read its game-root INI on match setup");
        if (manifest.category === "graphics" && (!lua.includes("gfx.brightness") || !lua.includes("gfx.sharpness") || !lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path"))) throw new Error("graphics module must use documented gfx controls and read its game-root INI");
        if (manifest.category === "stadiums" && (!lua.includes('ctx.register("set_conditions"') || !lua.includes("changed.weather"))) throw new Error("stadium module does not use documented conditions event");
        if (manifest.category === "gameplay" && (!lua.includes("gameplay.ball_weight") || !lua.includes("gameplay.ball_bounce"))) throw new Error("gameplay module does not use documented gameplay controls");
        luaCount += 1;
      } else if (item.target.endsWith("/README.md")) {
        const readme = bytes.toString("utf8");
        if (!readme.startsWith("# ") || readme.length < 80) throw new Error("installed README is missing or incomplete");
      } else if (item.target.startsWith("GODMODS/Gameplay/") && item.target.endsWith("/gameplay.ini")) {
        const ini = bytes.toString("utf8");
        const requiredKeys = ["match_minutes", "ball_weight", "ball_physics", "ball_bounce", "ball_friction", "ball_magnus", "shooting_power", "speed", "speed_global"];
        for (const key of requiredKeys) if (!new RegExp("^" + key + "\\s*=\\s*[-+]?\\d+(?:\\.\\d+)?$", "m").test(ini)) throw new Error("gameplay INI missing valid " + key);
        gameplayIniCount += 1;
      } else if (item.target.startsWith("GODMODS/Graphics/") && item.target.endsWith("/graphics.ini")) {
        const ini = bytes.toString("utf8");
        const requiredKeys = ["brightness", "sharpness", "shadow_softness", "reflection"];
        for (const key of requiredKeys) if (!new RegExp("^" + key + "\\s*=\\s*[-+]?\\d+(?:\\.\\d+)?$", "m").test(ini)) throw new Error("graphics INI missing valid " + key);
        graphicsIniCount += 1;
      } else {
        throw new Error("unexpected package payload target: " + item.target);
      }
    }
    packageCount += 1;
  } catch (error) {
    failures.push(dir.name + ": " + (error instanceof Error ? error.message : String(error)));
  }
}
if (packageCount !== 13) failures.push("Expected 13 original content-folder packages, found " + packageCount);
if (luaCount !== 13) failures.push("Expected 13 original installable Lua modules, found " + luaCount);
if (gameplayIniCount !== 3) failures.push("Expected 3 editable game-root gameplay INI files, found " + gameplayIniCount);
if (graphicsIniCount !== 7) failures.push("Expected 7 editable game-root graphics INI files, found " + graphicsIniCount);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Verified " + packageCount + " original THEGODMODS PES 2017 packages, 13 Lua modules, 13 READMEs and " + graphicsIniCount + " graphics INIs and " + gameplayIniCount + " gameplay INIs.");
}
