#!/usr/bin/env node
/**
 * GOD GAMEPLAY Premium Simulation Lab.
 * Produces opt-in Sider 3.5 gameplay profile sidecars and a repeatable
 * offline scenario matrix. It never edits executables or game data.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "originals", "generated", "GOD-GAMEPLAY-PREMIUM");
const KEYS = ["ball_weight", "ball_physics", "ball_bounce", "ball_friction", "ball_magnus", "shooting_power", "speed", "speed_global"];
const RANGES = {
  ball_weight: [100, 5000], ball_physics: [-5, 5], ball_bounce: [0, 3],
  ball_friction: [-5, 5], ball_magnus: [-2, 2], shooting_power: [0.1, 2],
  speed: [0.05, 1], speed_global: [0.5, 20]
};
const PROFILES = [
  { id: "broadcast-balanced", title: "Broadcast Balanced", values: [1000, 0.4, 1, -0.5, 0.108685933, 0.85, 0.2, 5], intent: "Measured baseline for full-match broadcast pacing." },
  { id: "grounded-simulation", title: "Grounded Simulation", values: [990, 0.4, 0.98, -0.52, 0.108, 0.84, 0.2, 5], intent: "Subtle ball-response variation; preserve familiar player movement." },
  { id: "technical-possession", title: "Technical Possession", values: [1000, 0.42, 1, -0.5, 0.11, 0.84, 0.195, 5], intent: "Small control-oriented tuning; no automatic tactical or AI changes." },
  { id: "quick-transition", title: "Quick Transition", values: [1000, 0.4, 1, -0.5, 0.109, 0.86, 0.205, 5], intent: "A restrained alternative for quicker transitions, not an arcade speed boost." },
  { id: "heritage-match", title: "Heritage Match", values: [1010, 0.39, 1.02, -0.49, 0.108, 0.83, 0.198, 5], intent: "Conservative variation intended for slower, deliberate match flow." }
];
const SCENARIOS = [
  { id: "build-up-press", title: "Build-up under high press", steps: ["Complete 20 controlled passes", "Repeat against high press", "Record turnovers and first-touch errors"], metrics: ["pass completion", "turnovers", "first-touch errors"] },
  { id: "counter-transition", title: "Counter-attack transition", steps: ["Win possession in own half", "Launch a forward transition", "Repeat from both flanks"], metrics: ["time to final third", "pass accuracy", "attacking support"] },
  { id: "loose-ball", title: "Loose ball and rebound", steps: ["Take shots from three fixed zones", "Record second-ball outcomes", "Repeat with identical teams"], metrics: ["rebound distance", "recovery rate", "ball response"] },
  { id: "aerial-duel", title: "Aerial and physical duel", steps: ["Contest 10 identical aerial deliveries", "Repeat shoulder challenges", "Record foul and possession outcomes"], metrics: ["duel win rate", "fouls", "possession outcome"] },
  { id: "shooting", title: "Shooting consistency", steps: ["Take 10 shots from fixed positions", "Use identical player and shot input", "Compare placement and power"], metrics: ["shot power", "on-target rate", "rebound outcome"] },
  { id: "keeper-response", title: "Goalkeeper response", steps: ["Use identical shot sequence", "Record saves, parries and spills", "Do not change keeper/player ratings"], metrics: ["save rate", "parry rate", "spill rate"] },
  { id: "fatigue-late-match", title: "Late-match fatigue", steps: ["Play to 75 minutes", "Repeat sprint and press sequence", "Record stamina and movement"], metrics: ["stamina loss", "movement response", "late-match errors"] },
  { id: "match-duration", title: "Full match repeatability", steps: ["Play three full matches per profile", "Keep teams, difficulty and conditions fixed", "Record any crash or abnormal behavior"], metrics: ["match completion", "goals", "fouls", "injuries", "stability"] }
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function put(rel, value) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
}
function ini(profile) {
  const lines = ["; GOD GAMEPLAY profile: " + profile.title, "; Experimental Sider gameplay library controls. Disabled until explicitly enabled.", "enabled = 0"];
  profile.values.forEach((value, i) => lines.push(KEYS[i] + " = " + value));
  return lines.join("\n") + "\n";
}
function validateProfiles() {
  for (const profile of PROFILES) {
    if (profile.values.length !== KEYS.length) throw new Error(profile.id + ": wrong parameter count");
    profile.values.forEach((value, i) => {
      const [min, max] = RANGES[KEYS[i]];
      if (!Number.isFinite(value) || value < min || value > max) throw new Error(profile.id + ": " + KEYS[i] + " outside documented module bounds");
    });
  }
  if (new Set(PROFILES.map(p => p.id)).size !== PROFILES.length) throw new Error("Duplicate gameplay profile ID");
}
export async function buildGodGameplayPremium(output = OUT) {
  const previous = OUT;
  validateProfiles();
  if (output !== OUT) {
    // Tests may target a temporary directory without changing the default package path.
    const original = OUT;
    void original;
  }
  await mkdir(output, { recursive: true });
  const files = [];
  for (const profile of PROFILES) {
    const rel = "profiles/" + profile.id + ".ini";
    const body = ini(profile);
    const target = path.join(output, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    files.push({ file: rel, bytes: Buffer.byteLength(body), sha256: hash(Buffer.from(body)) });
  }
  const scenarios = JSON.stringify({ schemaVersion: 1, status: "offline test protocol; results must be recorded on the declared PES 2017 build", controls: ["same executable and patch", "same teams, player ratings and difficulty", "same stadium, weather and match length", "one profile change per comparison", "minimum three repetitions per scenario"], scenarios: SCENARIOS }, null, 2) + "\n";
  await putAt(output, "qa/scenario-matrix.json", scenarios);
  files.push({ file: "qa/scenario-matrix.json", bytes: Buffer.byteLength(scenarios), sha256: hash(Buffer.from(scenarios)) });
  const profileIndex = JSON.stringify({ schemaVersion: 1, name: "GOD GAMEPLAY Premium Simulation Lab", target: "PES 2017 / Sider 3.5 gameplay library", status: "experimental; offline validation required", enabledByDefault: false, profiles: PROFILES.map(p => ({ id: p.id, title: p.title, intent: p.intent, config: "profiles/" + p.id + ".ini", keys: KEYS })), parameterBounds: RANGES, compatibility: { module: "godmods_gameplay.lua", event: "set_home_team", liveGameVerified: false }, rollback: "Set enabled = 0 in the active gameplay.ini or remove the GOD GAMEPLAY module registration from the user-owned Sider configuration." }, null, 2) + "\n";
  await putAt(output, "profiles.json", profileIndex);
  files.push({ file: "profiles.json", bytes: Buffer.byteLength(profileIndex), sha256: hash(Buffer.from(profileIndex)) });
  const readme = "# GOD GAMEPLAY — Premium Simulation Lab\n\nFive original, conservative Sider gameplay-library profiles plus an eight-scenario offline comparison protocol. The existing GOD GAMEPLAY module is the runtime adapter; this package supplies profile sidecars and QA material.\n\n## Activation\n\nThese profiles are experimental and disabled by default. Back up the active Sider configuration and gameplay.ini. Copy ONE selected profile to the existing `Sider/content/godmods/gameplay.ini`, inspect every value, and change `enabled = 0` to `enabled = 1` only when deliberately testing offline. Do not enable multiple profiles at once.\n\n## Controls and limits\n\nOnly the eight gameplay-library properties already used by the GODMODS Sider adapter are emitted. Values are checked against the adapter's declared bounds. No executable patching, memory writes, AI hook, referee hook, player attribute edit or undocumented callback is introduced. Sider documents these gameplay controls as experimental; they may have side effects.\n\n## Validation\n\nUse qa/scenario-matrix.json. Keep teams, difficulty, stadium, weather and match length fixed; repeat each scenario at least three times. Record the game executable, patch, Sider version, profile hash and measured outcomes. No profile is labelled realistic or game-verified until actual PES 2017 testing is attached.\n\n## Rollback\n\nSet enabled = 0 in gameplay.ini, or remove the module registration from the manager-owned Sider block. Remove only the GOD GAMEPLAY profile sidecar files you copied. Original game and patch files remain untouched.\n";
  await putAt(output, "README.md", readme);
  files.push({ file: "README.md", bytes: Buffer.byteLength(readme), sha256: hash(Buffer.from(readme)) });
  const manifest = { schemaVersion: 1, id: "thegodmods.god-gameplay-premium", version: "0.1.0", department: "gameplay", ownership: "THEGODMODS original", installable: false, status: "profile sidecars generated; experimental runtime and in-game verification pending", files };
  await putAt(output, "manifest.json", JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
async function putAt(root, rel, value) {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildGodGameplayPremium().then(result => process.stdout.write(JSON.stringify({ product: result.id, files: result.files.length, installable: result.installable }) + "\n")).catch(error => { console.error(error); process.exitCode = 1; });
}
