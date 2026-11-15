import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const close = (a,b,t=0.0001) => Number.isFinite(a) && Math.abs(a-b) <= t;
function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) &&
    !/^[A-Za-z]:/.test(value) && !value.replaceAll(String.fromCharCode(92),"/").split("/").some(p => !p || p === "." || p === "..");
}
function parsePcmWav(bytes) {
  const errors = [];
  if (bytes.length < 44 || bytes.toString("ascii",0,4) !== "RIFF" || bytes.toString("ascii",8,12) !== "WAVE") {
    return { valid:false, errors:["Missing RIFF/WAVE header."], samples:null };
  }
  const riffSize = bytes.readUInt32LE(4);
  if (riffSize + 8 !== bytes.length) errors.push("RIFF size does not match file length.");
  let offset=12, fmt=null, data=null;
  while (offset + 8 <= bytes.length) {
    const id=bytes.toString("ascii",offset,offset+4), size=bytes.readUInt32LE(offset+4), start=offset+8;
    if (start+size > bytes.length) { errors.push("WAV chunk exceeds file bounds."); break; }
    if (id==="fmt ") {
      if (size < 16) errors.push("WAV fmt chunk is too short.");
      else fmt={ codec:bytes.readUInt16LE(start), channels:bytes.readUInt16LE(start+2), sampleRate:bytes.readUInt32LE(start+4), byteRate:bytes.readUInt32LE(start+8), blockAlign:bytes.readUInt16LE(start+12), bitsPerSample:bytes.readUInt16LE(start+14) };
    }
    if (id==="data") data={ offset:start, bytes:size };
    offset=start+size+(size%2);
  }
  if (!fmt || !data) errors.push("WAV must contain fmt and data chunks.");
  if (fmt && (fmt.codec!==1 || fmt.bitsPerSample!==16 || ![1,2].includes(fmt.channels))) errors.push("Only PCM signed 16-bit mono/stereo WAV is supported.");
  if (fmt && fmt.blockAlign !== fmt.channels*2) errors.push("WAV block alignment is inconsistent.");
  if (fmt && fmt.byteRate !== fmt.sampleRate*fmt.blockAlign) errors.push("WAV byte rate is inconsistent.");
  if (fmt && data && data.bytes%fmt.blockAlign!==0) errors.push("WAV data is not aligned to complete sample frames.");
  if (errors.length) return { valid:false, errors, fmt, data, samples:null };
  const samples=bytes.subarray(data.offset,data.offset+data.bytes);
  return { valid:true, errors, fmt, data, samples, frames:data.bytes/fmt.blockAlign };
}

