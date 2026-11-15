#!/usr/bin/env node
/**
 * GOD CINEMATIC — original matchday filmic colour suite.
 * Source LUTs and scene guidance only; no shader injection or game-file edits.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.resolve(process.argv[2] || path.join(ROOT, "content/originals/generated/GOD-CINEMATIC-PREMIUM"));
const SIZE = 33;
const clamp = v => Math.max(0, Math.min(1, v));
const sha256 = data => createHash("sha256").update(data).digest("hex");

// Profiles are deliberately restrained: no crushed shadows, neon greens or heavy amber wash.
const profiles = [
  { id:"matchday-filmic", name:"GOD CINEMATIC — Matchday Filmic", description:"Balanced filmic contrast, gentle highlight shoulder and subtle cool-shadow/warm-highlight separation.", saturation:0.965, contrast:1.045, exposure:0.002, toe:0.004, shoulder:0.038, shadow:[-0.003,0.001,0.005], highlight:[0.005,0.002,-0.003] },
  { id:"european-night", name:"GOD CINEMATIC — European Night", description:"Floodlight-safe night grade with preserved dark detail and restrained neutral-warm highlights.", saturation:0.955, contrast:1.035, exposure:0.006, toe:0.009, shoulder:0.052, shadow:[-0.002,0.001,0.006], highlight:[0.006,0.003,-0.002] },
  { id:"golden-hour", name:"GOD CINEMATIC — Golden Hour", description:"Late-day warmth with controlled amber bias and faithful kit whites.", saturation:0.98, contrast:1.035, exposure:0.008, toe:0.003, shoulder:0.035, shadow:[0.001,0.000,-0.001], highlight:[0.007,0.003,-0.004] },
  { id:"overcast-documentary", name:"GOD CINEMATIC — Overcast Documentary", description:"Soft documentary contrast for flat daylight, retaining texture in pitch and dark kits.", saturation:0.95, contrast:1.025, exposure:0.004, toe:0.012, shoulder:0.028, shadow:[0.001,0.002,0.003], highlight:[0.001,0.001,0.001] },
  { id:"rain-matchday", name:"GOD CINEMATIC — Rain Matchday", description:"Cool-neutral atmospheric grade with restrained contrast; does not create rain, reflections or wet surfaces.", saturation:0.94, contrast:1.04, exposure:0.002, toe:0.01, shoulder:0.045, shadow:[-0.003,0.001,0.007], highlight:[0.002,0.003,0.004] },
  { id:"cup-final", name:"GOD CINEMATIC — Cup Final", description:"Premium broadcast finish with gentle midtone density and clean highlight roll-off.", saturation:0.975, contrast:1.05, exposure:0.003, toe:0.005, shoulder:0.048, shadow:[-0.001,0.001,0.002], highlight:[0.004,0.002,-0.001] }
];

function grade(rgb, p) {
  const exposed = rgb.map(v => clamp(v * Math.pow(2, p.exposure)));
  const contrasted = exposed.map(v => clamp((v - 0.5) * p.contrast + 0.5));
  const shaped = contrasted.map(v => clamp(v + p.toe * Math.pow(1-v,3) - p.shoulder * Math.pow(Math.max(0,v-0.72),2) / 0.0784));
  const y = shaped[0]*0.2126 + shaped[1]*0.7152 + shaped[2]*0.0722;
  const shadowWeight = Math.pow(1-y,2);
  const highlightWeight = Math.pow(y,2);
  const tinted = shaped.map((v,i) => v + p.shadow[i]*shadowWeight + p.highlight[i]*highlightWeight);
  const luma = tinted[0]*0.2126 + tinted[1]*0.7152 + tinted[2]*0.0722;
  return tinted.map(v => clamp(luma + (v-luma)*p.saturation));
}

function buildCube(p) {
  const rows = [
    `TITLE "${p.id}"`,
    `# ${p.name}`,
    "# Original THEGODMODS cinematic source transform.",
    `LUT_3D_SIZE ${SIZE}`,
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0"
  ];
  for (let b=0;b<SIZE;b++) for (let g=0;g<SIZE;g++) for (let r=0;r<SIZE;r++) {
    rows.push(grade([r/(SIZE-1),g/(SIZE-1),b/(SIZE-1)],p).map(v=>v.toFixed(7)).join(" "));
  }
  return rows.join("\n")+"\n";
}

const scenes = [
  { id:"daylight", profile:"matchday-filmic", check:"Keep white kits neutral; inspect grass greens, skin tones and ball visibility." },
  { id:"night-floodlights", profile:"european-night", check:"Inspect black kits and shadow detail; reject clipped floodlight whites or coloured halos." },
  { id:"late-afternoon", profile:"golden-hour", check:"Check white balance on white shirts and avoid orange skin or amber pitch." },
  { id:"overcast", profile:"overcast-documentary", check:"Confirm contrast remains readable without crushing dark kits." },
  { id:"rain-if-host-supports", profile:"rain-matchday", check:"Grade only; wet surfaces, rain and reflections must come from the game or a separately verified module." },
  { id:"cup-final-broadcast", profile:"cup-final", check:"Check broadcast camera readability, sponsor/number legibility and highlight retention." }
];

await mkdir(OUTPUT,{recursive:true});
const files=[];
for (const profile of profiles) {
  const filename=profile.id+".cube";
  const content=buildCube(profile);
  await writeFile(path.join(OUTPUT,filename),content,"utf8");
  const bytes=Buffer.from(content,"utf8");
  files.push({file:filename,bytes:bytes.length,sha256:sha256(bytes),lattice:`${SIZE}x${SIZE}x${SIZE}`,entries:SIZE**3,profile:profile.id});
}
const profileIndex={
  schemaVersion:1,id:"thegodmods.god-cinematic-premium",name:"GOD CINEMATIC Premium Matchday Suite",version:"1.0.0",
  ownership:"THEGODMODS original procedural colour transforms",
  status:"Original source LUTs generated; compatible host, colour pipeline and in-game verification pending",
  installable:false,
  profiles:profiles.map(({id,name,description,saturation,contrast,exposure,toe,shoulder})=>({id,name,description,saturation,contrast,exposure,toe,shoulder,file:id+".cube"})),
  sceneGuidance:scenes,
  colourPipeline:{inputOutputSpace:"Not encoded by Adobe .cube; verify the consuming host's primaries and transfer function.",intent:"Creative display-grade source transforms; no automatic linear/log conversion.",rule:"Apply one grade at a time; do not stack GOD CINEMATIC and GOD VISUALS LUTs."},
  deployment:{layout:"optional source library only",activation:"Load a single selected LUT in a compatible colour-management host or a verified post-processing adapter.",rollback:"Disable or remove the selected host LUT reference; no game files are changed."}
};
const indexText=JSON.stringify(profileIndex,null,2)+"\n";
await writeFile(path.join(OUTPUT,"profiles.json"),indexText);
files.push({file:"profiles.json",bytes:Buffer.byteLength(indexText),sha256:sha256(indexText)});
const sceneText=JSON.stringify({schemaVersion:1,scenes},null,2)+"\n";
await mkdir(path.join(OUTPUT,"qa"),{recursive:true});
await writeFile(path.join(OUTPUT,"qa","scene-validation.json"),sceneText);
files.push({file:"qa/scene-validation.json",bytes:Buffer.byteLength(sceneText),sha256:sha256(sceneText)});
const manifest={schemaVersion:1,id:profileIndex.id,name:profileIndex.name,version:profileIndex.version,installable:false,format:"Adobe .cube 3D LUT",lattice:SIZE,profileCount:profiles.length,files};
const manifestText=JSON.stringify(manifest,null,2)+"\n";
await writeFile(path.join(OUTPUT,"manifest.json"),manifestText);
await writeFile(path.join(OUTPUT,"README.md"),[
  "# GOD CINEMATIC — Premium Matchday Suite","",
  "Six original 33×33×33 cinematic colour transforms (35,937 RGB entries each), six scene checks and a SHA-256 manifest.","",
  "## Looks",...profiles.map(p=>`- **${p.name}** — ${p.description}`),"",
  "## Use","Load one LUT at a time in a compatible colour-management host or a verified post-processing adapter. Adobe .cube does not encode input/output colour space; verify host primaries and transfer function. Do not stack this suite with GOD VISUALS or other grades.","",
  "## Boundaries","This package changes colour only when loaded by a compatible host. It does not create lighting, weather, bloom, reflections, wet turf, tunnel scenes or camera effects. It is not a PES 2017 shader injector and does not claim native YosfX support.","",
  "## Safety and rollback","No CPK, executable, option file, stadium, kit, face or original patch resource is modified. Disable or remove the selected LUT reference to restore the previous host output.","",
  "## Validation","The generator verifies reproducible 33³ LUT data and SHA-256 integrity. Host colour-space validation, PES 2017 adapter compatibility and matched in-game daylight/night/rain captures remain outstanding."
].join("\n")+"\n");
console.log(JSON.stringify({id:manifest.id,output:OUTPUT,profiles:profiles.length,lattice:`${SIZE}³`,entriesPerProfile:SIZE**3,totalEntries:profiles.length*SIZE**3,files:files.length,sceneChecks:scenes.length},null,2));
