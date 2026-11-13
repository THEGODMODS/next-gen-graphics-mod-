#!/usr/bin/env node
/**
 * THEGODMODS original asset workshop.
 *
 * Creates deterministic, original RGBA DDS turf textures and visual profile
 * presets using only Node built-ins. These are source assets, not a claim of
 * PES 2017 compatibility: no stadium resource IDs or game-specific shader
 * mappings are guessed here. A target-specific module is a separate step.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildPremiumUpgrades } from "./build-premium-upgrades.mjs";

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

function makeGrassPixels(size, style, seed = 11, wear = 0.08) {
  const pixels = Buffer.alloc(size * size * 4);
  const palettes = {
    natural: { base: [67, 105, 49], low: [22, 34, 16], high: [38, 51, 22], stripe: 5 },
    emerald: { base: [48, 112, 54], low: [18, 34, 18], high: [43, 57, 26], stripe: 9 },
    worn: { base: [91, 105, 52], low: [32, 35, 19], high: [47, 45, 25], stripe: 2 },
  };
  const p = palettes[style];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = hash32(x, y, seed + (style === "natural" ? 11 : style === "emerald" ? 29 : 47));
    const clump = hash32(Math.floor(x / 5), Math.floor(y / 5), seed + 83);
    const mowing = Math.sin((x / size) * Math.PI * 18 + seed * 0.013) * p.stripe;
    const wearPatch = hash32(Math.floor(x / 11), Math.floor(y / 9), seed + 191) < wear ? -9 : 0;
    const broad = mowing + wearPatch;
    const variation = (grain - 0.5) * 24 + (clump - 0.5) * 16 + broad;
    const blade = hash32(x * 7 + y, y * 3 + x, seed + 131);
    const index = (y * size + x) * 4;
    pixels[index] = clamp(p.base[0] + variation * 0.8 + (blade > 0.86 ? 7 : 0));
    pixels[index + 1] = clamp(p.base[1] + variation + (blade > 0.86 ? 13 : 0));
    pixels[index + 2] = clamp(p.base[2] + variation * 0.65 + (blade > 0.86 ? 9 : 0));
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
  let state = seed >>> 0, low = 0, mid = 0, phase = 0, phase2 = 0;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = (state / 4294967295) * 2 - 1;
    const t = i / sampleRate;
    low = low * 0.992 + noise * 0.008;
    mid = mid * 0.84 + noise * 0.16;
    const high = noise - mid;
    const swell = 0.48 + 0.2 * Math.sin(2 * Math.PI * t / 5.7) + 0.12 * Math.sin(2 * Math.PI * t / 2.9);
    const frequency = mode === "whistle" ? 1750 + 90 * Math.sin(t * 8) : mode === "horn" ? 220 : 82 + 7 * Math.sin(t * 0.7);
    phase += 2 * Math.PI * frequency / sampleRate;
    phase2 += 2 * Math.PI * (frequency * (mode === "horn" ? 2.01 : 1.49)) / sampleRate;
    let sample;
    if (mode === "whistle" || mode === "horn") {
      const edge = Math.min(1, t * 18, (seconds - t) * 14);
      const tone = mode === "whistle" ? Math.sin(phase) * 0.2 : (Math.sin(phase) + Math.sin(phase2) * 0.35) * 0.15;
      sample = tone * Math.max(0, edge);
    } else {
      const crowdVoices = Math.sin(phase) * 0.045 + Math.sin(phase2) * 0.028;
      const crowdTexture = low * 0.62 + mid * 0.2 + high * 0.055;
      const distantClap = hash32(Math.floor(t * 17), seed, 991) > 0.985 ? (hash32(i, seed, 997) - 0.5) * 0.11 : 0;
      const fade = Math.min(1, t * 5, (seconds - t) * 5);
      sample = (crowdTexture * swell + crowdVoices + distantClap) * Math.max(0, fade) * 0.78;
    }
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2);
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

function makeHeightField(size, seed, wear = 0.12) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const broad = Math.sin(x / size * Math.PI * 14 + seed) * 0.16 + Math.cos(y / size * Math.PI * 11) * 0.12;
    const fine = (hash32(x, y, seed) - 0.5) * 0.34;
    const clump = (hash32(Math.floor(x / 4), Math.floor(y / 4), seed + 17) - 0.5) * 0.28;
    const scuff = hash32(Math.floor(x / 13), Math.floor(y / 13), seed + 31) < wear ? -0.2 : 0;
    h[y * size + x] = broad + fine + clump + scuff;
  }
  return h;
}
function makeNormalPixels(height, size, strength = 3.2) {
  const out = Buffer.alloc(size * size * 4);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    const i = (y * size + x) * 4;
    out[i] = clamp(((-dx * inv) * 0.5 + 0.5) * 255);
    out[i + 1] = clamp(((-dy * inv) * 0.5 + 0.5) * 255);
    out[i + 2] = clamp(inv * 255); out[i + 3] = 255;
  }
  return out;
}
function makeRoughnessPixels(height, size, base = 0.72) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = clamp((base + height[y * size + x] * 0.16) * 255);
    const i = (y * size + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255;
  }
  return out;
}
function makeLutCube(name, transform) {
  const n = 17, lines = [`TITLE "${name}"`, `LUT_3D_SIZE ${n}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) {
    const rgb = transform(r / (n - 1), g / (n - 1), b / (n - 1));
    lines.push(rgb.map(v => Math.max(0, Math.min(1, v)).toFixed(6)).join(" "));
  }
  return lines.join("\n") + "\n";
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


  const turfPremium = [
    { id: "natural-cut", style: "natural", seed: 101, wear: 0.08 },
    { id: "stadium-emerald", style: "emerald", seed: 203, wear: 0.06 },
    { id: "heritage-worn", style: "worn", seed: 307, wear: 0.28 },
    { id: "cool-climate", style: "natural", seed: 409, wear: 0.11 },
    { id: "sunlit-hybrid", style: "emerald", seed: 503, wear: 0.05 },
    { id: "matchday-striped", style: "natural", seed: 601, wear: 0.07 }
  ];
  const turfFiles = ["README.md", "surface-library.json", "pack.json"];
  const turfAssetRecords = [];
  for (const item of turfPremium) {
    const albedo = makeGrassPixels(SIZE, item.style, item.seed, item.wear);
    const height = makeHeightField(SIZE, item.seed, item.wear);
    const base = "textures/" + item.id;
    const maps = [
      ["albedo", makeDdsRgba(albedo, SIZE)],
      ["normal-source", makeDdsRgba(makeNormalPixels(height, SIZE), SIZE)],
      ["roughness-source", makeDdsRgba(makeRoughnessPixels(height, SIZE), SIZE)]
    ];
    for (const [mapName, bytes] of maps) {
      const file = base + "-" + mapName + ".dds";
      await writeFile(path.join(output, "GOD-TURF", file), bytes);
      turfFiles.push(file);
      turfAssetRecords.push({ file, width: SIZE, height: SIZE, format: "DDS RGBA8 mipmapped", bytes: bytes.length, sha256: digest(bytes) });
    }
  }
  await writeText(path.join(output, "GOD-TURF", "pack.json"), JSON.stringify({
    schemaVersion: 1, id: "thegodmods.god-turf-premium", name: "GOD TURF Premium Six-Surface Collection",
    version: "0.2.0", ownership: "THEGODMODS original procedural artwork",
    status: "source maps generated; PES material mapping and in-game validation pending",
    installable: false, textures: turfPremium.map(v => ({ ...v, maps: ["albedo", "normal-source", "roughness-source"] })),
    assets: turfAssetRecords
  }, null, 2) + "\n");
  await writeText(path.join(output, "GOD-TURF", "README.md"), "# GOD TURF — Premium Surface Lab\n\nSix original procedural pitch looks, each with albedo, derived tangent-space normal source and roughness source maps, all exported as RGBA8 DDS with full mip chains. Normal/roughness maps are source maps only: verify target PES material shader and channel convention before use.\n");
  await writeText(path.join(output, "GOD-TURF", "surface-library.json"), JSON.stringify({ schemaVersion: 1, generator: "THEGODMODS procedural surface workshop", resolution: SIZE, format: "DDS RGBA8 mipmapped", variants: turfPremium.map(v => ({ ...v, maps: ["albedo", "normal-source", "roughness-source"] })) }, null, 2) + "\n");
  await addProduct("GOD-TURF", "GOD TURF — Premium Six-Surface Collection", "stadiums", turfFiles, ["Six original pitch surface variants, each with three source maps.", "Normal/roughness maps require verified target shader channel compatibility.", "No PES resource mapping is guessed."]);

  // Stadium presentation: original sponsor-neutral LED board artwork.
  const stadiumDir = path.join(output, "GOD-STADIUMS");
  await writeText(path.join(stadiumDir, "artwork", "led-board-generic.svg"), svgDoc("GOD STADIUMS LED board", `
    <defs><linearGradient id="g"><stop stop-color="#0c2035"/><stop offset=".5" stop-color="#174c65"/><stop offset="1" stop-color="#0c2035"/></linearGradient></defs>
    <rect x="40" y="220" width="1520" height="460" rx="28" fill="url(#g)" stroke="#7de6ee" stroke-width="12"/>
    <path d="M90 270h1420v360H90z" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
    <text x="800" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="100" fill="#fff" letter-spacing="16">THE MATCHDAY</text>
    <text x="800" y="570" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" fill="#7de6ee" letter-spacing="12">GOD STADIUMS • ORIGINAL ARTWORK</text>`));
  await writeText(path.join(stadiumDir, "README.md"), "# GOD STADIUMS\n\nOriginal sponsor-neutral LED/adboard artwork. This is presentation artwork, not a stadium model or mapped PES resource. Convert to the target texture format and map only after the stadium resource is identified.\n");
  const stadiumFiles = ["artwork/led-board-generic.svg", "README.md"];
  const boardThemes = [
    ["night", "#071629", "#26c6da", "NIGHT MATCH"],
    ["cup-final", "#241a0b", "#e5bd58", "FINAL • MATCHDAY"],
    ["classic", "#17251b", "#a6d46b", "THE BEAUTIFUL GAME"],
    ["minimal", "#10151c", "#d9e2ec", "MATCHDAY"]
  ];
  for (const [id, bg, accent, headline] of boardThemes) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#0b1118"/><rect x="35" y="185" width="1530" height="530" rx="20" fill="' + bg + '" stroke="' + accent + '" stroke-width="10"/><path d="M75 225h1450v450H75z" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/><text x="800" y="465" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="104" letter-spacing="14" fill="#fff">' + headline + '</text><text x="800" y="555" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" letter-spacing="9" fill="' + accent + '">THEGODMODS • ORIGINAL STADIUM SERIES</text></svg>\n';
    await writeText(path.join(stadiumDir, "artwork", "led-board-" + id + ".svg"), svg);
    stadiumFiles.push("artwork/led-board-" + id + ".svg");
  }
  await addProduct("GOD-STADIUMS", "GOD STADIUMS — Premium Matchday Artwork Suite", "stadiums", stadiumFiles, ["Five original sponsor-neutral LED/adboard concepts.", "No club/league marks, stadium geometry or resource IDs are included."]);

  // GOD KITS is an appearance-enhancement product for existing user/patch kits,
  // not a generator of fictional club kit designs.
  const kitDir = path.join(output, "GOD-KITS");
  await writeText(path.join(kitDir, "README.md"), "# GOD KITS — Existing Kit Appearance Enhancement\n\nThis product improves the fabric/material presentation of kits already used by the player's PES 2017 patch. It does not create replacement club kits. Original fabric overlays and source maps are generated by the premium upgrade stage.\n");
  await addProduct("GOD-KITS", "GOD KITS — Existing Kit Appearance Enhancement Suite", "kits", ["README.md"], ["Enhances existing kit textures; no new club kits are supplied.", "Requires exact UV mapping and supported material channels."]);

  // Player appearance: neutral procedural skin-detail texture; no real-person likeness.
  const faceDir = path.join(output, "GOD-FACES", "textures");
  await mkdir(faceDir, { recursive: true });
  const faceFiles = [];
  const skinVariants = [
    ["neutral-skin-detail-source.dds", [174, 119, 91], 401],
    ["warm-umber-detail-source.dds", [112, 69, 48], 419],
    ["golden-olive-detail-source.dds", [190, 139, 101], 433],
    ["deep-brown-detail-source.dds", [82, 48, 36], 457]
  ];
  for (const [filename, tone, seed] of skinVariants) {
    const tex = Buffer.alloc(256 * 256 * 4);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const pore = (hash32(x, y, seed) - .5) * 9, soft = Math.sin(y / 256 * Math.PI) * 3;
      const i = (y * 256 + x) * 4;
      tex[i] = clamp(tone[0] + pore + soft); tex[i + 1] = clamp(tone[1] + pore * .78 + soft);
      tex[i + 2] = clamp(tone[2] + pore * .62 + soft); tex[i + 3] = 255;
    }
    await writeFile(path.join(faceDir, filename), makeDdsRgba(tex, 256));
    faceFiles.push("textures/" + filename);
  }
  const hair = Buffer.alloc(256 * 256 * 4);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const strand = Math.sin((x + Math.sin(y * .08) * 3) * .42) * 22;
    const noise = (hash32(x, y, 877) - .5) * 24, v = clamp(42 + strand + noise), i = (y * 256 + x) * 4;
    hair[i] = v; hair[i + 1] = clamp(v * .91); hair[i + 2] = clamp(v * .78); hair[i + 3] = 255;
  }
  await writeFile(path.join(faceDir, "procedural-hair-detail-source.dds"), makeDdsRgba(hair, 256));
  faceFiles.push("textures/procedural-hair-detail-source.dds");
  await writeText(path.join(output, "GOD-FACES", "README.md"), "# GOD FACES\n\nOriginal neutral procedural skin-detail source texture only. It is not a face model, a real-player likeness, or a complete face replacement. No player IDs are assigned. A licensed/commissioned model, UV layout and roster mapping are needed for a full player appearance mod.\n");
  faceFiles.push("README.md");
  await addProduct("GOD-FACES", "GOD FACES — Procedural Appearance Texture Kit", "players", faceFiles, ["Four original procedural skin-tone source textures and one hair-detail source texture.", "These are texture sources only, not face meshes, real-player likenesses or roster assignments."]);

  // Audio: synthesized original crowd bed and horn tone, no sampled chants or anthems.
  const audioDir = path.join(output, "GOD-ATMOSPHERE", "audio");
  await mkdir(audioDir, { recursive: true });
  await writeFile(path.join(audioDir, "synthetic-crowd-bed.wav"), wavTone({ seconds: 12, seed: 73, mode: "crowd" }));
  await writeFile(path.join(audioDir, "synthetic-matchday-horn.wav"), wavTone({ seconds: 4, seed: 91, mode: "horn" }));
  await writeFile(path.join(audioDir, "synthetic-crowd-swell.wav"), wavTone({ seconds: 10, seed: 137, mode: "crowd" }));
  await writeFile(path.join(audioDir, "synthetic-stadium-bed-alt.wav"), wavTone({ seconds: 12, seed: 211, mode: "crowd" }));
  await writeFile(path.join(audioDir, "synthetic-whistle-tone.wav"), wavTone({ seconds: 2, seed: 313, mode: "whistle", sampleRate: 32000 }));
  await writeText(path.join(output, "GOD-ATMOSPHERE", "README.md"), "# GOD ATMOSPHERE\n\nOriginal synthesized ambience and tonal matchday horn. These are not club anthems, recorded supporter chants or commentary. Audio-event codec conversion, volume mastering and PES event mapping remain to be configured and tested.\n");
  await addProduct("GOD-ATMOSPHERE", "GOD ATMOSPHERE — Original Matchday Sound Suite", "audio", ["audio/synthetic-crowd-bed.wav", "audio/synthetic-crowd-swell.wav", "audio/synthetic-stadium-bed-alt.wav", "audio/synthetic-matchday-horn.wav", "audio/synthetic-whistle-tone.wav", "README.md"], ["All sounds are generated procedurally; no recordings or copyrighted compositions are sampled.", "No PES audio event IDs are guessed."]);

  // Gameplay: conservative, documented tuning profile plus a no-op Lua integration stub.
  const gameplayDir = path.join(output, "GOD-GAMEPLAY");
  await writeText(path.join(gameplayDir, "profiles", "simulation-balanced.json"), JSON.stringify({
    schemaVersion: 1, name: "GOD GAMEPLAY — Simulation Balanced", target: "PES 2017 tuning design profile",
    status: "design profile only; no engine parameters are applied automatically",
    principles: { matchTempo: "measured", playerAcceleration: "avoid_artificial_burst", ballResponse: "preserve_contextual_variation", cpuTactics: "retain_team_identity", fouls: "test_before_tuning" },
    validationScenarios: ["slow build-up vs high press", "counter attack transition", "loose ball and rebound", "physical duel and foul frequency", "extra time fatigue and substitutions"]
  }, null, 2) + "\n");
  const gameplayFiles = ["profiles/simulation-balanced.json", "lua/god_gameplay_status.lua", "README.md"];
  const gameplayProfiles = [
    ["possession-control", { tempo: "patient", pressing: "situational", passingRisk: "measured", fatigue: "baseline" }],
    ["high-intensity", { tempo: "fast", pressing: "aggressive", passingRisk: "direct", fatigue: "increased" }],
    ["classic-simulation", { tempo: "measured", pressing: "balanced", passingRisk: "contextual", fatigue: "baseline" }]
  ];
  for (const [id, settings] of gameplayProfiles) { const file = "profiles/" + id + ".json"; await writeText(path.join(gameplayDir, file), JSON.stringify({ schemaVersion: 1, id, settings, status: "design profile only; requires supported gameplay adapter and scenario validation" }, null, 2) + "\n"); gameplayFiles.push(file); }
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
  await addProduct("GOD-GAMEPLAY", "GOD GAMEPLAY — Three-Style Simulation Profiles", "gameplay", gameplayFiles, ["No undocumented executable hooks or memory patches.", "Lua stub is safe and does not alter gameplay."]);


  const visualProfiles = [
    { id: "broadcast-neutral", title: "GOD VISUALS — Broadcast Neutral", saturation: 1.02, contrast: 1.035, exposure: 0, warmth: 0, bloom: 0.025, sharpen: 0.06 },
    { id: "natural-realism", title: "GOD NATURAL — Natural Realism", saturation: 0.96, contrast: 1.015, exposure: 0, warmth: -0.01, bloom: 0.01, sharpen: 0.025 },
    { id: "cinematic-matchday", title: "GOD CINEMATIC — Matchday Film", saturation: 0.94, contrast: 1.075, exposure: -0.015, warmth: 0.015, bloom: 0.07, sharpen: 0.04 },
    { id: "european-evening", title: "GOD VISUALS — European Evening", saturation: 0.99, contrast: 1.06, exposure: -0.01, warmth: -0.005, bloom: 0.055, sharpen: 0.05 },
    { id: "sunlit-daylight", title: "GOD NATURAL — Sunlit Daylight", saturation: 0.98, contrast: 1.025, exposure: 0.015, warmth: 0.012, bloom: 0.02, sharpen: 0.035 },
    { id: "overcast-realism", title: "GOD VISUALS — Overcast Realism", saturation: 0.97, contrast: 1.045, exposure: -0.005, warmth: -0.012, bloom: 0.015, sharpen: 0.045 }
  ];
  const lutDir = path.join(output, "GOD-VISUALS", "luts");
  await mkdir(lutDir, { recursive: true });
  const lutFiles = [];
  for (const profile of visualProfiles) {
    const cube = makeLutCube(profile.id, (r, g, b) => {
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const grade = v => (v - 0.5) * profile.contrast + 0.5 + profile.exposure;
      const sat = v => luma + (v - luma) * profile.saturation;
      return [sat(grade(r) + profile.warmth * (1 - luma)), sat(grade(g)), sat(grade(b) - profile.warmth * (1 - luma))];
    });
    const file = profile.id + ".cube";
    await writeText(path.join(lutDir, file), cube);
    lutFiles.push("luts/" + file);
  }
  await writeText(path.join(output, "GOD-VISUALS", "profiles.json"), JSON.stringify({
    schemaVersion: 1, ownership: "THEGODMODS original creative presets",
    status: "creative-presets-authored; engine adapter and in-game validation pending",
    installable: false, profiles: visualProfiles, lutFormat: "17-point .cube 3D LUT",
    note: "LUTs are authored source grades. Confirm supported post-processing adapter and colour-space before use."
  }, null, 2) + "\n");
  await writeText(path.join(output, "GOD-VISUALS", "README.md"), "# GOD VISUALS — Premium Colour Lab\n\nSix original creative profiles and six 17³ .cube 3D LUTs. These are source grades, not an installer-specific shader preset. Confirm a compatible colour-management adapter and input/output colour space before use.\n");
  await addProduct("GOD-VISUALS", "GOD VISUALS — Six Original Colour Profiles & LUTs", "graphics", ["profiles.json", "README.md", ...lutFiles], ["Six original 17³ 3D LUT source grades and matching profile metadata.", "No unsupported shader settings are written automatically."]);

  await writeText(path.join(output, "README.md"), `# THEGODMODS Original Content Library\n\nGenerated by ` + "`npm run mods:build-original`" + `.\n\nAll six departments have original source deliverables. These are content-authoring outputs, not all game-ready replacements. See each department README and package.json for exact scope and compatibility gates.\n`);
  await writeText(path.join(output, "catalogue.json"), JSON.stringify({
    schemaVersion: 1, title: "THEGODMODS Original Content Collection", version: "0.1.0",
    status: "six-department source collection; game integration pending",
    products: products.map(p => ({ id: p.id, name: p.name, department: p.department, version: p.version, files: p.files.length, installable: p.installable }))
  }, null, 2) + "\n");
  return products;
}

export async function buildOriginalAssets(output = OUT) {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const products = await buildSixDepartments(output);
  return { output, products, departments: [...new Set(products.map(product => product.department))] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildOriginalAssets();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