export async function auditAtmospherePack(root) {
  const packRoot=path.resolve(root), errors=[];
  const rootStat=await lstat(packRoot);
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink()) throw new Error("Audio pack root must be a real directory.");
  const manifest=JSON.parse(await readFile(path.join(packRoot,"manifest.json"),"utf8"));
  if(manifest.id!=="thegodmods.god-atmosphere-premium"||manifest.installable!==false) errors.push("Unexpected pack identity or installable flag.");
  if(manifest.clubs?.length!==25) errors.push("Expected exactly 25 club identity stingers.");
  if(manifest.beds?.length!==4) errors.push("Expected exactly four generic ambience beds.");
  if(manifest.assets?.length!==29) errors.push("Expected exactly 29 WAV assets.");
  if(manifest.format?.container!=="RIFF/WAVE"||manifest.format?.codec!=="PCM signed 16-bit little-endian"||manifest.format?.sampleRate!==24000||manifest.format?.channels!==2) errors.push("Pack format metadata is not the approved 24 kHz stereo PCM16 format.");
  if(!String(manifest.rights||"").includes("No recordings")) errors.push("Audio rights declaration is missing.");
  const assetResults=[];
  for(const asset of manifest.assets||[]) {
    const rowErrors=[];
    if(!safeRelative(asset.file)) rowErrors.push("Unsafe audio asset path.");
    let bytes;
    if(safeRelative(asset.file)) {
      const file=path.resolve(packRoot,asset.file);
      if(!file.startsWith(packRoot+path.sep)) rowErrors.push("Audio path escapes pack root.");
      else {
        try {
          const st=await lstat(file);
          if(!st.isFile()||st.isSymbolicLink()) rowErrors.push("Audio asset is not a regular file.");
          else bytes=await readFile(file);
        } catch { rowErrors.push("Audio asset is missing."); }
      }
    }
    if(bytes) {
      if(bytes.length!==asset.bytes) rowErrors.push("Audio byte count differs from manifest.");
      if(sha256(bytes)!==asset.sha256) rowErrors.push("Audio SHA-256 differs from manifest.");
      const wav=parsePcmWav(bytes);
      if(!wav.valid) rowErrors.push(...wav.errors);
      else {
        const {fmt,frames,samples,data}=wav;
        if(fmt.channels!==2||fmt.sampleRate!==24000||fmt.bitsPerSample!==16) rowErrors.push("Audio stream is not stereo 24 kHz PCM16.");
        const duration=frames/fmt.sampleRate;
        if(!close(duration,asset.durationSeconds,1/fmt.sampleRate)) rowErrors.push("Audio duration differs from manifest.");
        let peak=0,sum=0,clipped=0;
        for(let i=0;i<samples.length;i+=2) {
          const sample=samples.readInt16LE(i), value=sample/32768;
          peak=Math.max(peak,Math.abs(value)); sum+=value*value;
          if(Math.abs(sample)>=32767) clipped++;
        }
        const rms=Math.sqrt(sum/(samples.length/2));
        if(!close(peak,asset.peak,0.0002)) rowErrors.push("Measured peak differs from manifest.");
        if(!close(rms,asset.rms,0.0002)) rowErrors.push("Measured RMS differs from manifest.");
        if(clipped) rowErrors.push("Audio contains clipped full-scale samples.");
        if(asset.kind==="original-generic-stadium-ambience-bed") {
          const edge=Math.floor(fmt.sampleRate*0.35), framesToCheck=Math.min(edge,Math.floor(frames/2));
          for(let f=0;f<framesToCheck&&!rowErrors.some(e=>e.includes("loop seam"));f++) for(let ch=0;ch<fmt.channels;ch++) {
            const first=samples.readInt16LE((f*fmt.channels+ch)*2);
            const last=samples.readInt16LE(((frames-framesToCheck+f)*fmt.channels+ch)*2);
            if(first!==last){rowErrors.push("Ambience loop seam is not sample-identical across the 350 ms crossfade.");break;}
          }
        }
        assetResults.push({file:asset.file,valid:rowErrors.length===0,durationSeconds:duration,peak,rms,clippedSamples:clipped,errors:rowErrors});
        continue;
      }
    }
    assetResults.push({file:asset.file,valid:false,errors:rowErrors});
  }
  const referenced=new Set([...(manifest.clubs||[]).map(c=>c.asset),...(manifest.beds||[]).map(b=>b.asset)]);
  if(referenced.size!==29||assetResults.length!==29) errors.push("Club and ambience references must resolve one-to-one to all 29 assets.");
  for(const row of assetResults) if(!row.valid) errors.push(row.file+": "+row.errors.join(" "));
  const valid=errors.length===0&&assetResults.length===29;
  return {valid,status:valid?"audio-source-qa-passed-not-game-routed":"blocked",clubStingers:manifest.clubs?.length||0,ambienceBeds:manifest.beds?.length||0,assets:assetResults,errors};
}

async function main(args) {
  const root=args[0]||path.resolve("content/originals/generated/GOD-ATMOSPHERE-PREMIUM");
  const result=await auditAtmospherePack(root);
  const output=args[1];
  if(output){const dest=path.resolve(output);if(dest.startsWith(path.resolve(root)+path.sep))throw new Error("Report must be outside the audio pack.");await writeFile(dest,JSON.stringify(result,null,2)+"\n",{flag:"wx"});}
  else process.stdout.write(JSON.stringify(result,null,2)+"\n");
  if(!result.valid)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
