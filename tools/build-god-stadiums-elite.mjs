#!/usr/bin/env node
/**
 * GOD STADIUMS Elite Matchday Presentation Suite.
 * Generates original, sponsor-neutral vector artwork and an integrity manifest.
 * These are source masters, not mapped PES resources or installable overlays.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = path.join(ROOT, "content", "originals", "generated", "GOD-STADIUMS-ELITE");
const OUT = path.resolve(process.argv[2] || DEFAULT_OUT);
const themes = [
  { id:"broadcast-elite", name:"Broadcast Elite", bg:"#071a2a", mid:"#123c55", accent:"#55d8df", glow:"#d9fbff", title:"THE MATCHDAY", sub:"BROADCAST ELITE", motif:"rings" },
  { id:"european-night", name:"European Night", bg:"#080d24", mid:"#1c2454", accent:"#7b8cff", glow:"#e0e5ff", title:"UNDER THE LIGHTS", sub:"EUROPEAN NIGHT SERIES", motif:"stars" },
  { id:"golden-hour", name:"Golden Hour", bg:"#28170e", mid:"#70401f", accent:"#f2b85b", glow:"#fff0c9", title:"GOLDEN HOUR", sub:"MATCHDAY PRESENTATION", motif:"sun" },
  { id:"cup-final", name:"Cup Final", bg:"#1b160d", mid:"#40301a", accent:"#d7b86a", glow:"#fff3cc", title:"THE FINAL", sub:"ONE MATCH • ONE MOMENT", motif:"laurel" },
  { id:"heritage-classic", name:"Heritage Classic", bg:"#10231d", mid:"#1c4437", accent:"#b9d18a", glow:"#edf5d9", title:"THE BEAUTIFUL GAME", sub:"HERITAGE SERIES", motif:"stripes" },
  { id:"rain-match", name:"Rain Match", bg:"#101c27", mid:"#294456", accent:"#72c4d9", glow:"#e0f6ff", title:"ALL WEATHER", sub:"RAIN MATCH SERIES", motif:"rain" },
  { id:"efootball-natural", name:"Natural Pitchside", bg:"#10251d", mid:"#23543b", accent:"#8dd4a4", glow:"#e4ffed", title:"PURE FOOTBALL", sub:"NATURAL MATCHDAY", motif:"field" },
  { id:"ufl-impact", name:"Impact", bg:"#160d24", mid:"#4b1c50", accent:"#ff6b9e", glow:"#ffe2ee", title:"OWN THE MOMENT", sub:"GODMODS IMPACT SERIES", motif:"slashes" },
  { id:"god-signature", name:"GOD Signature", bg:"#090f18", mid:"#152c3b", accent:"#32d6c4", glow:"#e1fffb", title:"GOD STADIUMS", sub:"THE SIGNATURE MATCHDAY", motif:"sigil" },
  { id:"minimal-neutral", name:"Minimal Neutral", bg:"#151b22", mid:"#303a45", accent:"#dce5ee", glow:"#ffffff", title:"MATCHDAY", sub:"PURE • CLEAN • TIMELESS", motif:"minimal" }
];
const ribbons = [
  { id:"signature-ribbon", bg:"#07151d", accent:"#35d6c4", label:"GOD STADIUMS  /  ORIGINAL MATCHDAY" },
  { id:"night-ribbon", bg:"#0c1029", accent:"#8191ff", label:"NIGHT MATCH  /  UNDER THE LIGHTS" },
  { id:"final-ribbon", bg:"#21190d", accent:"#e1c47a", label:"CUP FINAL  /  THE BIG OCCASION" },
  { id:"heritage-ribbon", bg:"#11251c", accent:"#b4d28b", label:"HERITAGE  /  THE BEAUTIFUL GAME" }
];
const esc = s => String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function motif(t) {
  const a=t.accent;
  switch(t.motif) {
    case "rings": return `<circle cx="1760" cy="256" r="210" fill="none" stroke="${a}" stroke-width="5" opacity=".55"/><circle cx="1760" cy="256" r="155" fill="none" stroke="${a}" stroke-width="2" opacity=".5"/><circle cx="1760" cy="256" r="95" fill="none" stroke="${a}" stroke-width="2" opacity=".4"/>`;
    case "stars": return Array.from({length:9},(_,i)=>`<path d="M${1510+i%3*95} ${90+Math.floor(i/3)*125} l10 24 26 2-20 16 7 25-23-14-22 14 7-25-20-16 26-2z" fill="${a}" opacity=".55"/>`).join("");
    case "sun": return `<circle cx="1710" cy="250" r="190" fill="${a}" opacity=".12"/><circle cx="1710" cy="250" r="135" fill="none" stroke="${a}" stroke-width="5"/><path d="M1510 250h400M1710 50v400" stroke="${a}" opacity=".55" stroke-width="3"/>`;
    case "laurel": return `<path d="M1660 80q-210 150 0 360M1660 80q210 150 0 360" fill="none" stroke="${a}" stroke-width="7"/>${Array.from({length:7},(_,i)=>`<ellipse cx="${1595-i*2}" cy="${115+i*42}" rx="30" ry="12" transform="rotate(-35 ${1595-i*2} ${115+i*42})" fill="${a}" opacity=".65"/><ellipse cx="${1725+i*2}" cy="${115+i*42}" rx="30" ry="12" transform="rotate(35 ${1725+i*2} ${115+i*42})" fill="${a}" opacity=".65"/>`).join("")}`;
    case "stripes": return Array.from({length:9},(_,i)=>`<path d="M${1450+i*52} 0h28l-230 512h-28z" fill="${a}" opacity=".18"/>`).join("");
    case "rain": return Array.from({length:22},(_,i)=>`<path d="M${1450+i*25} ${(i*67)%460}l-55 105" stroke="${a}" stroke-width="4" opacity=".35"/>`).join("");
    case "field": return `<rect x="1470" y="85" width="470" height="340" rx="10" fill="none" stroke="${a}" stroke-width="4" opacity=".55"/><path d="M1705 85v340M1470 255h470" stroke="${a}" stroke-width="3" opacity=".55"/><circle cx="1705" cy="255" r="72" fill="none" stroke="${a}" stroke-width="3" opacity=".55"/>`;
    case "slashes": return Array.from({length:7},(_,i)=>`<path d="M${1450+i*70} 512l240-512h48l-240 512z" fill="${a}" opacity=".22"/>`).join("");
    case "sigil": return `<path d="M1710 70l175 100v172l-175 100-175-100V170z" fill="none" stroke="${a}" stroke-width="6"/><path d="M1710 130l120 70v115l-120 70-120-70V200z" fill="none" stroke="${a}" stroke-width="3"/><path d="M1640 200h140v110h-140z" fill="none" stroke="${a}" stroke-width="3"/>`;
    default: return `<path d="M1500 120h400M1500 256h400M1500 392h400" stroke="${a}" stroke-width="3" opacity=".35"/>`;
  }
}
function boardSvg(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512" viewBox="0 0 2048 512">
<title>GOD STADIUMS — ${esc(t.name)} LED board artwork</title>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.bg}"/><stop offset=".55" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.bg}"/></linearGradient><linearGradient id="edge"><stop stop-color="${t.accent}" stop-opacity=".2"/><stop offset=".5" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent}" stop-opacity=".2"/></linearGradient></defs>
<rect width="2048" height="512" fill="url(#bg)"/><path d="M0 0h2048v12H0zM0 500h2048v12H0z" fill="url(#edge)"/>
<path d="M72 58h1904v396H72z" fill="none" stroke="${t.accent}" stroke-opacity=".36" stroke-width="2"/>
<path d="M96 82h8v348h-8zM1944 82h8v348h-8z" fill="${t.accent}" opacity=".7"/>
${motif(t)}
<text x="180" y="220" fill="${t.glow}" font-family="Arial,Helvetica,sans-serif" font-size="106" font-weight="700" letter-spacing="8">${esc(t.title)}</text>
<path d="M180 258h980" stroke="${t.accent}" stroke-width="5"/>
<text x="184" y="330" fill="${t.accent}" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="600" letter-spacing="12">${esc(t.sub)}</text>
<text x="184" y="390" fill="#ffffff" opacity=".62" font-family="Arial,Helvetica,sans-serif" font-size="19" letter-spacing="5">ORIGINAL ARTWORK  •  THEGODMODS</text>
</svg>\n`;
}
function ribbonSvg(r) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="256" viewBox="0 0 2048 256"><title>GOD STADIUMS — ${esc(r.id)}</title><rect width="2048" height="256" fill="${r.bg}"/><path d="M0 0h2048v8H0zM0 248h2048v8H0z" fill="${r.accent}"/><path d="M0 32h2048M0 224h2048" stroke="${r.accent}" opacity=".22" stroke-width="2"/><path d="M120 50l-85 78 85 78M1928 50l85 78-85 78" fill="none" stroke="${r.accent}" stroke-width="8"/><text x="1024" y="153" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="700" letter-spacing="14">${esc(r.label)}</text></svg>\n`;
}
async function put(rel, value, kind, width, height) {
  const file=path.join(OUT,rel); await mkdir(path.dirname(file),{recursive:true});
  const bytes=Buffer.from(value,"utf8"); await writeFile(file,bytes);
  return {file:rel,kind,width,height,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
}
await mkdir(OUT,{recursive:true});
const assets=[];
for(const t of themes) assets.push(await put(`boards/${t.id}.svg`,boardSvg(t),"led-board-vector-master",2048,512));
for(const r of ribbons) assets.push(await put(`fascia/${r.id}.svg`,ribbonSvg(r),"stadium-fascia-vector-master",2048,256));
const profile = {
  schemaVersion:1, name:"GOD STADIUMS Elite Matchday Art Direction", version:"1.0.0",
  status:"art-direction-reference-only; no game lighting or weather values are applied",
  profiles:themes.map(t=>({id:t.id,name:t.name,board:`boards/${t.id}.svg`,intent:t.name==="Rain Match"?"cool wet-match presentation":t.name==="Golden Hour"?"warm late-afternoon presentation":t.name==="European Night"?"cool floodlit night presentation":"stadium-neutral matchday presentation",palette:{background:t.bg,mid:t.mid,accent:t.accent,highlight:t.glow}}))
};
const profileBytes=Buffer.from(JSON.stringify(profile,null,2)+"\n");
await mkdir(path.join(OUT,"profiles"),{recursive:true});
await writeFile(path.join(OUT,"profiles","matchday-art-direction.json"),profileBytes);
assets.push({file:"profiles/matchday-art-direction.json",kind:"non-runtime-art-direction-data",bytes:profileBytes.length,sha256:createHash("sha256").update(profileBytes).digest("hex")});
const manifest={schemaVersion:1,id:"thegodmods.god-stadiums-elite",name:"GOD STADIUMS Elite Matchday Presentation Suite",version:"1.0.0",ownership:"THEGODMODS original vector artwork",status:"source-artwork-generated; target stadium mapping, texture export and in-game validation pending",installable:false,gameFilesModified:false,assets};
await writeFile(path.join(OUT,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(OUT,"README.md"),`# GOD STADIUMS Elite — Matchday Presentation Suite

Original sponsor-neutral stadium LED board and fascia artwork.

## Deliverables
- ${themes.length} wide-format 2048×512 LED board vector masters.
- ${ribbons.length} 2048×256 stadium fascia/ribbon masters.
- Matchday art-direction profile data.
- SHA-256 manifest for every source asset.

## Art direction
Broadcast Elite, European Night, Golden Hour, Cup Final, Heritage Classic, Rain Match, Natural Pitchside, Impact, GOD Signature and Minimal Neutral.

## Integration boundary
These are original SVG source masters. They are not PES 2017 DDS resources, stadium models, LiveCPK overlays, lighting injectors or mapped Stadium Server files. Convert artwork to a target texture only after confirming the exact stadium resource path, dimensions, pixel format, alpha convention and UV/material role. Never guess a resource name or shadow another Stadium Server asset. Existing game, patch and Stadium Server files remain untouched.

No club, league, competition, sponsor or real-stadium marks are included. Each source master can be adapted as a reversible GODMODS sidecar after target evidence is available.
`);
const readme=await readFile(path.join(OUT,"README.md"));
manifest.assets.push({file:"README.md",kind:"documentation",bytes:readme.length,sha256:createHash("sha256").update(readme).digest("hex")});
await writeFile(path.join(OUT,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
process.stdout.write(JSON.stringify({output:OUT,boards:themes.length,fascia:ribbons.length,assets:manifest.assets.length,installable:false})+"\n");
