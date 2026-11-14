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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "packs");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const text = (value) => Buffer.from(value.replace(/\r\n/g, "\n"), "utf8");

function luaNumber(value) {
  if (!Number.isFinite(value)) throw new Error("Non-finite Lua setting");
  return String(value);
}

function visualModule(name, settings) {
  const lines = [
    "-- THEGODMODS original PES 2017 graphics profile: " + name,
    "-- Sider 3.5 API: gfx library + set_home_team/set_away_team events.",
    "-- Profile values are deliberately restrained and can be reverted by uninstalling.",
    "local M = {}",
    "local applied = false",
    "local function apply(ctx, team_id)",
    "  gfx.brightness = " + luaNumber(settings.brightness),
    "  gfx.sharpness = " + luaNumber(settings.sharpness),
    "  gfx.shadow_softness = " + luaNumber(settings.shadow_softness),
    "  gfx.reflection = " + luaNumber(settings.reflection),
    "  if not applied then",
    "    log(\"THEGODMODS " + name + ": graphics profile active\")",
    "    applied = true",
    "  end",
    "end",
    "function M.init(ctx)",
    "  ctx.register(\"set_home_team\", apply)",
    "  ctx.register(\"set_away_team\", apply)",
    "  log(\"THEGODMODS " + name + ": loaded; values apply at match setup\")",
    "end",
    "return M",
    ""
  ];
  return lines.join("\n");
}

