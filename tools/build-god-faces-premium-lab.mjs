#!/usr/bin/env node
/**
 * GOD FACES Premium Appearance Lab.
 * Creates original, neutral skin/hair micro-detail source maps only.
 * No likenesses, meshes, roster IDs, UV assumptions or game resource paths.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = path.resolve(process.argv[2] || path.join(ROOT, "content/originals/generated/GOD-FACES-PREMIUM"));
const SIZE = 512;
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hash = (x, y, seed) => {
  let n = (Math.imul(x + seed, 0x45d9f3b) ^ Math.imul(y + seed * 17, 0x119de1f3)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function writeDds(pixels) {
  const levels = [pixels];
  let current = pixels, width = SIZE;
  while (width > 1) {
    const nextWidth = width >> 1;
    const next = Buffer.alloc(nextWidth * nextWidth * 4);
    for (let y = 0; y < nextWidth; y++) for (let x = 0; x < nextWidth; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          sum += current[(((y * 2 + dy) * width + x * 2 + dx) * 4) + c];
        }
        next[(y * nextWidth + x) * 4 + c] = Math.round(sum / 4);
      }
    }
    levels.push(next);
    current = next;
    width = nextWidth;
  }
  const header = Buffer.alloc(128);
  header.write("DDS ", 0, "ascii");
  header.writeUInt32LE(124, 4);
  header.writeUInt32LE(0x0002100f, 8);
  header.writeUInt32LE(SIZE, 12);
  header.writeUInt32LE(SIZE, 16);
  header.writeUInt32LE(SIZE * 4, 20);
  header.writeUInt32LE(0, 24);
  header.writeUInt32LE(levels.length, 28);
  header.writeUInt32LE(32, 76);
  header.writeUInt32LE(0x41, 80);
  header.writeUInt32LE(0, 84);
  header.writeUInt32LE(32, 88);
  header.writeUInt32LE(0x00ff0000, 92);
  header.writeUInt32LE(0x0000ff00, 96);
  header.writeUInt32LE(0x000000ff, 100);
  header.writeUInt32LE(0xff000000, 104);
  header.writeUInt32LE(0x00401008, 108);
  return Buffer.concat([header, ...levels]);
}

function normalFromHeight(height) {
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const at = (y * SIZE + x) * 4;
    const left = height[y * SIZE + Math.max(0, x - 1)];
    const right = height[y * SIZE + Math.min(SIZE - 1, x + 1)];
    const up = height[Math.max(0, y - 1) * SIZE + x];
    const down = height[Math.min(SIZE - 1, y + 1) * SIZE + x];
    const dx = (right - left) * 0.035;
    const dy = (down - up) * 0.035;
    const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    out[at] = clamp((-dx * inv * 0.5 + 0.5) * 255);
    out[at + 1] = clamp((-dy * inv * 0.5 + 0.5) * 255);
    out[at + 2] = clamp((inv * 0.5 + 0.5) * 255);
    out[at + 3] = 255;
  }
  return out;
}

const skinProfiles = [
  { id: "natural-pore", name: "GOD SKIN — Natural Pore", seed: 1103, poreScale: 1.0, strength: 1.0, roughness: 0.72, alpha: 42, style: "balanced fine pore structure" },
  { id: "broadcast-fine", name: "GOD SKIN — Broadcast Fine", seed: 1217, poreScale: 1.45, strength: 0.62, roughness: 0.66, alpha: 28, style: "subtle close-camera microdetail" },
  { id: "athlete-texture", name: "GOD SKIN — Athlete Texture", seed: 1321, poreScale: 0.78, strength: 1.22, roughness: 0.78, alpha: 50, style: "slightly stronger natural surface variation" },
  { id: "soft-diffuse", name: "GOD SKIN — Soft Diffuse", seed: 1429, poreScale: 1.2, strength: 0.42, roughness: 0.6, alpha: 20, style: "restrained detail for softer material response" },
  { id: "high-definition", name: "GOD SKIN — High Definition", seed: 1543, poreScale: 1.8, strength: 1.08, roughness: 0.74, alpha: 46, style: "fine high-frequency detail source" }
];
const hairProfiles = [
  { id: "straight-fibre", name: "GOD HAIR — Straight Fibre", seed: 2111, frequency: 0.22, wave: 0.08, roughness: 0.68, alpha: 64, style: "fine directional strand detail" },
  { id: "soft-wave", name: "GOD HAIR — Soft Wave", seed: 2221, frequency: 0.16, wave: 0.32, roughness: 0.72, alpha: 70, style: "gently undulating strand detail" },
  { id: "defined-coil", name: "GOD HAIR — Defined Coil", seed: 2333, frequency: 0.31, wave: 0.58, roughness: 0.78, alpha: 78, style: "tight repeating curl microstructure" },
  { id: "close-crop", name: "GOD HAIR — Close Crop", seed: 2441, frequency: 0.48, wave: 0.14, roughness: 0.62, alpha: 54, style: "short dense fibre grain" }
];

function buildSkin(profile) {
  const height = new Float32Array(SIZE * SIZE);
  const overlay = Buffer.alloc(SIZE * SIZE * 4);
  const roughness = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x, p = (y * SIZE + x) * 4;
    const sx = x * profile.poreScale, sy = y * profile.poreScale;
    const fine = hash(Math.floor(sx * 1.7), Math.floor(sy * 1.7), profile.seed) - 0.5;
    const broad = hash(Math.floor(sx / 5), Math.floor(sy / 5), profile.seed + 31) - 0.5;
    const pore = Math.sin(sx * 0.31 + Math.sin(sy * 0.13)) * Math.cos(sy * 0.27 + Math.sin(sx * 0.09));
    const h = (fine * 0.48 + broad * 0.2 + pore * 0.32) * profile.strength;
    height[i] = h * 110;
    const value = clamp(128 + h * 38);
    overlay[p] = value; overlay[p + 1] = value; overlay[p + 2] = value;
    overlay[p + 3] = clamp(profile.alpha + Math.abs(h) * 20);
    const r = clamp(profile.roughness * 255 + (hash(x, y, profile.seed + 71) - 0.5) * 12);
    roughness[p] = r; roughness[p + 1] = r; roughness[p + 2] = r; roughness[p + 3] = 255;
  }
  return {
    "pore-detail-overlay.dds": writeDds(overlay),
    "micro-normal-source.dds": writeDds(normalFromHeight(height)),
    "roughness-source.dds": writeDds(roughness)
  };
}

function buildHair(profile) {
  const height = new Float32Array(SIZE * SIZE);
  const overlay = Buffer.alloc(SIZE * SIZE * 4);
  const roughness = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x, p = i * 4;
    const curve = x * profile.frequency + Math.sin(y * profile.frequency * 0.21) * profile.wave * 7;
    const strand = Math.sin(curve) * 0.58 + Math.sin(curve * 2.03 + 0.7) * 0.18;
    const fibre = (hash(Math.floor(x * 0.7), y, profile.seed) - 0.5) * 0.42;
    const h = strand + fibre;
    height[i] = h * 96;
    const value = clamp(128 + h * 40);
    overlay[p] = value; overlay[p + 1] = value; overlay[p + 2] = value;
    overlay[p + 3] = clamp(profile.alpha + Math.abs(h) * 16);
    const r = clamp(profile.roughness * 255 + (hash(x, y, profile.seed + 89) - 0.5) * 14);
    roughness[p] = r; roughness[p + 1] = r; roughness[p + 2] = r; roughness[p + 3] = 255;
  }
  return {
    "strand-detail-overlay.dds": writeDds(overlay),
    "strand-normal-source.dds": writeDds(normalFromHeight(height)),
    "roughness-source.dds": writeDds(roughness)
  };
}

const sidecarRoot = path.join(OUTPUT_ROOT, "addon-layout", "GODMODS", "Players", "GOD-FACES-PREMIUM");
const files = [];
async function emitProfile(kind, profile, maps) {
  const dir = path.join(sidecarRoot, kind, profile.id);
  await mkdir(dir, { recursive: true });
  for (const [filename, buffer] of Object.entries(maps)) {
    const destination = path.join(dir, filename);
    await writeFile(destination, buffer);
    files.push({
      path: path.relative(OUTPUT_ROOT, destination).replaceAll("\\", "/"),
      bytes: buffer.length,
      sha256: sha256(buffer),
      resolution: SIZE,
      format: "DDS RGBA8 mipmapped",
      sourceRole: filename.includes("normal") ? "normal-source" : filename.includes("roughness") ? "roughness-source" : "neutral-detail-overlay"
    });
  }
}

for (const profile of skinProfiles) await emitProfile("skin", profile, buildSkin(profile));
for (const profile of hairProfiles) await emitProfile("hair", profile, buildHair(profile));

const manifest = {
  schemaVersion: 1,
  id: "thegodmods.god-faces-premium-appearance-lab",
  name: "GOD FACES Premium Appearance Lab",
  version: "0.1.0",
  ownership: "THEGODMODS original procedural microdetail artwork",
  deployment: "reversible sidecar source library; not a drop-in face replacement",
  status: "source maps generated; UV/material mapping, roster assignment and in-game appearance validation pending",
  resolution: SIZE,
  format: "DDS RGBA8 with complete mip chain",
  guardrails: [
    "No real-person likenesses, face meshes, player IDs or roster assignments are generated.",
    "Neutral detail overlays must be applied only through a verified player-face UV/material workflow.",
    "Do not alter base skin colour, facial identity, tattoos, facial hair or hairline when compositing detail.",
    "Normal and roughness maps are source maps until the target shader channel convention is confirmed.",
    "No original CPK, face asset, option file or patch file is overwritten."
  ],
  skinProfiles: skinProfiles.map(({ id, name, style }) => ({ id, name, style, maps: ["pore-detail-overlay.dds", "micro-normal-source.dds", "roughness-source.dds"] })),
  hairProfiles: hairProfiles.map(({ id, name, style }) => ({ id, name, style, maps: ["strand-detail-overlay.dds", "strand-normal-source.dds", "roughness-source.dds"] })),
  files
};
await mkdir(OUTPUT_ROOT, { recursive: true });
await writeFile(path.join(OUTPUT_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(OUTPUT_ROOT, "README.md"), [
  "# GOD FACES — Premium Appearance Lab",
  "",
  "Original procedural skin and hair microdetail source library for optional enhancement of existing PES 2017 player appearances.",
  "",
  "## Included",
  "- Five neutral skin microdetail profiles: Natural Pore, Broadcast Fine, Athlete Texture, Soft Diffuse and High Definition.",
  "- Four hair fibre profiles: Straight Fibre, Soft Wave, Defined Coil and Close Crop.",
  "- Each profile includes an overlay, a normal-source map and a roughness-source map.",
  "- All maps are 512×512 DDS RGBA8 with full mip chains and SHA-256 entries in manifest.json.",
  "",
  "## Deployment and safety",
  "The addon-layout folder is a namespaced sidecar library only. It does not contain player faces, meshes, likenesses, roster IDs or game resource paths. It is not a drop-in replacement pack.",
  "Apply neutral overlays only to a verified, rights-cleared face/hair UV layout. Preserve the user's existing player identity, skin colour, facial hair, tattoos and hairline. Normal/roughness maps require confirmed target shader channel conventions.",
  "Do not inject a map into LiveCPK until the exact player resource, material role, dimensions, format and roster mapping have been evidenced for the target YosfX/PES 2017 setup. Removing the GODMODS sidecar folder removes this source library.",
  "",
  "## Validation status",
  "Generated source assets only. DDS structure and hashes are produced by the builder; UV fit, target shader compatibility and in-game visual quality remain unverified."
].join("\n") + "\n");

console.log(JSON.stringify({
  id: manifest.id,
  output: OUTPUT_ROOT,
  skinProfiles: skinProfiles.length,
  hairProfiles: hairProfiles.length,
  textureMaps: files.length,
  bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  manifest: path.join(OUTPUT_ROOT, "manifest.json")
}, null, 2));
