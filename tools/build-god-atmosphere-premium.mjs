#!/usr/bin/env node
/**
 * GOD ATMOSPHERE Premium Sound Identity Lab.
 * Original deterministic PCM WAV synthesis. No recordings, chants, anthems or samples.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const OUT=path.resolve(process.argv[2]||path.join(ROOT,"content/originals/generated/GOD-ATMOSPHERE-PREMIUM"));
const PROFILE=path.join(ROOT,"content/originals/GOD-AUDIO/clubs/club-audio-design-profiles.json");
const RATE=24000, CHANNELS=2, BITS=16;
function hash(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function clamp(x){return Math.max(-0.98,Math.min(0.98,x));}
function wav(samples){
 const data=Buffer.alloc(samples.length*2);let peak=0,sum=0;
 for(let i=0;i<samples.length;i++){const v=clamp(samples[i]);peak=Math.max(peak,Math.abs(v));sum+=v*v;data.writeInt16LE(Math.round(v*32767),i*2);}
 const h=Buffer.alloc(44);h.write("RIFF",0);h.writeUInt32LE(36+data.length,4);h.write("WAVE",8);h.write("fmt ",12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(CHANNELS,22);h.writeUInt32LE(RATE,24);h.writeUInt32LE(RATE*CHANNELS*2,28);h.writeUInt16LE(CHANNELS*2,32);h.writeUInt16LE(BITS,34);h.write("data",36);h.writeUInt32LE(data.length,40);
 return {bytes:Buffer.concat([h,data]),peak,rms:Math.sqrt(sum/samples.length)};
}
function synthCue(profile,index){
 const seconds=5, n=RATE*seconds, out=new Float32Array(n*2), rand=hash(0x51f15e+index*7919);
 const bpm=Math.max(72,Math.min(160,Number(profile.tempoBpm)||108)), beat=60/bpm;
 const root=92+(index%9)*5.5, scale=[0,3,5,7,10,12,15,17], motif=[0,2,4,1,3,5];
 for(let i=0;i<n;i++){
  const t=i/RATE, beatPos=(t/beat)%4, beatIndex=Math.floor(t/beat);
  const phrase=(t/beat)%motif.length, note=motif[Math.floor(phrase)]%scale.length;
  const freq=root*Math.pow(2,scale[note]/12), env=Math.pow(Math.max(0,Math.sin(Math.PI*(t/seconds))),0.45);
  const pad=(Math.sin(2*Math.PI*freq*t)+.42*Math.sin(2*Math.PI*freq*1.503*t)+.18*Math.sin(2*Math.PI*freq*2.01*t))*0.075;
  const pulsePhase=(t%beat)/beat, pulse=Math.exp(-pulsePhase*17)*(.10+.025*(index%4));
  const clap=(beatIndex%2===0?Math.exp(-(((pulsePhase-.02)/.025)**2)):0)*.09;
  const grit=(rand()-.5)*.018;
  const mono=(pad+pulse+clap+grit)*env;
  const pan=.16*Math.sin(2*Math.PI*t/seconds+index);
  out[i*2]=mono*(1-pan);out[i*2+1]=mono*(1+pan);
 }
 return wav(out);
}
function synthBed(id,index){
 const seconds=18,n=RATE*seconds,out=new Float32Array(n*2),rand=hash(0x7f4a7c15+index*3571);
 let low=0,mid=0,low2=0;
 for(let i=0;i<n;i++){
  const t=i/RATE,noise=rand()*2-1;
  low=low*.997+noise*.003;low2=low2*.999+noise*.001;mid=mid*.91+noise*.09;
  const wave=.52+.16*Math.sin(2*Math.PI*t/6.1+index)+.08*Math.sin(2*Math.PI*t/3.7);
  const swell=.5+.5*Math.sin(2*Math.PI*t/seconds);
  const distantVoices=Math.sin(2*Math.PI*(74+index*3)*t)*.025+Math.sin(2*Math.PI*(111+index*2)*t)*.018;
  const claps=rand()>.9988?(rand()-.5)*.15:0;
  const mono=(low2*.27+low*.35+mid*.09+distantVoices+claps)*wave*.62;
  const fade=Math.min(1,i/(RATE*.35),(n-i)/(RATE*.35));
  const pan=.12*Math.sin(2*Math.PI*t/seconds+index*.7);
  out[i*2]=mono*(1-pan)*fade;out[i*2+1]=mono*(1+pan)*fade;
 }
 // Equal-power seam crossfade: first and last 350 ms become identical blend.
 const edge=Math.floor(RATE*.35);
 for(let i=0;i<edge;i++){const a=i/edge,li=i*2,ri=(n-edge+i)*2;for(let ch=0;ch<2;ch++){const blend=out[li+ch]*(1-a)+out[ri+ch]*a;out[li+ch]=blend;out[ri+ch]=blend;}}
 return wav(out);
}
async function writeAsset(rel,result,kind,seconds){
 const dest=path.join(OUT,rel);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,result.bytes);
 return {file:rel,kind,format:"PCM_S16LE",sampleRate:RATE,channels:CHANNELS,bitsPerSample:BITS,durationSeconds:seconds,bytes:result.bytes.length,peak:result.peak,rms:result.rms,sha256:createHash("sha256").update(result.bytes).digest("hex")};
}
const source=JSON.parse(await readFile(PROFILE,"utf8"));
if(!Array.isArray(source.profiles)||source.profiles.length!==25)throw new Error("Expected the approved 25-club sound-design profile set");
await mkdir(OUT,{recursive:true});
const assets=[],clubs=[];
for(let i=0;i<source.profiles.length;i++){
 const p=source.profiles[i],id=String(p.clubKey||"club-"+i).replace(/[^a-z0-9-]/gi,"-");
 const rel=`clubs/${id}-identity-stinger.wav`,result=synthCue(p,i);
 assets.push(await writeAsset(rel,result,"original-club-identity-stinger-not-a-chant",5));
 clubs.push({clubKey:p.clubKey,clubName:p.clubName,referenceTeamId:p.referenceTeamId,teamIdStatus:"reference-only; no active routing",asset:rel,tempoBpm:p.tempoBpm,creativeBasis:{crowdVoiceTexture:p.crowdVoiceTexture,rhythmicBed:p.rhythmicBed,signatureAccent:p.signatureAccent},status:"original-synthesized-identity-stinger; listening review and patch mapping pending"});
}
const beds=[["stadium-open-air","Open Air Matchday"],["stadium-intimate","Intimate Ground"],["stadium-night","Night Match"],["stadium-cup-final","Cup Final"]];
for(let i=0;i<beds.length;i++){const [id,name]=beds[i],rel=`beds/${id}.wav`;assets.push(await writeAsset(rel,synthBed(id,i),"original-generic-stadium-ambience-bed",18));}
const pack={schemaVersion:1,id:"thegodmods.god-atmosphere-premium",name:"GOD ATMOSPHERE Premium Sound Identity Lab",version:"1.0.0",ownership:"THEGODMODS original procedural synthesis",status:"source-audio-generated; listening review, PES event-slot mapping and in-game validation pending",installable:false,sourceProfileCount:source.profiles.length,format:{container:"RIFF/WAVE",codec:"PCM signed 16-bit little-endian",sampleRate:RATE,channels:CHANNELS},rights:"No recordings, sampled supporter chants, commercial music, club anthems or broadcast audio are used.",clubs,beds:beds.map(([id,name])=>({id,name,asset:`beds/${id}.wav`,status:"generic atmosphere only; no club identity"})),assets};
await writeFile(path.join(OUT,"manifest.json"),JSON.stringify(pack,null,2)+"\n");
await writeFile(path.join(OUT,"README.md"),`# GOD ATMOSPHERE Premium Sound Identity Lab

## Original source assets
- 25 individually synthesized five-second club identity stingers, composed from the approved sound-design profiles.
- 4 generic 18-second stereo stadium ambience beds: Open Air, Intimate Ground, Night Match and Cup Final.
- PCM WAV, 24 kHz, stereo, signed 16-bit little-endian.
- SHA-256 hashes, per-file peak/RMS measurements and profile metadata.

## Rights and identity
All audio is procedural synthesis authored by THEGODMODS. These are abstract original sound identities, not authentic supporter chants, club anthems, recordings or imitations of identifiable songs. Club labels and reference IDs are metadata only; they are not active PES team routing.

## Integration status
This is a source audio library, not a ready-to-install PES audio replacement. Listen-review each cue, master loudness against commentary, verify PES 2017 audio slots and patch team IDs, and test Sider loop/event behavior before creating any optional runtime mapping. No original game audio or patch files are overwritten.
`);
process.stdout.write(JSON.stringify({output:OUT,clubStingers:clubs.length,ambienceBeds:beds.length,assets:assets.length,installable:false})+"\n");