function conditionsModule(name, values) {
  return [
    "-- THEGODMODS original PES 2017 matchday conditions profile: " + name,
    "-- Sider 3.5 set_conditions API. No stadium IDs are changed.",
    "local M = {}",
    "local function apply(ctx, options)",
    "  if type(options) ~= \"table\" then return nil end",
    "  local changed = {}",
    "  for k, v in pairs(options) do changed[k] = v end",
    "  changed.timeofday = " + values.timeofday,
    "  changed.weather = " + values.weather,
    "  changed.season = " + values.season,
    "  return changed",
    "end",
    "function M.init(ctx)",
    "  ctx.register(\"set_conditions\", apply)",
    "  ctx.register(\"set_conditions_for_replay\", apply)",
    "  log(\"THEGODMODS " + name + ": matchday conditions active\")",
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
    "  config_path = ctx.sider_dir .. \"\\\\GODMODS\\\\Gameplay\\\\\" .. configFolder .. \"\\\\gameplay.ini\"",
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
  if (definition.configIni) {
    const configSource = "payload/gameplay.ini";
    const configBytes = text(definition.configIni);
    await writeFile(path.join(root, configSource), configBytes);
    files.push({ source: configSource, target: "GODMODS/Gameplay/" + definition.folder + "/gameplay.ini", sha256: sha256(configBytes) });
  }
  const manifest = {
    schemaVersion: 1,
    id: definition.id,
    name: definition.name,
    version: "0.1.0",
    description: definition.description,
    category: definition.category,
    deployment: { strategy: "direct", manualSteps: ["Open the installed folder under content/GODMODS and read README.md first.", "Copy the listed Lua module into your Sider/modules folder.", "Add lua.module = \"<module filename>\" to the Extension modules section of sider.ini. This package does not edit sider.ini or enable LiveCPK."] },
    game: { title: "PES 2017", executable: ["PES2017.exe", "PES2017patched.exe"], sider: ">=3.5.0 <4.0.0" },
    dependencies: [],
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
const conditionConflict = ["thegodmods.god-stadiums-summer-day", "thegodmods.god-stadiums-night", "thegodmods.god-stadiums-rainy-evening"];
const gameplayConflict = ["thegodmods.god-gameplay-balanced", "thegodmods.god-gameplay-grounded", "thegodmods.god-gameplay-quick-transition"];

const definitions = [
  {
    department: "Graphics", folder: "GOD-VISUALS-NATURAL", id: visualConflict[0], name: "GOD NATURAL — Natural Realism",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[0]),
    moduleName: "godmods_god_visuals_natural.lua",
    module: visualModule("GOD VISUALS / NATURAL", { brightness: 1.0, sharpness: 0.145, shadow_softness: 0.58, reflection: 1.0 }),
    description: "GOD NATURAL original restrained Sider 3.5 graphics profile for PES 2017. Adjusts documented brightness, sharpness, player-shadow softness and reflection controls.",
    readme: "# GOD VISUALS — Natural Realism\n\nInstall this module through the manager's local package library, then synchronize Sider modules. It applies restrained, documented Sider 3.5 gfx settings at match setup. It does not inject shaders, LUTs, or proprietary EA assets. Remove the module and synchronize Sider to revert."
  },
  {
    department: "Graphics", folder: "GOD-VISUALS-CINEMATIC", id: visualConflict[1], name: "GOD CINEMATIC — Matchday",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[1]),
    moduleName: "godmods_god_cinematic.lua",
    module: visualModule("GOD CINEMATIC", { brightness: 0.985, sharpness: 0.155, shadow_softness: 0.62, reflection: 1.0 }),
    description: "Original cinematic Sider 3.5 graphics profile with restrained brightness, sharpness and shadow softness settings.",
    readme: "# GOD CINEMATIC — Matchday\n\nA subtle matchday profile using only documented Sider 3.5 gfx controls. No post-processing shader or proprietary assets are included. Remove the module and synchronize Sider to revert."
  },
  {
    department: "Graphics", folder: "GOD-VISUALS-BROADCAST", id: visualConflict[2], name: "GOD VISUALS — Broadcast Balanced",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[2]),
    moduleName: "godmods_god_visuals_broadcast.lua",
    module: visualModule("GOD VISUALS / BROADCAST", { brightness: 1.0, sharpness: 0.166, shadow_softness: 0.52, reflection: 1.0 }),
    description: "Original balanced broadcast-style Sider 3.5 graphics profile using documented PES 2017 gfx controls.",
    readme: "# GOD VISUALS — Broadcast Balanced\n\nBalanced Sider 3.5 graphics settings. This is a real Lua graphics module, not a shader replacement. Remove the module and synchronize Sider to revert."
  },
  {
    department: "Graphics", folder: "GOD-EAFC27-INSPIRED", id: visualConflict[3], name: "GOD GRAPHICS — EA FC 27 Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[3]),
    moduleName: "godmods_eafc27_inspired.lua",
    module: visualModule("EA FC 27 INSPIRED", { brightness: 0.992, sharpness: 0.19, shadow_softness: 0.48, reflection: 1.0 }),
    description: "Original EA FC 27-inspired visual tuning profile for PES 2017 using documented Sider 3.5 graphics controls. No EA assets or shaders.",
    readme: "# GOD GRAPHICS — EA FC 27 Inspired\n\nAn original visual tuning profile inspired by the crisp, high-contrast presentation of modern football games. It uses documented Sider gfx controls only; it does not contain EA assets or inject shaders."
  },
  {
    department: "Graphics", folder: "GOD-EFOOTBALL27-INSPIRED", id: visualConflict[4], name: "GOD GRAPHICS — eFootball 27 Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[4]),
    moduleName: "godmods_ef27_inspired.lua",
    module: visualModule("EFOOTBALL 27 INSPIRED", { brightness: 1.005, sharpness: 0.135, shadow_softness: 0.68, reflection: 1.0 }),
    description: "Original eFootball 27-inspired softer natural visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD GRAPHICS — eFootball 27 Inspired\n\nAn original soft, natural visual tuning profile inspired by contemporary eFootball presentation. No eFootball assets are included."
  },
  {
    department: "Graphics", folder: "GOD-UFL-INSPIRED", id: visualConflict[5], name: "GOD GRAPHICS — UFL Inspired",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[5]),
    moduleName: "godmods_ufl_inspired.lua",
    module: visualModule("UFL INSPIRED", { brightness: 0.998, sharpness: 0.175, shadow_softness: 0.55, reflection: 1.0 }),
    description: "Original UFL-inspired balanced broadcast visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD GRAPHICS — UFL Inspired\n\nAn original balanced visual tuning profile inspired by UFL's contemporary broadcast presentation. No UFL assets are included."
  },
  {
    department: "Graphics", folder: "GOD-ISS-PURE", id: visualConflict[6], name: "GOD GRAPHICS — ISS Pure",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[6]),
    moduleName: "godmods_iss_pure.lua",
    module: visualModule("ISS PURE", { brightness: 1.0, sharpness: 0.105, shadow_softness: 0.72, reflection: 1.0 }),
    description: "Original ISS/Pure-inspired restrained, clean football visual tuning for PES 2017 using documented Sider 3.5 graphics controls.",
    readme: "# GOD GRAPHICS — ISS Pure\n\nA restrained, clean and natural visual tuning profile. It is an original GODMODS module, not an ISS/Pure asset conversion."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-SUMMER-DAY", id: conditionConflict[0], name: "GOD STADIUMS — Summer Day",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[0]),
    moduleName: "godmods_stadiums_summer_day.lua",
    module: conditionsModule("GOD STADIUMS / SUMMER DAY", { timeofday: 0, weather: 0, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: day, fine weather and summer. Does not change stadium IDs or geometry.",
    readme: "# GOD STADIUMS — Summer Day\n\nApplies documented Sider 3.5 match conditions: day, fine weather, summer. It does not add stadium models or texture replacements."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-NIGHT", id: conditionConflict[1], name: "GOD STADIUMS — Night Match",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[1]),
    moduleName: "godmods_stadiums_night.lua",
    module: conditionsModule("GOD STADIUMS / NIGHT MATCH", { timeofday: 1, weather: 0, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: night, fine weather and summer.",
    readme: "# GOD STADIUMS — Night Match\n\nApplies documented Sider 3.5 match conditions: night, fine weather, summer. It does not add stadium models or texture replacements."
  },
  {
    department: "Stadiums", folder: "GOD-STADIUMS-RAINY-EVENING", id: conditionConflict[2], name: "GOD STADIUMS — Rainy Evening",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[2]),
    moduleName: "godmods_stadiums_rainy_evening.lua",
    module: conditionsModule("GOD STADIUMS / RAINY EVENING", { timeofday: 1, weather: 1, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: night, rain and summer.",
    readme: "# GOD STADIUMS — Rainy Evening\n\nApplies documented Sider 3.5 match conditions: night, rain, summer. It does not add stadium models or texture replacements."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-BALANCED", id: gameplayConflict[0], name: "GOD GAMEPLAY — Balanced Simulation",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[0]),
    moduleName: "godmods_gameplay_balanced.lua",
    module: gameplayModule("GOD GAMEPLAY / BALANCED SIMULATION", [1000, 0.4, 1, -0.5, 0.108685933, 0.85, 0.2, 5], "GOD-GAMEPLAY-BALANCED"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / BALANCED SIMULATION\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 1\nball_friction = -0.5\nball_magnus = 0.108685933\nshooting_power = 0.85\nspeed = 0.2\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — BALANCED SIMULATION\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-BALANCED/`. It also installs `GODMODS/Gameplay/GOD-GAMEPLAY-BALANCED/gameplay.ini` in the PES 2017 game root.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys. Values outside conservative safety bounds are ignored. Sider labels these controls experimental; test offline and keep backups."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-GROUNDED", id: gameplayConflict[1], name: "GOD GAMEPLAY — Grounded Match",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[1]),
    moduleName: "godmods_gameplay_grounded.lua",
    module: gameplayModule("GOD GAMEPLAY / GROUNDED MATCH", [1000, 0.4, 0.985, -0.52, 0.108685933, 0.84, 0.2, 5], "GOD-GAMEPLAY-GROUNDED"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / GROUNDED MATCH\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 0.985\nball_friction = -0.52\nball_magnus = 0.108685933\nshooting_power = 0.84\nspeed = 0.2\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — GROUNDED MATCH\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-GROUNDED/`. It also installs `GODMODS/Gameplay/GOD-GAMEPLAY-GROUNDED/gameplay.ini` in the PES 2017 game root.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys. Values outside conservative safety bounds are ignored. Sider labels these controls experimental; test offline and keep backups."
  },
  {
    department: "Gameplay", folder: "GOD-GAMEPLAY-QUICK-TRANSITION", id: gameplayConflict[2], name: "GOD GAMEPLAY — Quick Transition",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[2]),
    moduleName: "godmods_gameplay_quick_transition.lua",
    module: gameplayModule("GOD GAMEPLAY / QUICK TRANSITION", [1000, 0.4, 1, -0.5, 0.108685933, 0.85, 0.205, 5], "GOD-GAMEPLAY-QUICK-TRANSITION"),
    description: "Configurable PES 2017 gameplay profile. Its Lua module reads editable INI values from the PES 2017 game root at each match setup; supported Sider gameplay controls are experimental.",
    configIni: "# THEGODMODS gameplay configuration — GOD GAMEPLAY / QUICK TRANSITION\n# Loaded at each match setup. Edit numeric values for the next match.\n# Sider 3.5 labels gameplay controls experimental; test offline and back up saves.\nball_weight = 1000\nball_physics = 0.4\nball_bounce = 1\nball_friction = -0.5\nball_magnus = 0.108685933\nshooting_power = 0.85\nspeed = 0.205\nspeed_global = 5\n",
    readme: "# GOD GAMEPLAY — QUICK TRANSITION\n\nThis package installs its Lua module and README under `content/GODMODS/Gameplay/GOD-GAMEPLAY-QUICK-TRANSITION/`. It also installs `GODMODS/Gameplay/GOD-GAMEPLAY-QUICK-TRANSITION/gameplay.ini` in the PES 2017 game root.\n\nCopy the listed Lua module into `Sider/modules` and add its `lua.module = \"<module filename>\"` entry under the Extension modules section of `sider.ini`. The module reads the INI at each match setup, so edits apply to the next match without restarting.\n\nThe INI contains documented Sider gameplay keys. Values outside conservative safety bounds are ignored. Sider labels these controls experimental; test offline and keep backups."
  }
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
