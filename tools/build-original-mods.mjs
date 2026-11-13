#!/usr/bin/env node
/**
 * THEGODMODS original asset workshop.
 *
 * Creates deterministic, original RGBA DDS turf textures and visual profile
 * presets using only Node built-ins. These are source assets, not a claim of
 * PES 2017 compatibility: no stadium resource IDs or game-specific shader
 * mappings are guessed here. A target-specific module is a separate step.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", "originals", "generated");
const SIZE = 512;

function hash32(x, y, seed) {
  let n = (Math.imul(x + seed, 0x45d9f3b) ^ Math.imul(y + seed * 3, 0x119de1f3)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function makeGrassPixels(size, style) {
  const pixels = Buffer.alloc(size * size * 4);
  const palettes = {
    natural: { base: [67, 105, 49], low: [22, 34, 16], high: [38, 51, 22], stripe: 5 },
    emerald: { base: [48, 112, 54], low: [18, 34, 18], high: [43, 57, 26], stripe: 9 },
    worn: { base: [91, 105, 52], low: [32, 35, 19], high: [47, 45, 25], stripe: 2 },
  };
  const p = palettes[style];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = hash32(x, y, style === "natural" ? 11 : style === "emerald" ? 29 : 47);
    const clump = hash32(Math.floor(x / 5), Math.floor(y / 5), 83);
    const broad = Math.sin((x / size) * Math.PI * 8) * p.stripe;
    const variation = (grain - 0.5) * 24 + (clump - 0.5) * 16 + broad;
    const blade = hash32(x * 7 + y, y * 3 + x, 131);
    const index = (y * size + x) * 4;
    pixels[index] = clamp(p.base[2] + variation * 0.65 + (blade > 0.86 ? 9 : 0));
    pixels[index + 1] = clamp(p.base[1] + variation + (blade > 0.86 ? 13 : 0));
    pixels[index + 2] = clamp(p.base[0] + variation * 0.8 + (blade > 0.86 ? 7 : 0));
    pixels[index + 3] = 255;
  }
  return pixels;
}
function downsample(src, size) {
  const nextSize = Math.max(1, size >> 1);
  const dst = Buffer.alloc(nextSize * nextSize * 4);
  for (let y = 0; y < nextSize; y++) for (let x = 0; x < nextSize; x++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
        sum += src[(((y * 2 + dy) * size + x * 2 + dx) * 4) + c];
      dst[(y * nextSize + x) * 4 + c] = Math.round(sum / 4);
    }
  }
  return { pixels: dst, size: nextSize };
}
function makeDdsRgba(base, size) {
  const levels = [base];
  let current = base, currentSize = size;
  while (currentSize > 1) {
    const next = downsample(current, currentSize);
    levels.push(next.pixels); current = next.pixels; currentSize = next.size;
  }
  const header = Buffer.alloc(128);
  header.write("DDS ", 0, "ascii");
  header.writeUInt32LE(124, 4);
  header.writeUInt32LE(0x0002100f, 8); // CAPS | HEIGHT | WIDTH | PITCH | PIXELFORMAT | MIPMAPCOUNT
  header.writeUInt32LE(size, 12);
  header.writeUInt32LE(size, 16);
  header.writeUInt32LE(size * 4, 20);
  header.writeUInt32LE(0, 24);
  header.writeUInt32LE(levels.length, 28);
  header.writeUInt32LE(32, 76);
  header.writeUInt32LE(0x41, 80); // RGB | ALPHAPIXELS
  header.writeUInt32LE(0, 84); // no FourCC: uncompressed
  header.writeUInt32LE(32, 88);
  header.writeUInt32LE(0x00ff0000, 92); // R
  header.writeUInt32LE(0x0000ff00, 96); // G
  header.writeUInt32LE(0x000000ff, 100); // B
  header.writeUInt32LE(0xff000000, 104); // A
  header.writeUInt32LE(0x00401008, 108); // texture | complex | mipmap
  header.writeUInt32LE(0, 112);
  header.writeUInt32LE(0, 116);
  header.writeUInt32LE(0, 120);
  header.writeUInt32LE(0, 124);
  return Buffer.concat([header, ...levels]);
}
function digest(buffer) { return createHash("sha256").update(buffer).digest("hex"); }



// ---- Six-department original content production ---------------------------
function svgDoc(title, body, background = "#101820") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><title>${title}</title><rect width="1600" height="900" fill="${background}"/>${body}</svg>\n`;
}
async function writeText(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
}
function wavTone({ seconds = 8, sampleRate = 22050, seed = 1, mode = "crowd" } = {}) {
  const count = seconds * sampleRate, data = Buffer.alloc(count * 2);
  let state = seed >>> 0, lp = 0, phase = 0;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = ((state / 4294967295) * 2 - 1);
    const t = i / sampleRate;
    const swell = 0.35 + 0.25 * Math.sin(2 * Math.PI * t / 5.7) + 0.12 * Math.sin(2 * Math.PI * t / 2.9);
    lp = lp * 0.965 + noise * 0.035;
    phase += 2 * Math.PI * (mode === "horn" ? 220 : 82 + 7 * Math.sin(t * 0.7)) / sampleRate;
    const tonal = mode === "horn" ? Math.sin(phase) * 0.15 : (Math.sin(phase) + Math.sin(phase * 1.49) * 0.35) * 0.045;
    const sample = Math.max(-1, Math.min(1, (lp * swell * 0.75 + tonal) * 0.72));
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
function kitSvg(name, base, accent, pattern) {
  const patternBody = pattern === "hoops"
    ? '<path d="M520 240h560v90H520zm0 180h560v90H520zm0 180h560v90H520z" fill="' + accent + '" opacity=".85"/>'
    : pattern === "sash"
      ? '<path d="M500 650 970 220h170L670 650z" fill="' + accent + '" opacity=".9"/>'
      : '<path d="M520 250h560v30H520zm0 80h560v18H520zm0 240h560v18H520z" fill="' + accent + '" opacity=".75"/>';
  return svgDoc(name, `
    <g stroke="#d8e0e8" stroke-width="14" stroke-linejoin="round">
      <path d="M560 230 420 300 300 470l145 95 95-120v360h520V445l95 120 145-95-120-170-140-70-95 80H655z" fill="${base}"/>
      ${patternBody}
      <path d="M655 230q145 125 290 0" fill="none" stroke="${accent}" stroke-width="24"/>
      <path d="M445 735h710" stroke="${accent}" stroke-width="12"/>
    </g>
    <text x="800" y="820" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="42" letter-spacing="8">THEGODMODS • ${name}</text>`, "#0c1218");
}
async function buildSixDepartments(output) {
  const products = [];
  const addProduct = async (id, name, department, files, notes) => {
    const entries = [];
    for (const file of files) {
      const bytes = await (await import("node:fs/promises")).readFile(path.join(output, id, file));
      entries.push({ file, bytes: bytes.length, sha256: digest(bytes) });
    }
    const record = { schemaVersion: 1, id: "thegodmods." + id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name, department, version: "0.1.0", ownership: "THEGODMODS original generated content", status: "assets-generated; target-game integration and validation pending", installable: false, files: entries, notes };
    await writeText(path.join(output, id, "package.json"), JSON.stringify(record, null, 2) + "\n");
    products.push(record);
  };

  // Stadium presentation: original sponsor-neutral LED board artwork.
  const stadiumDir = path.join(output, "GOD-STADIUMS");
  await writeText(path.join(stadiumDir, "artwork", "led-board-generic.svg"), svgDoc("GOD STADIUMS LED board", `
    <defs><linearGradient id="g"><stop stop-color="#0c2035"/><stop offset=".5" stop-color="#174c65"/><stop offset="1" stop-color="#0c2035"/></linearGradient></defs>
    <rect x="40" y="220" width="1520" height="460" rx="28" fill="url(#g)" stroke="#7de6ee" stroke-width="12"/>
    <path d="M90 270h1420v360H90z" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
    <text x="800" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="100" fill="#fff" letter-spacing="16">THE MATCHDAY</text>
    <text x="800" y="570" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" fill="#7de6ee" letter-spacing="12">GOD STADIUMS • ORIGINAL ARTWORK</text>`));
  await writeText(path.join(stadiumDir, "README.md"), "# GOD STADIUMS\n\nOriginal sponsor-neutral LED/adboard artwork. This is presentation artwork, not a stadium model or mapped PES resource. Convert to the target texture format and map only after the stadium resource is identified.\n");
  await addProduct("GOD-STADIUMS", "GOD STADIUMS — Matchday Presentation Artwork", "stadiums", ["artwork/led-board-generic.svg", "README.md"], ["No club, league or sponsor marks are included.", "No stadium IDs or LiveCPK paths are assumed."]);

  // Kit concepts: generic, fictional, sponsor-free design plates, not licensed team kits.
  const kitDir = path.join(output, "GOD-KITS");
  const kitFiles = [];
  const kits = [
    ["concept-01-home.svg", "Concept 01 Home", "#f2f4f6", "#163c72", "hoops"],
    ["concept-02-away.svg", "Concept 02 Away", "#15202d", "#e6b84b", "sash"],
    ["concept-03-third.svg", "Concept 03 Third", "#6d1e36", "#f1e9df", "stripes"],
    ["concept-04-keeper.svg", "Concept 04 Keeper", "#c5a93a", "#182b24", "hoops"]
  ];
  for (const [file, name, base, accent, pattern] of kits) {
    await writeText(path.join(kitDir, "designs", file), kitSvg(name, base, accent, pattern));
    kitFiles.push("designs/" + file);
  }
  await writeText(path.join(kitDir, "README.md"), "# GOD KITS\n\nFour original fictional, sponsor-free kit design plates. They are editable concept artwork, not ready-made PES kit textures and are not assigned to real clubs. UV template conversion, kit-server slot mapping and in-game review are required before installation.\n");
  kitFiles.push("README.md");
  await addProduct("GOD-KITS", "GOD KITS — Original Fictional Design Collection", "kits", kitFiles, ["No real club crests, manufacturer marks, sponsors or fonts.", "Design plates require conversion to a verified kit UV template."]);

  // Player appearance: neutral procedural skin-detail texture; no real-person likeness.
  const faceDir = path.join(output, "GOD-FACES", "textures");
  await mkdir(faceDir, { recursive: true });
  const skin = Buffer.alloc(256 * 256 * 4);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = (hash32(x, y, 401) - .5) * 10 + Math.sin(y / 256 * Math.PI) * 5;
    const i = (y * 256 + x) * 4;
    skin[i] = clamp(174 + n); skin[i + 1] = clamp(119 + n * .8); skin[i + 2] = clamp(91 + n * .65); skin[i + 3] = 255;
  }
  const faceDds = makeDdsRgba(skin, 256);
  await writeFile(path.join(faceDir, "neutral-skin-detail-source.dds"), faceDds);
  await writeText(path.join(output, "GOD-FACES", "README.md"), "# GOD FACES\n\nOriginal neutral procedural skin-detail source texture only. It is not a face model, a real-player likeness, or a complete face replacement. No player IDs are assigned. A licensed/commissioned model, UV layout and roster mapping are needed for a full player appearance mod.\n");
  await addProduct("GOD-FACES", "GOD FACES — Neutral Appearance Source", "players", ["textures/neutral-skin-detail-source.dds", "README.md"], ["Generic procedural texture only; not a human likeness.", "No player ID, face mesh or roster mapping is included."]);

  // Audio: synthesized original crowd bed and horn tone, no sampled chants or anthems.
  const audioDir = path.join(output, "GOD-ATMOSPHERE", "audio");
  await mkdir(audioDir, { recursive: true });
  await writeFile(path.join(audioDir, "synthetic-crowd-bed.wav"), wavTone({ seconds: 12, seed: 73, mode: "crowd" }));
  await writeFile(path.join(audioDir, "synthetic-matchday-horn.wav"), wavTone({ seconds: 4, seed: 91, mode: "horn" }));
  await writeText(path.join(output, "GOD-ATMOSPHERE", "README.md"), "# GOD ATMOSPHERE\n\nOriginal synthesized ambience and tonal matchday horn. These are not club anthems, recorded supporter chants or commentary. Audio-event codec conversion, volume mastering and PES event mapping remain to be configured and tested.\n");
  await addProduct("GOD-ATMOSPHERE", "GOD ATMOSPHERE — Synthetic Matchday Audio", "audio", ["audio/synthetic-crowd-bed.wav", "audio/synthetic-matchday-horn.wav", "README.md"], ["All sounds are generated procedurally; no recordings or copyrighted compositions are sampled.", "No PES audio event IDs are guessed."]);

  // Gameplay: conservative, documented tuning profile plus a no-op Lua integration stub.
  const gameplayDir = path.join(output, "GOD-GAMEPLAY");
  await writeText(path.join(gameplayDir, "profiles", "simulation-balanced.json"), JSON.stringify({
    schemaVersion: 1, name: "GOD GAMEPLAY — Simulation Balanced", target: "PES 2017 tuning design profile",
    status: "design profile only; no engine parameters are applied automatically",
    principles: { matchTempo: "measured", playerAcceleration: "avoid_artificial_burst", ballResponse: "preserve_contextual_variation", cpuTactics: "retain_team_identity", fouls: "test_before_tuning" },
    validationScenarios: ["slow build-up vs high press", "counter attack transition", "loose ball and rebound", "physical duel and foul frequency", "extra time fatigue and substitutions"]
  }, null, 2) + "\n");
  await writeText(path.join(gameplayDir, "lua", "god_gameplay_status.lua"), `-- THEGODMODS GOD GAMEPLAY integration placeholder.
-- This module deliberately makes no undocumented game-engine calls.
-- Add behavior only against a verified Sider/Lua API and tested PES 2017 build.
local M = {}
function M.init(ctx)
  if ctx and ctx.log then ctx.log("GOD GAMEPLAY: safe profile loaded; no engine hooks registered") end
end
return M
`);
  await writeText(path.join(gameplayDir, "README.md"), "# GOD GAMEPLAY\n\nIncludes a complete design/QA profile and a safe Lua module stub. It does not change physics, AI or executable memory. Real gameplay behavior requires documented supported hooks and repeatable in-game tests; unsupported memory patches are intentionally not fabricated.\n");
  await addProduct("GOD-GAMEPLAY", "GOD GAMEPLAY — Simulation Design Profile", "gameplay", ["profiles/simulation-balanced.json", "lua/god_gameplay_status.lua", "README.md"], ["No undocumented executable hooks or memory patches.", "Lua stub is safe and does not alter gameplay."]);

  // Graphics documentation and creative presets already generated above.
  await writeText(path.join(output, "GOD-VISUALS", "README.md"), "# GOD VISUALS / GOD NATURAL / GOD CINEMATIC\n\nSee profiles.json for three original visual directions. Values are creative targets, not an engine-specific ReShade/Sider configuration. A verified adapter and visual comparison on PES 2017 are required before enabling automatic installation.\n");
  await addProduct("GOD-VISUALS", "GOD VISUALS — Original Visual Profile Collection", "graphics", ["profiles.json", "README.md"], ["Creative preset values only; no unsupported shader settings are written."]);

  await writeText(path.join(output, "README.md"), `# THEGODMODS Original Content Library\n\nGenerated by ` + "`npm run mods:build-original`" + `.\n\nAll six departments have original source deliverables. These are content-authoring outputs, not all game-ready replacements. See each department README and package.json for exact scope and compatibility gates.\n`);
  await writeText(path.join(output, "catalogue.json"), JSON.stringify({
    schemaVersion: 1, title: "THEGODMODS Original Content Collection", version: "0.1.0",
    status: "six-department source collection; game integration pending",
    products: products.map(p => ({ id: p.id, name: p.name, department: p.department, version: p.version, files: p.files.length, installable: p.installable }))
  }, null, 2) + "\n");
  return products;
}
\nexport async function buildOriginalAssets(output = OUT) {
  const turfDir = path.join(output, "GOD-TURF", "textures");
  const visualsDir = path.join(output, "GOD-VISUALS");
  await mkdir(turfDir, { recursive: true });
  await mkdir(visualsDir, { recursive: true });
  const variants = [
    { id: "natural-cut", title: "Natural Cut", style: "natural", description: "Balanced natural grass with restrained variation." },
    { id: "stadium-emerald", title: "Stadium Emerald", style: "emerald", description: "Richer broadcast-ready green with controlled mowing variation." },
    { id: "heritage-worn", title: "Heritage Worn", style: "worn", description: "Subtle worn-in pitch palette for a grounded matchday look." },
  ];
  const records = [];
  for (const variant of variants) {
    const dds = makeDdsRgba(makeGrassPixels(SIZE, variant.style), SIZE);
    const filename = variant.id + ".dds";
    await writeFile(path.join(turfDir, filename), dds);
    records.push({ ...variant, file: "textures/" + filename, width: SIZE, height: SIZE, format: "DDS RGBA8 with full mip chain", bytes: dds.length, sha256: digest(dds) });
  }
  const turfPack = {
    schemaVersion: 1,
    id: "thegodmods.god-turf-originals",
    name: "GOD TURF — Original Surface Collection",
    version: "0.1.0",
    ownership: "THEGODMODS original procedural artwork",
    status: "source-assets-generated; game mapping and compatibility not yet validated",
    game: "PES 2017 target pending resource inventory",
    installable: false,
    textures: records,
    notes: ["Original procedural textures; no extracted PES or third-party files.", "RGBA8 DDS is provided as a source/export format. Confirm target shader and DDS format support before deployment.", "No stadium resource paths are invented. Build a game-specific module only after a verified pitch inventory."],
  };
  await writeFile(path.join(output, "GOD-TURF", "pack.json"), JSON.stringify(turfPack, null, 2) + "\n");
  const profiles = [
    { id: "god-visuals-balanced", title: "GOD VISUALS — Balanced Broadcast", values: { saturation: 1.03, contrast: 1.04, exposure: 0.0, sharpening: 0.08, bloom: 0.06, whiteBalanceKelvin: 6500 }, note: "Neutral broadcast balance; values are creative targets, not asserted game-engine controls." },
    { id: "god-natural-neutral", title: "GOD NATURAL — Neutral Realism", values: { saturation: 0.96, contrast: 1.01, exposure: 0.0, sharpening: 0.03, bloom: 0.02, whiteBalanceKelvin: 6500 }, note: "Restrained processing and neutral colour direction." },
    { id: "god-cinematic-matchday", title: "GOD CINEMATIC — Matchday Film", values: { saturation: 0.94, contrast: 1.08, exposure: -0.02, sharpening: 0.05, bloom: 0.09, whiteBalanceKelvin: 6100 }, note: "Subtle filmic contrast without extreme tint or crushed shadows." },
  ];
  await writeFile(path.join(visualsDir, "profiles.json"), JSON.stringify({
    schemaVersion: 1, ownership: "THEGODMODS original creative presets",
    status: "creative-presets-authored; engine adapter and in-game validation pending",
    installable: false, profiles,
  }, null, 2) + "\n");
  const products = await buildSixDepartments(output);\n  return { output, textures: records, profiles: profiles.length, products };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildOriginalAssets();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
