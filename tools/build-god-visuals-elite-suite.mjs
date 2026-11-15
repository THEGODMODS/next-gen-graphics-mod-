#!/usr/bin/env node
/**
 * GOD VISUALS Elite Colour Suite.
 * Original display-grade 33^3 .cube LUTs; no shader injection or game-file edits.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.resolve(process.argv[2] || path.join(ROOT, "content/originals/generated/GOD-VISUALS-ELITE"));
const SIZE = 33;
const clamp = (v) => Math.max(0, Math.min(1, v));
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const profiles = [
  { id:"neutral-reference", name:"GOD VISUALS — Neutral Reference", saturation:1, contrast:1, exposure:0, toe:0, shoulder:0, shadow:[0,0,0], highlight:[0,0,0], description:"Identity grade for baseline comparison and colour-pipeline checks." },
  { id:"broadcast-natural", name:"GOD VISUALS — Broadcast Natural", saturation:0.985, contrast:1.025, exposure:0, toe:0.006, shoulder:0.018, shadow:[0,0,0], highlight:[0.002,0.001,-0.002], description:"Faithful kit colours, controlled contrast and restrained highlight compression." },
  { id:"stadium-hdr", name:"GOD VISUALS — Stadium HDR Balance", saturation:0.99, contrast:1.035, exposure:0.006, toe:0.012, shoulder:0.052, shadow:[0.001,0.002,0.004], highlight:[0.003,0.002,0], description:"Gentle shadow separation and soft highlight roll-off for bright stadium scenes." },
  { id:"european-night", name:"GOD VISUALS — European Night Elite", saturation:0.965, contrast:1.045, exposure:-0.008, toe:0.008, shoulder:0.035, shadow:[-0.004,0.001,0.008], highlight:[0.006,0.002,-0.004], description:"Cooler low values and restrained warm floodlight highlights." },
  { id:"golden-hour", name:"GOD VISUALS — Golden Hour", saturation:1.005, contrast:1.025, exposure:0.012, toe:0.004, shoulder:0.028, shadow:[0.001,0, -0.002], highlight:[0.009,0.004,-0.006], description:"Warm late-afternoon light without forcing a heavy amber cast." },
  { id:"overcast-realism", name:"GOD VISUALS — Overcast Realism", saturation:0.975, contrast:1.018, exposure:0.004, toe:0.01, shoulder:0.022, shadow:[0.002,0.003,0.005], highlight:[0.001,0.001,0.002], description:"Soft, cool-neutral response for flat daylight and overcast conditions." },
  { id:"cinematic-matchday", name:"GOD VISUALS — Cinematic Matchday", saturation:0.955, contrast:1.055, exposure:-0.004, toe:0.008, shoulder:0.042, shadow:[-0.006,0.002,0.009], highlight:[0.008,0.003,-0.006], description:"Subtle cool-shadow/warm-highlight separation with gameplay readability in mind." },
  { id:"grass-fidelity", name:"GOD VISUALS — Grass & Kit Fidelity", saturation:0.965, contrast:1.022, exposure:0.002, toe:0.006, shoulder:0.02, shadow:[0,0.001,0.001], highlight:[0.002,0.001,0], description:"Restrained saturation and neutral highlight response to protect pitch and kit colour balance." }
];

function grade(rgb, p) {
  if (p.id === "neutral-reference") return rgb;
  const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const exposed = rgb.map(v => clamp(v * Math.pow(2, p.exposure)));
  const contrasted = exposed.map(v => clamp((v - 0.5) * p.contrast + 0.5));
  const shaped = contrasted.map(v => {
    const toeLift = p.toe * Math.pow(1 - v, 3);
    const shoulderRoll = p.shoulder * Math.pow(Math.max(0, v - 0.72), 2) / 0.0784;
    return clamp(v + toeLift - shoulderRoll);
  });
  const shapedLuma = shaped[0] * 0.2126 + shaped[1] * 0.7152 + shaped[2] * 0.0722;
  const shadowWeight = Math.pow(1 - shapedLuma, 2);
  const highlightWeight = Math.pow(shapedLuma, 2);
  const tinted = shaped.map((v, i) => v + p.shadow[i] * shadowWeight + p.highlight[i] * highlightWeight);
  const finalLuma = tinted[0] * 0.2126 + tinted[1] * 0.7152 + tinted[2] * 0.0722;
  return tinted.map(v => clamp(finalLuma + (v - finalLuma) * p.saturation));
}

function buildCube(profile) {
  const rows = [
    `TITLE "${profile.id}"`,
    `# ${profile.name}`,
    `# Original THEGODMODS display-grade source; confirm host colour pipeline before use.`,
    `LUT_3D_SIZE ${SIZE}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  for (let b = 0; b < SIZE; b++) for (let g = 0; g < SIZE; g++) for (let r = 0; r < SIZE; r++) {
    const result = grade([r/(SIZE-1), g/(SIZE-1), b/(SIZE-1)], profile);
    rows.push(result.map(v => v.toFixed(7)).join(" "));
  }
  return rows.join("\n") + "\n";
}

await mkdir(OUTPUT, { recursive: true });
const files = [];
for (const profile of profiles) {
  const content = buildCube(profile);
  const filename = profile.id + ".cube";
  const target = path.join(OUTPUT, filename);
  await writeFile(target, content, "utf8");
  const bytes = Buffer.from(content, "utf8");
  files.push({ file:filename, bytes:bytes.length, sha256:sha256(bytes), lattice:`${SIZE}x${SIZE}x${SIZE}`, entries:(SIZE ** 3), profile:profile.id });
}
const manifest = {
  schemaVersion:1,
  id:"thegodmods.god-visuals-elite-colour-suite",
  name:"GOD VISUALS Elite Colour Suite",
  version:"1.0.0",
  ownership:"THEGODMODS original procedural colour transforms",
  status:"33-cube source grades generated; host adapter, colour pipeline and in-game validation pending",
  installable:false,
  format:"Adobe .cube 3D LUT",
  lattice:SIZE,
  profiles:profiles.map(({id,name,description,saturation,contrast,exposure,toe,shoulder})=>({id,name,description,saturation,contrast,exposure,toe,shoulder})),
  colourPipeline:{
    inputOutputSpace:"Not encoded by the .cube format; verify the consuming application's expected transfer function and primaries.",
    intent:"Display-grade creative source transforms; no automatic linear/log conversion is performed.",
    warning:"Do not stack multiple grades. Apply one LUT only after confirming the host's colour-management pipeline."
  },
  deployment:{
    layout:"source library only",
    instructions:"Use a compatible colour-management host or verified post-processing adapter. This package does not inject shader files or modify PES 2017/YosfX resources.",
    rollback:"Disable the host LUT or remove the selected LUT reference; no game files are changed."
  },
  files
};
await writeFile(path.join(OUTPUT,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(OUTPUT,"README.md"),[
  "# GOD VISUALS — Elite Colour Suite",
  "",
  "Eight original THEGODMODS display-grade colour transforms, exported as 33×33×33 Adobe .cube 3D LUTs (35,937 RGB entries per profile).",
  "",
  "## The eight looks",
  ...profiles.map(p=>`- **${p.name}** — ${p.description}`),
  "",
  "## Use",
  "Load one LUT at a time in a compatible colour-management host or a verified post-processing adapter. The .cube format does not identify its own input/output colour space; confirm the host's expected primaries and transfer function. Do not stack LUTs or assume PES 2017/YosfX can load .cube files directly.",
  "",
  "## Non-destructive rules",
  "This is a source colour-grade library, not a shader injector. No CPK, executable, ReShade file, Sider configuration, stadium, kit, face or option file is modified. No shader parameters are guessed. Disable the selected LUT or remove its host reference to roll back.",
  "",
  "## Validation state",
  "The generator writes deterministic 33³ LUTs and SHA-256 records. Host-specific colour-space validation, PES 2017 adapter compatibility and matched in-game daylight/night/rain captures remain pending."
].join("\n")+"\n");
console.log(JSON.stringify({id:manifest.id,output:OUTPUT,profiles:profiles.length,lattice:`${SIZE}³`,entriesPerProfile:SIZE**3,totalEntries:profiles.length*SIZE**3,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)},null,2));
