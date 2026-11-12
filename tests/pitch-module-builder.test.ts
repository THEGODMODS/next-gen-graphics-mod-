import { describe,it,expect } from "vitest";
import { mkdtemp,mkdir,writeFile,readFile,rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildPitchModule } from "../tools/pitch-module-builder.mjs";

describe("pitch module builder",()=>{
 it("builds a LiveCPK module only from an inventory-verified resource mapping",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"pitch-builder-"));
  try{
   const stadium="common/bg/model/bg/pitch";
   const original="pitch_diffuse.bin",payload=Buffer.from("original replacement texture");
   const digest=createHash("sha256").update("original stadium resource").digest("hex");
   await mkdir(path.join(root,"source"),{recursive:true});
   await writeFile(path.join(root,"source","replacement.bin"),payload);
   await writeFile(path.join(root,"inventory.json"),JSON.stringify({schemaVersion:1,subtree:stadium,records:[{path:original,sha256:digest}]}));
   await writeFile(path.join(root,"descriptor.json"),JSON.stringify({schemaVersion:1,id:"studio.pitch-test",name:"Pitch Test",version:"1.0.0",license:{id:"Original test asset",redistributionAllowed:true},replacements:[{inventoryPath:original,originalSha256:digest,replacementFile:"source/replacement.bin"}]}));
   const out=path.join(root,"out");
   const result=await buildPitchModule({descriptorPath:path.join(root,"descriptor.json"),inventoryPath:path.join(root,"inventory.json"),outputPath:out});
   expect(result.files).toBe(1);
   const manifest=JSON.parse(await readFile(path.join(out,"module.json"),"utf8"));
   expect(manifest.files[0].target).toBe("LiveCPK/"+stadium+"/"+original);
   expect(manifest.files[0].sha256).toBe(createHash("sha256").update(payload).digest("hex"));
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it("rejects a stale original fingerprint and leaves output untouched",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"pitch-builder-"));
  try{
   await mkdir(path.join(root,"source"));
   await writeFile(path.join(root,"source","replacement.dds"),"fake");
   await writeFile(path.join(root,"inventory.json"),JSON.stringify({schemaVersion:1,subtree:"common/bg/model/bg/pitch",records:[{path:"pitch.dds",sha256:"a".repeat(64)}]}));
   await writeFile(path.join(root,"descriptor.json"),JSON.stringify({schemaVersion:1,id:"studio.pitch-test",name:"Pitch Test",version:"1.0.0",license:{id:"test",redistributionAllowed:true},replacements:[{inventoryPath:"pitch.dds",originalSha256:"b".repeat(64),replacementFile:"source/replacement.dds"}]}));
   const out=path.join(root,"out");
   await expect(buildPitchModule({descriptorPath:path.join(root,"descriptor.json"),inventoryPath:path.join(root,"inventory.json"),outputPath:out})).rejects.toThrow(/fingerprint/);
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it("rejects traversal in a mapped original path",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"pitch-builder-"));
  try{
   await mkdir(path.join(root,"source"));
   await writeFile(path.join(root,"source","replacement.dds"),"fake");
   await writeFile(path.join(root,"inventory.json"),JSON.stringify({schemaVersion:1,subtree:"common/bg/model/bg/pitch",records:[]}));
   await writeFile(path.join(root,"descriptor.json"),JSON.stringify({schemaVersion:1,id:"studio.pitch-test",name:"Pitch Test",version:"1.0.0",license:{id:"test",redistributionAllowed:true},replacements:[{inventoryPath:"../evil.dds",originalSha256:"a".repeat(64),replacementFile:"source/replacement.dds"}]}));
   await expect(buildPitchModule({descriptorPath:path.join(root,"descriptor.json"),inventoryPath:path.join(root,"inventory.json"),outputPath:path.join(root,"out")})).rejects.toThrow(/safe relative/);
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it("preserves private-use license restrictions in the generated manifest",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"pitch-builder-"));
  try{
   await mkdir(path.join(root,"source"));
   await writeFile(path.join(root,"source","replacement.bin"),"private asset");
   const digest="a".repeat(64);
   await writeFile(path.join(root,"inventory.json"),JSON.stringify({schemaVersion:1,subtree:"common/bg/model/bg/pitch",records:[{path:"pitch.bin",sha256:digest}]}));
   await writeFile(path.join(root,"descriptor.json"),JSON.stringify({schemaVersion:1,id:"studio.pitch-test",name:"Pitch Test",version:"1.0.0",license:{id:"restricted",redistributionAllowed:false},replacements:[{inventoryPath:"pitch.bin",originalSha256:digest,replacementFile:"source/replacement.bin"}]}));
   const result=await buildPitchModule({descriptorPath:path.join(root,"descriptor.json"),inventoryPath:path.join(root,"inventory.json"),outputPath:path.join(root,"out")});
   expect(result.manifest.license.redistributionAllowed).toBe(false);
  }finally{await rm(root,{recursive:true,force:true});}
 });
});