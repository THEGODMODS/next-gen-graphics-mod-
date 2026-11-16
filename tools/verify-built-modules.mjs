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
    if (manifest.id === "thegodmods.core-loader") {
      if (manifest.deployment?.strategy !== "lua" || manifest.files?.length !== 0 || manifest.luaModules?.length !== 1 || manifest.luaModules[0].moduleName !== "GODMODS_Loader.lua") throw new Error("master loader must be the single Sider Lua deployment package");
      const entry = manifest.luaModules[0];
      const relative = entry.source.replaceAll("\\\\", "/");
      if (relative.startsWith("/") || relative.split("/").includes("..")) throw new Error("unsafe master loader payload path");
      const loaderPath = path.resolve(packageRoot, relative);
      if (!loaderPath.startsWith(packageRoot + path.sep)) throw new Error("master loader escapes package");
      const stat = await lstat(loaderPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("master loader payload is not a regular file");
      const bytes = await readFile(loaderPath);
      if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("master loader SHA-256 mismatch");
      const source = bytes.toString("utf8");
      if (!source.includes("function M.init(ctx)") || !source.includes("GODMODS master loader initialized") || !source.includes("config_exists(ctx, feature.config)")) throw new Error("master loader orchestration contract missing");
      luaCount += 1;
      packageCount += 1;
      continue;
    }
    if (manifest.deployment?.strategy !== "direct" || ![2, 3, 6, 7].includes(manifest.files?.length) || manifest.luaModules?.length !== 0 || !manifest.dependencies?.includes("thegodmods.core-loader")) throw new Error("department package must depend on the single master loader and contain its source, README and optional configuration/assets");
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
        if (manifest.category === "gameplay" && (!lua.includes('config_path = ctx.sider_dir ..') || !lua.includes("io.open(config_path") || !lua.includes('ctx.register("set_home_team"') || !lua.includes('ctx.register("set_match_time"'))) throw new Error("gameplay module must read its game-root INI and register match setup hooks");
        if (manifest.category === "graphics" && (!lua.includes("gfx.brightness") || !lua.includes("gfx.sharpness") || !lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path"))) throw new Error("graphics module must use documented gfx controls and read its game-root INI");
        if (manifest.category === "stadiums" && (!lua.includes('ctx.register("set_conditions"') || !lua.includes("changed.weather") || !lua.includes("ctx.sider_dir") || !lua.includes("io.open(config_path"))) throw new Error("stadium module must use documented conditions event and read its game-root INI");
        if (manifest.category === "gameplay" && (!lua.includes("gameplay[key] = settings[key]") || !lua.includes("ball_weight") || !lua.includes("ball_bounce"))) throw new Error("gameplay module does not apply the documented gameplay library controls");
        if (manifest.category === "audio" && (!lua.includes('ctx.register("set_home_team"') || !lua.includes('ctx.register("set_away_team"') || !lua.includes("audio.new") || !lua.includes("set_volume") || !lua.includes("when_done") || !lua.includes("start_loop") || !lua.includes("stadium-open-air") || !lua.includes("stadium-intimate") || !lua.includes("stadium-night") || !lua.includes("stadium-cup-final") || !lua.includes('config_path = "GODMODS\\\\Audio\\\\') || !lua.includes('asset_root = "content\\\\GODMODS\\\\Audio\\\\') || !lua.includes("GOD-ATMOSPHERE-MATCHDAY") || !lua.includes("io.open(config_path"))) throw new Error("audio module must run layered continuous ambience, handle both team-selection events and use documented Sider audio APIs with game-root-relative paths");
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
        for (const key of ["enabled", "ambience", "volume", "texture_volume"]) if (!new RegExp("^" + key + "\\s*=\\s*[-+]?\\d+(?:\\.\\d+)?$", "m").test(ini)) throw new Error("audio INI missing valid " + key);
        for (const key of ["enabled", "ambience"]) {
          const value = Number(ini.match(new RegExp("^" + key + "\\s*=\\s*([-+]?\\d+(?:\\.\\d+)?)$", "m"))?.[1]);
          if (![0, 1].includes(value)) throw new Error("audio INI " + key + " must be 0 or 1");
        }
        for (const key of ["volume", "texture_volume"]) {
          const value = Number(ini.match(new RegExp("^" + key + "\\s*=\\s*([-+]?\\d+(?:\\.\\d+)?)$", "m"))?.[1]);
          if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("audio INI " + key + " must be within 0.0-1.0");
        }
        audioIniCount += 1;
      } else if (item.target.startsWith("content/GODMODS/Audio/") && item.target.endsWith(".wav")) {
        if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("audio asset is not a valid RIFF/WAVE file");
        if (bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error("WAV RIFF size does not match file length");
        if (bytes.toString("ascii", 12, 16) !== "fmt " || bytes.readUInt32LE(16) < 16) throw new Error("WAV fmt chunk is missing or too short");
        const format = bytes.readUInt16LE(20);
        const channels = bytes.readUInt16LE(22);
        const sampleRate = bytes.readUInt32LE(24);
        const byteRate = bytes.readUInt32LE(28);
        const blockAlign = bytes.readUInt16LE(32);
        const bitsPerSample = bytes.readUInt16LE(34);
        if (format !== 1 || ![1, 2].includes(channels) || ![22050, 24000, 32000, 44100, 48000].includes(sampleRate) || bitsPerSample !== 16) throw new Error("WAV must be PCM 16-bit mono/stereo at a supported sample rate");
        if (blockAlign !== channels * bitsPerSample / 8 || byteRate !== sampleRate * blockAlign) throw new Error("WAV block alignment or byte rate is inconsistent");
        // RIFF chunks begin at byte 12. The fmt chunk header is 8 bytes;
        // data follows the complete fmt payload (not after its first 8 bytes).
        let chunkOffset = 12;
        let dataBytes = null;
        while (chunkOffset + 8 <= bytes.length) {
          const chunkId = bytes.toString("ascii", chunkOffset, chunkOffset + 4);
          const chunkSize = bytes.readUInt32LE(chunkOffset + 4);
          const payloadOffset = chunkOffset + 8;
          if (payloadOffset + chunkSize > bytes.length) throw new Error("WAV chunk exceeds file length: " + chunkId);
          if (chunkId === "data") {
            dataBytes = chunkSize;
            if (payloadOffset + chunkSize !== bytes.length) throw new Error("WAV data chunk must be the final chunk");
            break;
          }
          chunkOffset = payloadOffset + chunkSize + (chunkSize % 2);
        }
        if (dataBytes === null) throw new Error("WAV data chunk is missing");
        if (dataBytes % blockAlign !== 0) throw new Error("WAV data chunk size is inconsistent");
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
if (packageCount !== 19) failures.push("Expected 18 department packages plus one master-loader package, found " + packageCount);
if (luaCount !== 19) failures.push("Expected 18 department Lua sources plus one master Sider loader, found " + luaCount);
if (gameplayIniCount !== 3) failures.push("Expected 3 editable game-root gameplay INI files, found " + gameplayIniCount);
if (graphicsIniCount !== 7) failures.push("Expected 7 editable game-root graphics INI files, found " + graphicsIniCount);
if (stadiumIniCount !== 7) failures.push("Expected 7 editable game-root stadium INI files, found " + stadiumIniCount);
if (audioIniCount !== 1) failures.push("Expected 1 editable game-root audio INI file, found " + audioIniCount);
if (audioAssetCount !== 4) failures.push("Expected 4 original installable WAV audio assets, found " + audioAssetCount);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Verified " + (packageCount - 1) + " original THEGODMODS department packages plus one master loader, " + luaCount + " Lua sources/runtime modules and " + (packageCount - 1) + " READMEs and " + graphicsIniCount + " graphics INIs, " + gameplayIniCount + " gameplay INIs and " + stadiumIniCount + " stadium INIs, " + audioIniCount + " audio INI and " + audioAssetCount + " WAV assets.");
}
