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

function gameplayModule(name, values) {
  const keys = ["ball_weight", "ball_physics", "ball_bounce", "ball_friction", "ball_magnus", "shooting_power", "speed", "speed_global"];
  return [
    "-- THEGODMODS original PES 2017 gameplay profile: " + name,
    "-- Sider 3.5 gameplay library. These controls are documented as experimental.",
    "-- Install only if you accept experimental gameplay tuning; remove to restore defaults.",
    "local M = {}",
    "local applied = false",
    "local function apply(ctx, team_id)",
    ...keys.map((key, index) => "  gameplay." + key + " = " + luaNumber(values[index])),
    "  if not applied then log(\"THEGODMODS " + name + ": experimental profile active\"); applied = true end",
    "end",
    "function M.init(ctx)",
    "  ctx.register(\"set_home_team\", apply)",
    "  ctx.register(\"set_away_team\", apply)",
    "  log(\"THEGODMODS " + name + ": loaded; experimental controls\")",
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
  const payload = text(definition.module);
  await writeFile(path.join(root, payloadPath), payload);
  const manifest = {
    schemaVersion: 1,
    id: definition.id,
    name: definition.name,
    version: "0.1.0",
    description: definition.description,
    category: definition.category,
    deployment: { strategy: "lua" },
    game: { title: "PES 2017", executable: ["PES2017.exe", "PES2017patched.exe"], sider: ">=3.5.0 <4.0.0" },
    dependencies: [],
    conflicts: definition.conflicts,
    files: [],
    luaModules: [{ source: payloadPath, moduleName: definition.moduleName, sha256: sha256(payload) }],
    license: { id: "THEGODMODS-ORIGINAL-1.0", redistributionAllowed: true }
  };
  await writeFile(path.join(root, "module.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(root, "README.md"), definition.readme + "\n");
  return { id: manifest.id, name: manifest.name, moduleName: definition.moduleName, sha256: sha256(payload) };
}

const visualConflict = ["thegodmods.god-visuals-natural", "thegodmods.god-visuals-cinematic", "thegodmods.god-visuals-broadcast"];
const conditionConflict = ["thegodmods.god-stadiums-summer-day", "thegodmods.god-stadiums-night", "thegodmods.god-stadiums-rainy-evening"];
const gameplayConflict = ["thegodmods.god-gameplay-balanced", "thegodmods.god-gameplay-grounded", "thegodmods.god-gameplay-quick-transition"];

const definitions = [
  {
    folder: "GOD-VISUALS-NATURAL", id: visualConflict[0], name: "GOD VISUALS — Natural Realism",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[0]),
    moduleName: "godmods_god_visuals_natural.lua",
    module: visualModule("GOD VISUALS / NATURAL", { brightness: 1.0, sharpness: 0.145, shadow_softness: 0.58, reflection: 1.0 }),
    description: "Original, restrained Sider 3.5 graphics profile for PES 2017. Adjusts documented brightness, sharpness, player-shadow softness and reflection controls.",
    readme: "# GOD VISUALS — Natural Realism\n\nInstall this module through the manager's local package library, then synchronize Sider modules. It applies restrained, documented Sider 3.5 gfx settings at match setup. It does not inject shaders, LUTs, or proprietary EA assets. Remove the module and synchronize Sider to revert."
  },
  {
    folder: "GOD-VISUALS-CINEMATIC", id: visualConflict[1], name: "GOD CINEMATIC — Matchday",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[1]),
    moduleName: "godmods_god_cinematic.lua",
    module: visualModule("GOD CINEMATIC", { brightness: 0.985, sharpness: 0.155, shadow_softness: 0.62, reflection: 1.0 }),
    description: "Original cinematic Sider 3.5 graphics profile with restrained brightness, sharpness and shadow softness settings.",
    readme: "# GOD CINEMATIC — Matchday\n\nA subtle matchday profile using only documented Sider 3.5 gfx controls. No post-processing shader or proprietary assets are included. Remove the module and synchronize Sider to revert."
  },
  {
    folder: "GOD-VISUALS-BROADCAST", id: visualConflict[2], name: "GOD VISUALS — Broadcast Balanced",
    category: "graphics", conflicts: visualConflict.filter(id => id !== visualConflict[2]),
    moduleName: "godmods_god_visuals_broadcast.lua",
    module: visualModule("GOD VISUALS / BROADCAST", { brightness: 1.0, sharpness: 0.166, shadow_softness: 0.52, reflection: 1.0 }),
    description: "Original balanced broadcast-style Sider 3.5 graphics profile using documented PES 2017 gfx controls.",
    readme: "# GOD VISUALS — Broadcast Balanced\n\nBalanced Sider 3.5 graphics settings. This is a real Lua graphics module, not a shader replacement. Remove the module and synchronize Sider to revert."
  },
  {
    folder: "GOD-STADIUMS-SUMMER-DAY", id: conditionConflict[0], name: "GOD STADIUMS — Summer Day",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[0]),
    moduleName: "godmods_stadiums_summer_day.lua",
    module: conditionsModule("GOD STADIUMS / SUMMER DAY", { timeofday: 0, weather: 0, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: day, fine weather and summer. Does not change stadium IDs or geometry.",
    readme: "# GOD STADIUMS — Summer Day\n\nApplies documented Sider 3.5 match conditions: day, fine weather, summer. It does not add stadium models or texture replacements."
  },
  {
    folder: "GOD-STADIUMS-NIGHT", id: conditionConflict[1], name: "GOD STADIUMS — Night Match",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[1]),
    moduleName: "godmods_stadiums_night.lua",
    module: conditionsModule("GOD STADIUMS / NIGHT MATCH", { timeofday: 1, weather: 0, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: night, fine weather and summer.",
    readme: "# GOD STADIUMS — Night Match\n\nApplies documented Sider 3.5 match conditions: night, fine weather, summer. It does not add stadium models or texture replacements."
  },
  {
    folder: "GOD-STADIUMS-RAINY-EVENING", id: conditionConflict[2], name: "GOD STADIUMS — Rainy Evening",
    category: "stadiums", conflicts: conditionConflict.filter(id => id !== conditionConflict[2]),
    moduleName: "godmods_stadiums_rainy_evening.lua",
    module: conditionsModule("GOD STADIUMS / RAINY EVENING", { timeofday: 1, weather: 1, season: 0 }),
    description: "Original Sider 3.5 matchday conditions module: night, rain and summer.",
    readme: "# GOD STADIUMS — Rainy Evening\n\nApplies documented Sider 3.5 match conditions: night, rain, summer. It does not add stadium models or texture replacements."
  },
  {
    folder: "GOD-GAMEPLAY-BALANCED", id: gameplayConflict[0], name: "GOD GAMEPLAY — Balanced Simulation",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[0]),
    moduleName: "godmods_gameplay_balanced.lua",
    module: gameplayModule("GOD GAMEPLAY / BALANCED SIMULATION", [1000, 0.4, 1.0, -0.5, 0.108685933, 0.85, 0.2, 5.0]),
    description: "Opt-in Sider 3.5 gameplay library profile using documented baseline simulation values. Gameplay controls are experimental in Sider documentation.",
    readme: "# GOD GAMEPLAY — Balanced Simulation\n\nThis profile uses the documented Sider 3.5 gameplay baseline values. It is opt-in and removable. Sider labels gameplay controls experimental; test in offline matches before keeping."
  },
  {
    folder: "GOD-GAMEPLAY-GROUNDED", id: gameplayConflict[1], name: "GOD GAMEPLAY — Grounded Match",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[1]),
    moduleName: "godmods_gameplay_grounded.lua",
    module: gameplayModule("GOD GAMEPLAY / GROUNDED MATCH", [1000, 0.4, 0.985, -0.52, 0.108685933, 0.84, 0.2, 5.0]),
    description: "Opt-in conservative gameplay tuning profile; experimental Sider 3.5 gameplay controls. Test offline before keeping.",
    readme: "# GOD GAMEPLAY — Grounded Match\n\nA conservative variation around documented baseline values. Sider labels gameplay controls experimental; test passing, trapping, bounce, shooting and player movement in offline matches."
  },
  {
    folder: "GOD-GAMEPLAY-QUICK-TRANSITION", id: gameplayConflict[2], name: "GOD GAMEPLAY — Quick Transition",
    category: "gameplay", conflicts: gameplayConflict.filter(id => id !== gameplayConflict[2]),
    moduleName: "godmods_gameplay_quick_transition.lua",
    module: gameplayModule("GOD GAMEPLAY / QUICK TRANSITION", [1000, 0.4, 1.0, -0.5, 0.108685933, 0.85, 0.205, 5.0]),
    description: "Opt-in, slightly quicker player response profile; experimental Sider 3.5 gameplay controls. Test offline before keeping.",
    readme: "# GOD GAMEPLAY — Quick Transition\n\nA small movement tuning variation around documented baseline values. Sider labels gameplay controls experimental; test offline and remove if trapping or animation artifacts appear."
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
