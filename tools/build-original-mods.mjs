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

export async function buildOriginalAssets(output = OUT) {
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
  return { output, textures: records, profiles: profiles.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildOriginalAssets();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
