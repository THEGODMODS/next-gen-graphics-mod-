#!/usr/bin/env node
// GOD KITS Premium Material Lab — original additive fabric maps for existing kit UVs.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const out=path.join(root,"content/originals/generated/GOD-KITS/addon-layout");
const size=1024, clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
const digest=b=>createHash("sha256").update(b).digest("hex");
function noise(x,y,s){let n=(Math.imul(x+s,0x45d9f3b)^Math.imul(y+s*13,0x119de1f3))>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;return ((n^(n>>>16))>>>0)/4294967295;}
function dds(p){let levels=[p],cur=p,w=size;while(w>1){const nw=w>>1,n=Buffer.alloc(nw*nw*4);for(let y=0;y<nw;y++)for(let x=0;x<nw;x++)for(let c=0;c<4;c++){let v=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)v+=cur[(((y*2+dy)*w+x*2+dx)*4)+c];n[(y*nw+x)*4+c]=Math.round(v/4);}levels.push(n);cur=n;w=nw;}const h=Buffer.alloc(128);h.write("DDS ",0,"ascii");h.writeUInt32LE(124,4);h.writeUInt32LE(0x0002100f,8);h.writeUInt32LE(size,12);h.writeUInt32LE(size,16);h.writeUInt32LE(size*4,20);h.writeUInt32LE(levels.length,28);h.writeUInt32LE(32,76);h.writeUInt32LE(0x41,80);h.writeUInt32LE(32,88);h.writeUInt32LE(0x00ff0000,92);h.writeUInt32LE(0x0000ff00,96);h.writeUInt32LE(0x000000ff,100);h.writeUInt32LE(0xff000000,104);h.writeUInt32LE(0x00401008,108);return Buffer.concat([h,...levels]);}
const fabrics=[
{id:"performance-knit",name:"Performance Knit",seed:101,scale:1,rough:.72,alpha:62},
{id:"micro-knit",name:"Micro Knit",seed:137,scale:1.65,rough:.76,alpha:48},
{id:"jacquard-pro",name:"Jacquard Pro",seed:173,scale:.72,rough:.68,alpha:72},
{id:"ventilated-mesh",name:"Ventilated Mesh",seed:211,scale:2.2,rough:.64,alpha:86},
{id:"cotton-pique",name:"Cotton Pique",seed:251,scale:.88,rough:.84,alpha:56},
{id:"keeper-grip",name:"Keeper Grip",seed:293,scale:1.35,rough:.58,alpha:76}];
function maps(f){const a=Buffer.alloc(size*size*4),n=Buffer.alloc(size*size*4),r=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,u=x*.22*f.scale,v=y*.22*f.scale,w=Math.sin(u+.18*Math.sin(v*.17))*Math.sin(v+.15*Math.sin(u*.19)),g=noise(x,y,f.seed)-.5,m=noise(x>>2,y>>2,f.seed+19)-.5,shade=clamp(144+w*22+g*18+m*10);a[i]=a[i+1]=a[i+2]=shade;a[i+3]=clamp(f.alpha+Math.abs(w)*34);const dx=(Math.sin((x+1)*.22*f.scale)-Math.sin((x-1)*.22*f.scale))*f.scale*.7,dy=(Math.sin((y+1)*.22*f.scale)-Math.sin((y-1)*.22*f.scale))*f.scale*.7,inv=1/Math.sqrt(dx*dx+dy*dy+1);n[i]=clamp((-.5*dx*inv+.5)*255);n[i+1]=clamp((-.5*dy*inv+.5)*255);n[i+2]=clamp(inv*255);n[i+3]=255;const q=clamp((f.rough+(noise(x,y,f.seed+71)-.5)*.035)*255);r[i]=r[i+1]=r[i+2]=q;r[i+3]=255;}return {"weave-overlay.dds":dds(a),"normal-source.dds":dds(n),"roughness-source.dds":dds(r)};}
const files=[];
for(const f of fabrics){const dir=path.join(out,"GODMODS/Kits/GOD-KITS-PREMIUM",f.id);await mkdir(dir,{recursive:true});for(const [name,b] of Object.entries(maps(f))){await writeFile(path.join(dir,name),b);files.push({path:path.relative(out,path.join(dir,name)).replaceAll("\\","/"),bytes:b.length,sha256:digest(b),resolution:size,format:"DDS RGBA8 mipmapped"});}}
const manifest={schemaVersion:1,id:"thegodmods.god-kits-premium-material-lab",name:"GOD KITS Premium Material Lab",version:"0.2.0",ownership:"THEGODMODS original procedural material artwork",deployment:"reversible sidecar material library; not a drop-in replacement kit",status:"source maps generated; UV placement, target shader channels and in-game appearance require kit-specific validation",fabrics:fabrics.map(({id,name})=>({id,name,maps:["weave-overlay.dds","normal-source.dds","roughness-source.dds"]})),files};
await writeFile(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(out,"README.md"),"# GOD KITS — Premium Material Lab\n\nSix original 1024×1024 fabric families: performance knit, micro knit, jacquard pro, ventilated mesh, cotton pique and goalkeeper grip. Each includes a mipmapped DDS weave overlay, tangent-space normal source and roughness source.\n\nAdditive material library for existing kits only. Back up the target kit, identify exact UV islands, composite weave only on fabric, and preserve crests, sponsors, names, numbers and colours. Normal/roughness maps are source assets; verify target shader channels and conventions before use. No global injection is enabled. Remove this GODMODS sidecar folder to uninstall.\n");
console.log(JSON.stringify({variants:fabrics.length,maps:files.length,resolution:size,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2));
