#!/usr/bin/env node
/**
 * Build first-party, PES 2017 / Sider 3.5 Lua module packages.
 *
 * These are genuine, installable Sider modules (graphics controls, match
 * conditions, and opt-in gameplay tuning). Texture source collections remain
 * separate until their exact patch resource mappings are known.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAtmosphereModule } from "./godmods-atmosphere-engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "content", "packs"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const text = (value) => Buffer.from(value.replace(/\r\n/g, "\n"), "utf8");

function luaNumber(value) {
  if (!Number.isFinite(value)) throw new Error("Non-finite Lua setting");
  return String(value);
}

function visualModule(name, settings, configFolder) {
  const keys = ["brightness", "sharpness", "shadow_softness", "reflection"];
  const defaults = keys.map(key => "  " + key + " = " + luaNumber(settings[key])).join(",\n");
  return [
    "-- THEGODMODS original PES 2017 graphics profile: " + name,
    "-- Sider 3.5 gfx library; reads editable game-root graphics.ini at match setup.",
    "local M = {}",
    "local defaults = {",
    defaults,
    "}",
    "local limits = { brightness = {0.5, 1.5}, sharpness = {0, 1}, shadow_softness = {0, 1}, reflection = {-2, 3} }",
    "local config_path = nil",
    "local function read_settings()",
    "  local settings = {}",
    "  for key, value in pairs(defaults) do settings[key] = value end",
    "  local file, open_error = io.open(config_path, \"r\")",
    "  if not file then log(\"THEGODMODS " + name + ": graphics INI unavailable; using profile defaults: \" .. tostring(open_error)); return settings end",
    "  for line in file:lines() do",
    "    local key, raw = string.match(line, \"^%s*([%w_]+)%s*=%s*([%+%-]?[%d%.]+)%s*$\")",
    "    if key and defaults[key] ~= nil then",
    "      local value = tonumber(raw)",
    "      local range = limits[key]",
    "      if value and value == value and value ~= math.huge and value ~= -math.huge and value >= range[1] and value <= range[2] then settings[key] = value",
    "      else log(\"THEGODMODS " + name + ": ignored invalid graphics INI value for \" .. key) end",
    "    end",
    "  end",
    "  file:close()",
    "  return settings",
    "end",
    "local function apply(ctx, team_id)",
    "  local settings = read_settings()",
    "  gfx.brightness = settings.brightness",
    "  gfx.sharpness = settings.sharpness",
    "  gfx.shadow_softness = settings.shadow_softness",
    "  gfx.reflection = settings.reflection",
    "  log(\"THEGODMODS " + name + ": graphics profile applied from game-root INI\")",
    "end",
    "function M.init(ctx)",
    "  config_path = \"content\\\\GODMODS\\\\Graphics\\\\\" .. configFolder .. \"\\\\graphics.ini\"",
    "  ctx.register(\"set_home_team\", apply)",
    "  ctx.register(\"set_away_team\", apply)",
    "  log(\"THEGODMODS " + name + ": loaded; config: \" .. config_path)",
    "end",
    "return M",
    ""
  ].join("\n");
}

function conditionsModule(name, values, configFolder) {
  return [
    "-- THEGODMODS original PES 2017 matchday conditions profile: " + name,
    "-- Sider 3.5 set_conditions API; reads an editable game-root stadium.ini.",
    "local M = {}",
    "local defaults = { timeofday = " + values.timeofday + ", weather = " + values.weather + ", season = " + values.season + " }",
    "local config_path = nil",
    "local function read_settings()",
    "  local settings = {}",
    "  for key, value in pairs(defaults) do settings[key] = value end",
    "  local file, open_error = io.open(config_path, \"r\")",
    "  if not file then log(\"THEGODMODS " + name + ": stadium INI unavailable; using defaults: \" .. tostring(open_error)); return settings end",
    "  for line in file:lines() do",
    "    local key, raw = string.match(line, \"^%s*([%w_]+)%s*=%s*([%+%-]?[%d%.]+)%s*$\")",
    "    if key and defaults[key] ~= nil then",
    "      local value = tonumber(raw)",
    "      if value and value == math.floor(value) and (value == 0 or value == 1) then settings[key] = value",
    "      else log(\"THEGODMODS " + name + ": ignored invalid stadium INI value for \" .. key) end",
    "    end",
    "  end",
    "  file:close()",
    "  return settings",
    "end",
    "local function apply(ctx, options)",
    "  if type(options) ~= \"table\" then return nil end",
    "  local settings = read_settings()",
    "  local changed = {}",
    "  for k, v in pairs(options) do changed[k] = v end",
    "  changed.timeofday = settings.timeofday",
    "  changed.weather = settings.weather",
    "  changed.season = settings.season",
    "  if settings.weather == 1 then changed.weather_effects = 2 end",
    "  return changed",
    "end",
    "function M.init(ctx)",
    "  config_path = \"content\\\\GODMODS\\\\Stadiums\\\\\" .. configFolder .. \"\\\\stadium.ini\"",
    "  ctx.register(\"set_conditions\", apply)",
    "  ctx.register(\"set_conditions_for_replay\", apply)",
    "  log(\"THEGODMODS " + name + ": matchday conditions loaded; config: \" .. config_path)",
    "end",
    "return M",
    ""
  ].join("\n");
}

function gameplayModule(name, values, configFolder) {
  const keys = ["ball_weight", "ball_physics", "ball_bounce", "ball_friction", "ball_magnus", "shooting_power", "speed", "speed_global"];
  const defaults = keys.map((key, index) => "  " + key + " = " + luaNumber(values[index])).join(",\n");
  return [
    "-- THEGODMODS original PES 2017 gameplay profile: " + name,
    "-- Sider 3.5 gameplay library; reads an editable game-root INI on match setup.",
    "-- Sider 3.5 explicitly labels these gameplay controls experimental.",
    "local M = {}",
    "local defaults = {",
    defaults,
    "}",
    "local limits = {",
    "  ball_weight = {100, 5000}, ball_physics = {-5, 5}, ball_bounce = {0, 3},",
    "  ball_friction = {-5, 5}, ball_magnus = {-2, 2}, shooting_power = {0.1, 2},",
    "  speed = {0.05, 1}, speed_global = {0.5, 20}",
    "}",
    "local config_path = nil",
    "local function read_settings()",
    "  local settings = { match_minutes = 0 }",
    "  for key, value in pairs(defaults) do settings[key] = value end",
    "  local file, open_error = io.open(config_path, \"r\")",
    "  if not file then log(\"THEGODMODS " + name + ": INI unavailable; using profile defaults: \" .. tostring(open_error)); return settings end",
    "  for line in file:lines() do",
    "    local key, raw = string.match(line, \"^%s*([%w_]+)%s*=%s*([%+%-]?[%d%.]+)%s*$\")",
    "    if key == \"match_minutes\" then",
    "      local value = tonumber(raw)",
    "      if value and value == math.floor(value) and (value == 0 or (value >= 5 and value <= 90)) then settings.match_minutes = value",
    "      else log(\"THEGODMODS " + name + ": ignored invalid match_minutes value\") end",
    "    elseif key and defaults[key] ~= nil then",
    "      local value = tonumber(raw)",
    "      local range = limits[key]",
    "      if value and value == value and value ~= math.huge and value ~= -math.huge and value >= range[1] and value <= range[2] then",
    "        settings[key] = value",
    "      else",
    "        log(\"THEGODMODS " + name + ": ignored invalid or out-of-range INI value for \" .. key)",
    "      end",
    "    end",
    "  end",
    "  file:close()",
    "  return settings",
    "end",
    "local function apply(ctx, team_id)",
    "  local settings = read_settings()",
    "  for key, value in pairs(defaults) do gameplay[key] = settings[key] end",
    "  log(\"THEGODMODS " + name + ": profile applied from game-root INI\")",
    "end",
    "local function set_match_time(ctx, minutes)",
    "  local settings = read_settings()",
    "  if settings.match_minutes >= 5 then return settings.match_minutes end",
    "  return nil",
    "end",
    "function M.init(ctx)",
    "  config_path = \"content\\\\GODMODS\\\\Gameplay\\\\\" .. configFolder .. \"\\\\gameplay.ini\"",
    "  ctx.register(\"set_home_team\", apply)",
    "  ctx.register(\"set_match_time\", set_match_time)",
    "  log(\"THEGODMODS " + name + ": loaded; config: \" .. config_path)",
    "end",
    "return M",
    ""
  ].join("\n");
}

async function writePackage(definition) {
  const root = path.join(OUT, definition.folder);
  await rm(root, { recursive: true, force: true });
  await mkdir(path.join(root, "payload"), { recursive: true });
  const payloadPath = "payload/" + definition.moduleName;
  const readmePath = "payload/README.md";
  const payload = text(definition.module);
  const readme = text(definition.readme + "\n");
  await writeFile(path.join(root, payloadPath), payload);
  await writeFile(path.join(root, readmePath), readme);
  const installRoot = "content/GODMODS/" + (definition.department || definition.category) + "/" + definition.folder + "/";
  const files = [
    { source: payloadPath, target: installRoot + definition.moduleName, sha256: sha256(payload) },
    { source: readmePath, target: installRoot + "README.md", sha256: sha256(readme) }
  ];
  // Per-product marker is independent of installation: OFF keeps all assets in place.
  const activationSource = "payload/enabled.ini";
  const activationBytes = text("# GODMODS per-product activation state\nenabled = 1\n");
  await writeFile(path.join(root, activationSource), activationBytes);
  files.push({ source: activationSource, target: installRoot + "enabled.ini", sha256: sha256(activationBytes) });
  for (const asset of definition.assets || []) {
    const assetBytes = await readFile(path.resolve(ROOT, asset.source));
    const assetSource = "payload/" + asset.filename;
    await writeFile(path.join(root, assetSource), assetBytes);
    files.push({ source: assetSource, target: installRoot + asset.filename, sha256: sha256(assetBytes) });
  }
  if (definition.configIni) {
    const configFilename = definition.configFilename || "gameplay.ini";
    const configSource = "payload/" + configFilename;
    const configBytes = text(definition.configIni);
    await writeFile(path.join(root, configSource), configBytes);
    files.push({ source: configSource, target: "content/GODMODS/" + (definition.configDepartment || "Gameplay") + "/" + definition.folder + "/" + configFilename, sha256: sha256(configBytes) });
  }
  const manifest = {
    schemaVersion: 1,
    id: definition.id,
    name: definition.name,
    version: "0.1.0",
    description: definition.description,
    category: definition.category,
    deployment: { strategy: "direct", manualSteps: [] },
    game: { title: "PES 2017", executable: ["PES2017.exe", "PES2017patched.exe"], sider: ">=3.5.0 <4.0.0" },
    dependencies: ["thegodmods.core-loader"],
    conflicts: definition.conflicts,
    files,
    luaModules: [],
    license: { id: "THEGODMODS-ORIGINAL-1.0", redistributionAllowed: true }
  };
  await writeFile(path.join(root, "module.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(root, "README.md"), definition.readme + "\n");
  return { id: manifest.id, name: manifest.name, moduleName: definition.moduleName, sha256: sha256(payload) };
}

const visualConflict = ["thegodmods.god-visuals-natural", "thegodmods.god-visuals-cinematic", "thegodmods.god-visuals-broadcast", "thegodmods.eafc27-inspired", "thegodmods.ef27-inspired", "thegodmods.ufl-inspired", "thegodmods.iss-pure"];
const conditionConflict = ["thegodmods.god-stadiums-summer-day", "thegodmods.god-stadiums-night", "thegodmods.god-stadiums-rainy-evening", "thegodmods.god-weather-fine-day", "thegodmods.god-weather-rain-day", "thegodmods.god-weather-rain-night", "thegodmods.god-matchday-winter-night"];
const gameplayConflict = ["thegodmods.god-gameplay-balanced", "thegodmods.god-gameplay-grounded", "thegodmods.god-gameplay-quick-transition"];

const definitions = [
  {
    department: "Graphics", folder: "GOD-VISUALS-NATURAL", id: visualConflict[0], name: "GOD NATURAL — Natural Realism",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[0]),
    moduleName: "godmods_god_visuals_natural.lua",
    module: visualModule("GOD VISUALS / NATURAL", { brightness: 1.0, sharpness: 0.145, shadow_softness: 0.58, reflection: 1.0 }, "GOD-VISUALS-NATURAL"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-VISUALS-NATURAL\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 1\nsharpness = 0.145\nshadow_softness = 0.58\nreflection = 1\n",
    description: "GOD NATURAL original restrained Sider 3.5 graphics profile for PES 2017. Adjusts documented brightness, sharpness, player-shadow softness and reflection controls.",
    readme: "# GOD VISUALS NATURAL — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-VISUALS-NATURAL/`. It also installs an editable `content/GODMODS/Graphics/GOD-VISUALS-NATURAL/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-VISUALS-CINEMATIC", id: visualConflict[1], name: "GOD CINEMATIC — Matchday",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[1]),
    moduleName: "godmods_god_cinematic.lua",
    module: visualModule("GOD CINEMATIC", { brightness: 0.985, sharpness: 0.155, shadow_softness: 0.62, reflection: 1.0 }, "GOD-VISUALS-CINEMATIC"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-VISUALS-CINEMATIC\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 0.985\nsharpness = 0.155\nshadow_softness = 0.62\nreflection = 1\n",
    description: "Original cinematic Sider 3.5 graphics profile with restrained brightness, sharpness and shadow softness settings.",
    readme: "# GOD VISUALS CINEMATIC — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-VISUALS-CINEMATIC/`. It also installs an editable `content/GODMODS/Graphics/GOD-VISUALS-CINEMATIC/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-VISUALS-BROADCAST", id: visualConflict[2], name: "GOD VISUALS — Broadcast Balanced",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[2]),
    moduleName: "godmods_god_visuals_broadcast.lua",
    module: visualModule("GOD VISUALS / BROADCAST", { brightness: 1.0, sharpness: 0.166, shadow_softness: 0.52, reflection: 1.0 }, "GOD-VISUALS-BROADCAST"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-VISUALS-BROADCAST\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 1\nsharpness = 0.166\nshadow_softness = 0.52\nreflection = 1\n",
    description: "Original balanced broadcast-style Sider 3.5 graphics profile using documented PES 2017 gfx controls.",
    readme: "# GOD VISUALS BROADCAST — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-VISUALS-BROADCAST/`. It also installs an editable `content/GODMODS/Graphics/GOD-VISUALS-BROADCAST/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-EAFC27-INSPIRED", id: visualConflict[3], name: "GOD GRAPHICS — EA FC 27 Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[3]),
    moduleName: "godmods_eafc27_inspired.lua",
    module: visualModule("EA FC 27 INSPIRED", { brightness: 0.992, sharpness: 0.19, shadow_softness: 0.48, reflection: 1.0 }, "GOD-EAFC27-INSPIRED"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-EAFC27-INSPIRED\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 0.992\nsharpness = 0.19\nshadow_softness = 0.48\nreflection = 1\n",
    description: "Original EA FC 27-inspired visual tuning profile for PES 2017 using documented Sider 3.5 graphics controls. No EA assets or shaders.",
    readme: "# GOD EAFC27 INSPIRED — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-EAFC27-INSPIRED/`. It also installs an editable `content/GODMODS/Graphics/GOD-EAFC27-INSPIRED/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-EFOOTBALL27-INSPIRED", id: visualConflict[4], name: "GOD GRAPHICS — eFootball 27 Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[4]),
    moduleName: "godmods_ef27_inspired.lua",
    module: visualModule("EFOOTBALL 27 INSPIRED", { brightness: 1.005, sharpness: 0.135, shadow_softness: 0.68, reflection: 1.0 }, "GOD-EFOOTBALL27-INSPIRED"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-EFOOTBALL27-INSPIRED\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 1.005\nsharpness = 0.135\nshadow_softness = 0.68\nreflection = 1\n",
    description: "Original eFootball 27-inspired softer natural visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD EFOOTBALL27 INSPIRED — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-EFOOTBALL27-INSPIRED/`. It also installs an editable `content/GODMODS/Graphics/GOD-EFOOTBALL27-INSPIRED/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-UFL-INSPIRED", id: visualConflict[5], name: "GOD GRAPHICS — UFL Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[5]),
    moduleName: "godmods_ufl_inspired.lua",
    module: visualModule("UFL INSPIRED", { brightness: 0.998, sharpness: 0.175, shadow_softness: 0.55, reflection: 1.0 }, "GOD-UFL-INSPIRED"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-UFL-INSPIRED\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 0.998\nsharpness = 0.175\nshadow_softness = 0.55\nreflection = 1\n",
    description: "Original UFL-inspired balanced broadcast visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD UFL INSPIRED — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-UFL-INSPIRED/`. It also installs an editable `content/GODMODS/Graphics/GOD-UFL-INSPIRED/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Graphics", folder: "GOD-ISS-PURE", id: visualConflict[6], name: "GOD GRAPHICS — ISS Pure",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[6]),
    moduleName: "godmods_iss_pure.lua",
    module: visualModule("ISS PURE", { brightness: 1.0, sharpness: 0.105, shadow_softness: 0.72, reflection: 1.0 }, "GOD-ISS-PURE"),
    configDepartment: "Graphics",
    configFilename: "graphics.ini",
    configIni: "# THEGODMODS graphics configuration — GOD-ISS-PURE\n# Read by the Sider Lua module at each match setup.\n# Values outside the module's conservative bounds are ignored.\nbrightness = 1\nsharpness = 0.105\nshadow_softness = 0.72\nreflection = 1\n",
    description: "Original ISS/Pure-inspired restrained, clean football visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD ISS PURE — GOD GRAPHICS\n\nThis package installs its Lua module and README under `content/GODMODS/Graphics/GOD-ISS-PURE/`. It also installs an editable `content/GODMODS/Graphics/GOD-ISS-PURE/graphics.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the graphics INI on match setup; edit the four documented Sider gfx values for the next match. The module validates values against conservative bounds and falls back to the profile defaults if the INI is missing or invalid.\n\nThis uses Sider's documented gfx library, not an external shader or texture replacement."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-SUMMER-DAY", id: conditionConflict[0], name: "GOD STADIUMS — Summer Day",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[0]),
    moduleName: "godmods_stadiums_summer_day.lua",
    module: conditionsModule("GOD STADIUMS / SUMMER DAY", { timeofday: 0, weather: 0, season: 0 }, "GOD-STADIUMS-SUMMER-DAY"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# THEGODMODS stadium conditions — GOD-STADIUMS-SUMMER-DAY\n# Values: timeofday 0=day, 1=night; weather 0=fine, 1=rain; season 0=summer, 1=winter.\ntimeofday = 0\nweather = 0\nseason = 0\n",
    description: "Original Sider 3.5 matchday conditions module: day, fine weather and summer. Does not change stadium IDs or geometry.",
    readme: "# GOD STADIUMS — SUMMER DAY\n\nThis package installs its Lua module and README under `content/GODMODS/Stadiums/GOD-STADIUMS-SUMMER-DAY/`. It also installs `content/GODMODS/Stadiums/GOD-STADIUMS-SUMMER-DAY/stadium.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the editable stadium INI when Sider applies match conditions. Change day/night, fine/rain or summer/winter using the documented 0/1 values. It does not replace stadium models or textures and does not use LiveCPK."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-NIGHT", id: conditionConflict[1], name: "GOD STADIUMS — Night Match",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[1]),
    moduleName: "godmods_stadiums_night.lua",
    module: conditionsModule("GOD STADIUMS / NIGHT MATCH", { timeofday: 1, weather: 0, season: 0 }, "GOD-STADIUMS-NIGHT"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# THEGODMODS stadium conditions — GOD-STADIUMS-NIGHT\n# Values: timeofday 0=day, 1=night; weather 0=fine, 1=rain; season 0=summer, 1=winter.\ntimeofday = 1\nweather = 0\nseason = 0\n",
    description: "Original Sider 3.5 matchday conditions module: night, fine weather and summer.",
    readme: "# GOD STADIUMS — NIGHT MATCH\n\nThis package installs its Lua module and README under `content/GODMODS/Stadiums/GOD-STADIUMS-NIGHT/`. It also installs `content/GODMODS/Stadiums/GOD-STADIUMS-NIGHT/stadium.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the editable stadium INI when Sider applies match conditions. Change day/night, fine/rain or summer/winter using the documented 0/1 values. It does not replace stadium models or textures and does not use LiveCPK."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-RAINY-EVENING", id: conditionConflict[2], name: "GOD STADIUMS — Rainy Evening",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[2]),
    moduleName: "godmods_stadiums_rainy_evening.lua",
    module: conditionsModule("GOD STADIUMS / RAINY EVENING", { timeofday: 1, weather: 1, season: 0 }, "GOD-STADIUMS-RAINY-EVENING"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# THEGODMODS stadium conditions — GOD-STADIUMS-RAINY-EVENING\n# Values: timeofday 0=day, 1=night; weather 0=fine, 1=rain; season 0=summer, 1=winter.\ntimeofday = 1\nweather = 1\nseason = 0\n",
    description: "Original Sider 3.5 matchday conditions module: night, rain and summer.",
    readme: "# GOD STADIUMS — RAINY EVENING\n\nThis package installs its Lua module and README under `content/GODMODS/Stadiums/GOD-STADIUMS-RAINY-EVENING/`. It also installs `content/GODMODS/Stadiums/GOD-STADIUMS-RAINY-EVENING/stadium.ini` inside PES 2017/content/GODMODS.\n\nThe GODMODS Manager installs and registers the single `GODMODS_Loader.lua` Sider entry automatically. Keep the package and editable configuration under `PES 2017/content/GODMODS/`. The module reads the editable stadium INI when Sider applies match conditions. Change day/night, fine/rain or summer/winter using the documented 0/1 values. It does not replace stadium models or textures and does not use LiveCPK."
  },
  {
    department: "Stadiums", folder: "GOD-WEATHER-FINE-DAY", id: "thegodmods.god-weather-fine-day", name: "GOD WEATHER — Fine Day",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== "thegodmods.god-weather-fine-day"),
    moduleName: "godmods_weather_fine_day.lua",
    module: conditionsModule("GOD WEATHER — FINE DAY", { timeofday: 0, weather: 0, season: 0 }, "GOD-WEATHER-FINE-DAY"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# GOD WEATHER — FINE DAY\n# Sider 3.5 values: 0=day, 1=night; 0=fine, 1=rain; 0=summer, 1=winter.\ntimeofday = 0\nweather = 0\nseason = 0\n",
    description: "Clear daytime match conditions using the documented PES 2017 Sider 3.5 set_conditions event.",
    readme: "# GOD WEATHER — FINE DAY\n\nOriginal GODMODS match-condition preset for PES 2017 + Sider 3.5. Uses the documented `set_conditions` and replay conditions hooks. Fine weather, daytime, summer.\n\nInstall the Lua module in `Sider/modules`, add its `lua.module` entry to `sider.ini`, and edit the `content/GODMODS/Stadiums/GOD-WEATHER-FINE-DAY/stadium.ini` for the next match. This changes only the game's documented condition values; it does not create rain, snow, wet reflections, fog, or new lighting effects. Use one condition profile at a time."
  },
  {
    department: "Stadiums", folder: "GOD-WEATHER-RAIN-DAY", id: "thegodmods.god-weather-rain-day", name: "GOD WEATHER — Rain Day",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== "thegodmods.god-weather-rain-day"),
    moduleName: "godmods_weather_rain_day.lua",
    module: conditionsModule("GOD WEATHER — RAIN DAY", { timeofday: 0, weather: 1, season: 0 }, "GOD-WEATHER-RAIN-DAY"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# GOD WEATHER — RAIN DAY\n# Sider 3.5 values: 0=day, 1=night; 0=fine, 1=rain; 0=summer, 1=winter.\ntimeofday = 0\nweather = 1\nseason = 0\n",
    description: "Rainy daytime match conditions using the documented PES 2017 Sider 3.5 set_conditions event.",
    readme: "# GOD WEATHER — RAIN DAY\n\nOriginal GODMODS match-condition preset for PES 2017 + Sider 3.5. Uses the documented `set_conditions` and replay conditions hooks. Rainy weather, daytime, summer.\n\nInstall the Lua module in `Sider/modules`, add its `lua.module` entry to `sider.ini`, and edit the `content/GODMODS/Stadiums/GOD-WEATHER-RAIN-DAY/stadium.ini` for the next match. This profile also sets Sider 3.5's documented weather_effects = 2 flag to request falling rain; confirm the effect in the target game. It does not add wet pitch materials, puddles, spray or reflections. Use one condition profile at a time."
  },
  {
    department: "Stadiums", folder: "GOD-WEATHER-RAIN-NIGHT", id: "thegodmods.god-weather-rain-night", name: "GOD WEATHER — Rain Night",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== "thegodmods.god-weather-rain-night"),
    moduleName: "godmods_weather_rain_night.lua",
    module: conditionsModule("GOD WEATHER — RAIN NIGHT", { timeofday: 1, weather: 1, season: 0 }, "GOD-WEATHER-RAIN-NIGHT"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# GOD WEATHER — RAIN NIGHT\n# Sider 3.5 values: 0=day, 1=night; 0=fine, 1=rain; 0=summer, 1=winter.\ntimeofday = 1\nweather = 1\nseason = 0\n",
    description: "Rainy night match conditions using the documented PES 2017 Sider 3.5 set_conditions event.",
    readme: "# GOD WEATHER — RAIN NIGHT\n\nOriginal GODMODS match-condition preset for PES 2017 + Sider 3.5. Uses the documented `set_conditions` and replay conditions hooks. Rainy weather, night, summer.\n\nInstall the Lua module in `Sider/modules`, add its `lua.module` entry to `sider.ini`, and edit the `content/GODMODS/Stadiums/GOD-WEATHER-RAIN-NIGHT/stadium.ini` for the next match. This profile also sets Sider 3.5's documented weather_effects = 2 flag to request falling rain; confirm the effect in the target game. It does not add wet pitch materials, puddles, spray or reflections. Use one condition profile at a time."
  },
  {
    department: "Stadiums", folder: "GOD-MATCHDAY-WINTER-NIGHT", id: "thegodmods.god-matchday-winter-night", name: "GOD MATCHDAY — Winter Night",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== "thegodmods.god-matchday-winter-night"),
    moduleName: "godmods_matchday_winter_night.lua",
    module: conditionsModule("GOD MATCHDAY — WINTER NIGHT", { timeofday: 1, weather: 0, season: 1 }, "GOD-MATCHDAY-WINTER-NIGHT"),
    configDepartment: "Stadiums",
    configFilename: "stadium.ini",
    configIni: "# GOD MATCHDAY — WINTER NIGHT\n# Sider 3.5 values: 0=day, 1=night; 0=fine, 1=rain; 0=summer, 1=winter.\ntimeofday = 1\nweather = 0\nseason = 1\n",
    description: "Winter-night matchday preset combining documented PES 2017 Sider 3.5 time, weather and season values.",
    readme: "# GOD MATCHDAY — WINTER NIGHT\n\nOriginal GODMODS matchday conditions preset for PES 2017 + Sider 3.5. Uses the documented `set_conditions` and replay conditions hooks. Night, fine weather, winter season.\n\nInstall the Lua module in `Sider/modules`, add its `lua.module` entry to `sider.ini`, and edit the `content/GODMODS/Stadiums/GOD-MATCHDAY-WINTER-NIGHT/stadium.ini` for the next match. This sets only documented match conditions; it does not inject lighting, snow, fog, temperature, or pitch effects. Use one condition profile at a time."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-BALANCED", id: gameplayConflict[0], name: "GOD GAMEPLAY — Balanced Simulation",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[0]),
    moduleName: "godmods_gameplay_balanced.lua",
    module: gameplayModule("GOD GAMEPLAY / BALANCED SIMULATION", [1000, 0.4, 1, -0.5, 0.108685933, 0.85, 0.2, 5], "GOD-GAMEPLAY-BALANCED"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / BALANCED SIMULATION\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\n# Set match_minutes = 0 to keep the in-game duration, or 5-90 to override it.\nmatch_minutes = 0\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 1\nball_friction = -0.5\nball_magnus = 0.108685933\nshooting_power = 0.85\nspeed = 0.2\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — BALANCED SIMULATION\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-BALANCED/`. It also installs `content/GODMODS/Gameplay/GOD-GAMEPLAY-BALANCED/gameplay.ini` inside PES 2017/content/GODMODS.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys plus `match_minutes`: use 0 to keep the in-game duration, or 5–90 to override it through Sider's documented set_match_time event. Numeric gameplay values outside conservative safety bounds are ignored. Sider labels gameplay controls experimental; test offline and keep backups."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-GROUNDED", id: gameplayConflict[1], name: "GOD GAMEPLAY — Grounded Match",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[1]),
    moduleName: "godmods_gameplay_grounded.lua",
    module: gameplayModule("GOD GAMEPLAY / GROUNDED MATCH", [1000, 0.4, 0.985, -0.52, 0.108685933, 0.84, 0.2, 5], "GOD-GAMEPLAY-GROUNDED"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / GROUNDED MATCH\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\n# Set match_minutes = 0 to keep the in-game duration, or 5-90 to override it.\nmatch_minutes = 0\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 0.985\nball_friction = -0.52\nball_magnus = 0.108685933\nshooting_power = 0.84\nspeed = 0.2\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — GROUNDED MATCH\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-GROUNDED/`. It also installs `content/GODMODS/Gameplay/GOD-GAMEPLAY-GROUNDED/gameplay.ini` inside PES 2017/content/GODMODS.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys plus `match_minutes`: use 0 to keep the in-game duration, or 5–90 to override it through Sider's documented set_match_time event. Numeric gameplay values outside conservative safety bounds are ignored. Sider labels gameplay controls experimental; test offline and keep backups."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-QUICK-TRANSITION", id: gameplayConflict[2], name: "GOD GAMEPLAY — Quick Transition",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[2]),
    moduleName: "godmods_gameplay_quick_transition.lua",
    module: gameplayModule("GOD GAMEPLAY / QUICK TRANSITION", [1000, 0.4, 1, -0.5, 0.108685933, 0.85, 0.205, 5], "GOD-GAMEPLAY-QUICK-TRANSITION"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / QUICK TRANSITION\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\n# Set match_minutes = 0 to keep the in-game duration, or 5-90 to override it.\nmatch_minutes = 0\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 1\nball_friction = -0.5\nball_magnus = 0.108685933\nshooting_power = 0.85\nspeed = 0.205\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — QUICK TRANSITION\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-QUICK-TRANSITION/`. It also installs `content/GODMODS/Gameplay/GOD-GAMEPLAY-QUICK-TRANSITION/gameplay.ini` inside PES 2017/content/GODMODS.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys plus `match_minutes`: use 0 to keep the in-game duration, or 5–90 to override it through Sider's documented set_match_time event. Numeric gameplay values outside conservative safety bounds are ignored. Sider labels gameplay controls experimental; test offline and keep backups."
  },
  {
    id: "thegodmods.god-atmosphere-matchday",
    name: "GOD ATMOSPHERE — Continuous Matchday Crowd",
    folder: "GOD-ATMOSPHERE-MATCHDAY",
    category: "audio",
    department: "Audio",
    moduleName: "godmods_atmosphere_matchday.lua",
    conflicts: [],
    module: buildAtmosphereModule("GOD ATMOSPHERE — Continuous Matchday Crowd", "GOD-ATMOSPHERE-MATCHDAY"),
    description: "An original Sider 3.5 crowd engine with four selectable premium ambience beds, an optional second layer, intensity scaling and opt-in activation. No unverified match-event cues are triggered.",
    configDepartment: "Audio",
    configFilename: "audio.ini",
    configIni: "# GODMODS premium crowd engine settings\n# enabled and ambience: 0=off, 1=on. Package activation is controlled by GODMODS Manager.\n# bed: stadium-open-air, stadium-intimate, stadium-night, stadium-cup-final\n# texture: none or one of the four beds (must differ from bed)\n# intensity: 0=calm, 1=normal, 2=tense, 3=peak\n# volume and texture_volume: 0.0-1.0\nenabled = 1\nambience = 1\nbed = stadium-open-air\ntexture = none\nintensity = 1\nvolume = 0.16\ntexture_volume = 0.035\n",
    assets: [
      { source: "content/originals/generated/GOD-ATMOSPHERE-PREMIUM/beds/stadium-open-air.wav", filename: "stadium-open-air.wav" },
      { source: "content/originals/generated/GOD-ATMOSPHERE-PREMIUM/beds/stadium-intimate.wav", filename: "stadium-intimate.wav" },
      { source: "content/originals/generated/GOD-ATMOSPHERE-PREMIUM/beds/stadium-night.wav", filename: "stadium-night.wav" },
      { source: "content/originals/generated/GOD-ATMOSPHERE-PREMIUM/beds/stadium-cup-final.wav", filename: "stadium-cup-final.wav" }
    ],
    readme: "# GOD ATMOSPHERE — Premium Crowd Engine\n\nThis package installs an original Sider 3.5 crowd engine and four premium synthesized 18-second PCM WAV ambience beds: Open Air, Intimate Ground, Night Match and Cup Final. Choose one primary bed and optionally add a quieter secondary texture. The engine restarts each bed with Sider's documented audio completion callback and scales both layers using the selected calm/normal/tense/peak intensity.\n\nCopy `godmods_atmosphere_matchday.lua` into `Sider/modules` and add `lua.module = \"godmods_atmosphere_matchday.lua\"` under the Extension modules section of `sider.ini`. The module does not edit `sider.ini`, replace commentary, use LiveCPK or hook undocumented game memory. Launch Sider with the PES 2017 game folder as its working directory so relative config and asset paths resolve.\n\nEdit `content/GODMODS/Audio/GOD-ATMOSPHERE-MATCHDAY/audio.ini`. It starts enabled when installed. Use the GODMODS Manager package switch to turn the engine off without removing its files. Set `ambience = 0` to silence it while leaving the package installed. Select `bed` from the four documented IDs; set `texture` to `none` or a different bed. Set `intensity` to 0 (calm), 1 (normal), 2 (tense) or 3 (peak). Volumes are 0.0–1.0. Set `ambience = 0` to stop both loops. Invalid values are ignored and unknown bed names fall back safely.\n\nThe engine deliberately does not trigger the 25 club stingers or goal/half-time/full-time cues: team IDs and match-event signals still require target-patch evidence. This is a source-verified runtime module, not a claim of in-game audio compatibility. Test loop continuity, commentary balance and long-session stability on the exact PES 2017 + YosfX + Sider setup before relying on it during normal play."
  },
];

await mkdir(OUT, { recursive: true });
const built = [];
for (const definition of definitions) built.push(await writePackage(definition));
await writeFile(path.join(OUT, "README.md"), [
  "# THEGODMODS — Built-in original module library",
  "",
  "This folder contains first-party, hash-manifested PES 2017 / Sider 3.5 Lua modules.",
  "Scan this folder in the manager's Module Library, preview each package, install, then explicitly synchronize Sider modules.",
  "",
  "Graphics and stadium-condition modules use documented Sider 3.5 APIs. Gameplay modules are opt-in because the Sider 3.5 guide labels gameplay controls experimental.",
  "Texture-source collections (GOD TURF, GOD KITS, GOD FACES, stadium artwork) are not represented here as installable replacement packages until exact target patch mappings and material/UV requirements are known.",
  "",
  "Built packages:",
  ...built.map(item => "- " + item.name + " (" + item.id + ") — " + item.moduleName),
  ""
].join("\n"));
console.log(JSON.stringify({ packages: built.length, built }, null, 2));
