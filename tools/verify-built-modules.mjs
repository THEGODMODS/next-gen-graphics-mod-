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
let stadiumIniCount = 0;
let audioIniCount = 0;
let audioAssetCount = 0;

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
    if (manifest.deployment?.strategy !== "direct" || ![2, 3, 6].includes(manifest.files?.length) || manifest.luaModules?.length !== 0) throw new Error("package must contain a Lua module, README, and optional game-root INI");
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
      if (!item.target.startsWith("content/GODMODS/") && !item.target.startsWith("GODMODS/Gameplay/") && !item.target.startsWith("GODMODS/Graphics/") && !item.target.startsWith("GODMODS/Stadiums/") && !item.target.startsWith("GODMODS/Audio/")) throw new Error("package files must install under the existing PES 2017 content folder or GODMODS game-root config folder");
      if (item.target.endsWith(".lua")) {
        const lua = bytes.toString("utf8");
        if (!lua.includes("function M.init(ctx)") || !lua.includes("return M")) throw new Error("Lua module structure missing");
        if (manifest.category === "gameplay" && (!lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path") || (!lua.includes("set_home_team") || !lua.includes("set_match_time")))) throw new Error("gameplay module must read its game-root INI on match setup");
        if (manifest.category === "graphics" && (!lua.includes("gfx.brightness") || !lua.includes("gfx.sharpness") || !lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path"))) throw new Error("graphics module must use documented gfx controls and read its game-root INI");
        if (manifest.category === "stadiums" && (!lua.includes('ctx.register("set_conditions"') || !lua.includes("changed.weather") || !lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path"))) throw new Error("stadium module must use documented conditions event and read its game-root INI");
        if (manifest.category === "gameplay" && (!lua.includes("gameplay[key] = settings[key]") || !lua.includes("ball_weight") || !lua.includes("ball_bounce"))) throw new Error("gameplay module does not apply the documented gameplay library controls");
        if (manifest.category === "audio" && (!lua.includes('ctx.register("set_home_team"') || !lua.includes("audio.new") || !lua.includes("set_volume") || !lua.includes("when_done"))) throw new Error("audio module must use documented Sider audio playback APIs");
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
      } else if (item.target.startsWith("GODMODS/Stadiums/") && item.target.endsWith("/stadium.ini")) {
        const ini = bytes.toString("utf8");
        for (const key of ["timeofday", "weather", "season"]) if (!new RegExp("^" + key + "\\s*=\\s*[01]$", "m").test(ini)) throw new Error("stadium INI missing valid " + key);
        stadiumIniCount += 1;
      } else if (item.target.startsWith("GODMODS/Audio/") && item.target.endsWith("/audio.ini")) {
        const ini = bytes.toString("utf8");
        for (const key of ["enabled", "volume", "sound"]) if (!new RegExp("^" + key + "\\s*=\\s*[-+]?\\d+(?:\\.\\d+)?$", "m").test(ini)) throw new Error("audio INI missing valid " + key);
        audioIniCount += 1;
      } else if (item.target.startsWith("content/GODMODS/Audio/") && item.target.endsWith(".wav")) {
        if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("audio asset is not a valid RIFF/WAVE file");
        audioAssetCount += 1;
      } else {
        throw new Error("unexpected package payload target: " + item.target);
      }
    }
    packageCount += 1;
  } catch (error) {
    failures.push(dir.name + ": " + (error instanceof Error ? error.message : String(error)));
  }
}
if (packageCount !== 14) failures.push("Expected 14 original content-folder packages, found " + packageCount);
if (luaCount !== 14) failures.push("Expected 14 original installable Lua modules, found " + luaCount);
if (gameplayIniCount !== 3) failures.push("Expected 3 editable game-root gameplay INI files, found " + gameplayIniCount);
if (graphicsIniCount !== 7) failures.push("Expected 7 editable game-root graphics INI files, found " + graphicsIniCount);
if (stadiumIniCount !== 3) failures.push("Expected 3 editable game-root stadium INI files, found " + stadiumIniCount);
if (audioIniCount !== 1) failures.push("Expected 1 editable game-root audio INI file, found " + audioIniCount);
if (audioAssetCount !== 3) failures.push("Expected 3 original installable WAV audio assets, found " + audioAssetCount);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Verified " + packageCount + " original THEGODMODS PES 2017 packages, 14 Lua modules, 14 READMEs and " + graphicsIniCount + " graphics INIs, " + gameplayIniCount + " gameplay INIs and " + stadiumIniCount + " stadium INIs, " + audioIniCount + " audio INI and " + audioAssetCount + " WAV assets.");
}
