import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import { auditAtmospherePack } from "./godmods-audio-qa.mjs";
import { auditGameplayPack } from "./godmods-gameplay-qa.mjs";
import { auditLutPack } from "./godmods-lut-qa.mjs";
import { scanResourceRoot } from "./pes2017-resource-audit.mjs";

export async function runGodmodsFinalRegression(generatedRoot=path.resolve("content/originals/generated")) {
 const root=path.resolve(generatedRoot);
 const [audio,gameplay,visuals,cinematic,natural,inventory]=await Promise.all([
  auditAtmospherePack(path.join(root,"GOD-ATMOSPHERE-PREMIUM")),
  auditGameplayPack(path.join(root,"GOD-GAMEPLAY-PREMIUM")),
  auditLutPack(path.join(root,"GOD-VISUALS-ELITE")),
  auditLutPack(path.join(root,"GOD-CINEMATIC-PREMIUM")),
  auditLutPack(path.join(root,"GOD-NATURAL-PREMIUM")),
  scanResourceRoot(root)
 ]);
 const dds=inventory.records.filter(r=>r.extension===".dds");
 const ddsFailures=dds.filter(r=>!r.texture?.valid);
 const sourceQaPassed=audio.valid&&gameplay.valid&&visuals.valid&&cinematic.valid&&natural.valid&&!inventory.limitReached&&dds.length>0&&ddsFailures.length===0;
 const departments=[
  {id:"graphics",name:"Graphics / GOD VISUALS",sourceQa:visuals.valid,gameIntegration:"pending",blocker:"No verified PES 2017 colour host, input/output colour space or matched in-game captures."},
  {id:"stadiums-turf",name:"Stadiums & Turf",sourceQa:dds.length>0&&ddsFailures.length===0,gameIntegration:"pending",blocker:"Exact Stadium Server stadium, pitch resource, UV/material binding and in-game rollback are not yet evidenced."},
  {id:"kits-equipment",name:"Kits & Equipment",sourceQa:dds.length>0&&ddsFailures.length===0,gameIntegration:"pending",blocker:"Exact kit resource, fabric UV mask, shader channels and kit-server test are not yet evidenced."},
  {id:"players",name:"Players / GOD FACES",sourceQa:dds.length>0&&ddsFailures.length===0,gameIntegration:"pending",blocker:"Exact face/hair UV, player roster mapping, material channels and close-up game test are not yet evidenced."},
  {id:"audio-atmosphere",name:"Audio & Atmosphere",sourceQa:audio.valid,gameIntegration:"pending",blocker:"PES 2017 audio slots, patch team IDs, commentary mix and event routing are not yet verified."},
  {id:"gameplay",name:"Gameplay",sourceQa:gameplay.valid,gameIntegration:"pending",blocker:"Full-match repeatability, exact patch/Sider build and rollback evidence are not yet recorded."},
  {id:"graphics-premium-grades",name:"Cinematic & Natural Colour",sourceQa:cinematic.valid&&natural.valid,gameIntegration:"pending",blocker:"Compatible host adapter and verified colour-space conversion are not yet established."},
  {id:"final-compatibility-regression",name:"Final cross-department compatibility regression",sourceQa:sourceQaPassed,gameIntegration:"pending",blocker:"Exact target build, patch, Sider version, full-system interaction tests and rollback evidence remain outstanding."}
 ];
 const blockers=[
  "Exact PES 2017 executable filename/build, patch and Sider version must be recorded.",
  "Stadium, pitch, kit, face/hair and audio resources must be mapped against the installed patch with evidence.",
  "The graphics host must declare its input/output primaries and transfer function; .cube files do not carry this metadata.",
  "Gameplay profiles need repeatable full-match tests on the exact target build.",
  "Every runtime integration needs disable/uninstall and rollback testing plus stability/performance checks."
 ];
 return {
  schemaVersion:1,generatedAt:new Date().toISOString(),target:"PES 2017 / YosfX",
  status:sourceQaPassed?"source-qa-passed-game-integration-pending":"source-qa-blocked",
  sourceQaPassed,gameCompatibilityVerified:false,releaseReady:false,
  departments,
  audits:{
   audio:{valid:audio.valid,assets:audio.assets.length,errors:audio.errors},
   gameplay:{valid:gameplay.valid,profiles:gameplay.profiles,scenarios:gameplay.scenarios,errors:gameplay.errors},
   visuals:{valid:visuals.valid,profiles:visuals.profiles,errors:visuals.errors},
   cinematic:{valid:cinematic.valid,profiles:cinematic.profiles,errors:cinematic.errors},
   natural:{valid:natural.valid,profiles:natural.profiles,errors:natural.errors},
   dds:{scanned:dds.length,passed:dds.length-ddsFailures.length,failed:ddsFailures.map(r=>({file:r.relativePath,errors:r.errors}))}
  },
  compatibilityGates:{exactBuild:false,exactPatchAndSider:false,resourceBindings:false,hostColourPipeline:false,audioEventRouting:false,fullMatchTests:false,rollbackTests:false},
  blockers,
  safety:"Read-only audit. No game, patch, CPK, Stadium Server, Kit Server, LiveCPK, option file or executable is modified."
 };
}

async function main(args){
 const root=args[0]||path.resolve("content/originals/generated");
 const report=await runGodmodsFinalRegression(root);
 if(args[1]){const dest=path.resolve(args[1]);if(dest.startsWith(path.resolve(root)+path.sep))throw new Error("Regression report must be outside the generated asset root.");await writeFile(dest,JSON.stringify(report,null,2)+"\n",{flag:"wx"});}
 else process.stdout.write(JSON.stringify(report,null,2)+"\n");
 if(!report.sourceQaPassed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
