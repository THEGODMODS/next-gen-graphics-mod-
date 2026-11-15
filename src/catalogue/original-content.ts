import type { DepartmentId } from "./departments";

export interface OriginalContentProject {
  id: string;
  name: string;
  department: DepartmentId;
  productLine: string;
  productionState: "brief-ready" | "tooling-prototype";
  goal: string;
  styleDirection: string;
  deliverables: string[];
  assetRequirements: string[];
  acceptanceChecks: string[];
  rightsPolicy: string;
  previewPlan: string[];
}

export const originalContentProjects: OriginalContentProject[] = [
  {
    id: "thegodmods.god-visuals", name: "GOD VISUALS", department: "graphics", productLine: "Graphics",
    productionState: "tooling-prototype",
    goal: "A premium colour-management source suite for PES 2017 match presentation, with natural skin response, faithful kits and readable stadium contrast.",
    styleDirection: "Broadcast realism first: controlled saturation, neutral whites, soft highlight roll-off, preserved shadow detail and restrained cinematic split-toning.",
    deliverables: ["Eight original 33³ display-grade LUTs and a neutral identity reference", "Six foundational 17³ colour profiles retained for backward compatibility", "Colour-space/host integration guidance and SHA-256 manifests", "Matched in-game daylight, night and overcast comparison captures after adapter verification"],
    assetRequirements: ["THEGODMODS-authored .cube LUT source and manifest", "Verified host input/output primaries and transfer function", "Documented compatible post-processing adapter for the target PES 2017/YosfX setup", "Matched baseline and graded captures from the same stadium, camera and weather"],
    acceptanceChecks: ["Every 33³ LUT has 35,937 finite RGB entries in range", "Neutral Reference is an identity transform", "No crushed blacks, clipped highlights or skin/kit/pitch colour shifts", "No LUT stacking or undocumented colour-space conversion", "Disable restores the ungraded host output", "Real-game validation passes daylight, night and overcast conditions"],
    rightsPolicy: "All authored LUTs and presets are original; never bundle extracted commercial game assets or proprietary shader files.",
    previewPlan: ["Neutral reference versus Broadcast Natural", "Night floodlights with European Night Elite", "Golden Hour and Overcast comparison", "Same player/kit/pitch before and after"]
  },
  {
    id: "thegodmods.god-cinematic", name: "GOD CINEMATIC", department: "graphics", productLine: "Graphics",
    productionState: "brief-ready",
    goal: "A cinematic matchday presentation variant without sacrificing gameplay visibility.",
    styleDirection: "Controlled filmic contrast, realistic highlight roll-off and restrained atmosphere; no permanent heavy tint.",
    deliverables: ["Cinematic visual profile", "Compatible optional lighting assets/configuration", "Documented toggle and reset instructions"],
    assetRequirements: ["Original colour-grade parameters", "Any authored lighting textures with provenance", "Exact supported Sider/config requirements", "Real-match comparison captures"],
    acceptanceChecks: ["Ball, player and pitch remain clearly readable", "Day/night transitions do not produce extreme exposure", "No conflict with GOD VISUALS base profile", "Disable returns to the previous profile"],
    rightsPolicy: "Use original grading work and original/licensed textures only.",
    previewPlan: ["Day match", "Night match", "Tunnel/entrance if supported", "Gameplay visibility comparison"]
  },
  {
    id: "thegodmods.god-natural", name: "GOD NATURAL", department: "graphics", productLine: "Graphics",
    productionState: "brief-ready",
    goal: "A low-processing, natural-colour alternative for players who dislike exaggerated visual effects.",
    styleDirection: "Neutral whites, realistic grass, skin tones and kit colours; minimal bloom and restrained sharpening.",
    deliverables: ["Natural colour preset", "Compatibility notes", "Reference capture set"],
    assetRequirements: ["Original preset values", "Texture changes only when necessary and rights-cleared", "Reference images and test environment notes"],
    acceptanceChecks: ["Kit colours remain faithful", "Grass and skin tones avoid green/orange casts", "No excessive sharpening or haloing", "Profile can be cleanly disabled"],
    rightsPolicy: "Preset and authored assets must be original or appropriately licensed.",
    previewPlan: ["Neutral daylight", "Overcast conditions", "Player close-up", "Kit colour reference"]
  },
  {
    id: "thegodmods.god-turf", name: "GOD TURF", department: "stadiums", productLine: "Stadiums & Turf",
    productionState: "brief-ready",
    goal: "A family of original pitch surfaces and grass looks with consistent mapping and stadium compatibility.",
    styleDirection: "Natural grass variation, controlled wear, believable mowing patterns and stadium-specific colour calibration.",
    deliverables: ["Turf texture variants", "Pitch resource-to-texture mapping sheet", "LiveCPK/Sider package per verified mapping", "Preview and compatibility matrix"],
    assetRequirements: ["Original tileable grass albedo/detail maps", "Normal/specular maps only where the PES shader supports them", "DDS export with recorded dimensions/format/mipmaps", "Source stadium pitch inventory and mapping evidence"],
    acceptanceChecks: ["No visible tiling seams at gameplay camera distance", "Correct UV/resource mapping for each supported stadium", "DDS format and mip chain validated", "No pitch corruption, crashes or unexpected stadium changes"],
    rightsPolicy: "Textures must be authored by THEGODMODS or licensed for redistribution; stadium/game files are not bundled.",
    previewPlan: ["Centre circle", "Touchline and goal area", "Wide gameplay camera", "Rain/wet conditions where supported"]
  },
  {
    id: "thegodmods.god-stadiums", name: "GOD STADIUMS", department: "stadiums", productLine: "Stadiums & Turf",
    productionState: "brief-ready",
    goal: "Original stadium presentation add-ons such as adboards, lighting and atmosphere modules, kept separate from stadium geometry owned by others.",
    styleDirection: "Authentic matchday presentation, coherent sponsor-neutral or properly licensed branding and stable stadium identity.",
    deliverables: ["Individually mapped stadium presentation modules", "Stadium Server compatibility notes", "Per-stadium previews and uninstall manifests"],
    assetRequirements: ["Original adboard artwork or licensed brand assets", "Verified stadium IDs and resource paths", "DDS exports and source files", "Stadium Server/Sider test logs"],
    acceptanceChecks: ["Correct stadium identity and resource mapping", "No unlicensed sponsor/club marks", "No cross-stadium resource leakage", "Uninstall restores original resources"],
    rightsPolicy: "Club marks, sponsor logos and stadium imagery require permission or must be replaced with original generic artwork.",
    previewPlan: ["Wide stadium panorama", "Pitch-side adboards", "Night lighting", "Stadium-specific identity details"]
  },
  {
    id: "thegodmods.god-pitch-lab", name: "GOD PITCH LAB", department: "stadiums", productLine: "Stadiums & Turf",
    productionState: "tooling-prototype",
    goal: "An authoring and validation workbench for building pitch packages from user-supplied, rights-cleared source textures.",
    styleDirection: "Repeatable, measurable texture production rather than a pre-made texture pack.",
    deliverables: ["Pitch resource inventory", "DDS validation and comparison reports", "Freshness-checked module build from selected source files", "Reproducible package manifest and hashes"],
    assetRequirements: ["User-supplied or THEGODMODS-authored source textures", "A real target stadium pitch inventory", "Explicit resource mapping and compatibility record"],
    acceptanceChecks: ["Build fails on stale inventory or changed source hashes", "Every mapped texture exists and passes format checks", "Generated module contains only selected, declared assets", "Install preview and rollback succeed"],
    rightsPolicy: "The tool does not grant rights to input textures; users must supply assets they own or may redistribute.",
    previewPlan: ["Inventory report", "DDS preview", "Mapping comparison", "Generated module contents"]
  },
  {
    id: "thegodmods.god-kits", name: "GOD KITS", department: "kits", productLine: "Kits & Equipment",
    productionState: "brief-ready",
    goal: "Upgrade the appearance of the kits players already wear: more believable fabric response, weave detail, seams, folds, collar/cuff definition and accurate colour reproduction.",
    styleDirection: "EAFC-inspired premium material presentation without replacing club identity or inventing new team kits; restrained cloth texture, crisp printed details and natural highlights.",
    deliverables: ["Reusable fabric enhancement source maps", "Masked UV overlay workflow for existing kit textures", "Material/shader compatibility notes", "Before/after player-view comparison and rollback-safe texture package"],
    assetRequirements: ["Existing kit UV textures supplied by the installed patch or user", "Original procedural fabric weave, stitching and material source maps", "Verified texture dimensions, alpha handling and DDS format", "Known kit texture paths/IDs before any automated replacement"],
    acceptanceChecks: ["Existing club kits remain unchanged in design and identity", "Fabric details follow the correct UV islands without bleeding", "Crests, sponsors, names and numbers remain crisp", "No plastic shine, moire, seams or visible texture tiling", "Uninstall restores the exact previous kit textures"],
    rightsPolicy: "Do not redistribute extracted third-party kit textures; apply original enhancement layers to user-owned or properly licensed kit assets.",
    previewPlan: ["Close-up shirt fabric under daylight", "Night-match floodlight comparison", "Sleeve/collar/cuff and shorts detail", "Same player and same existing kit before/after"]
  },
  {
    id: "thegodmods.god-faces", name: "GOD FACES", department: "players", productLine: "Players",
    productionState: "tooling-prototype",
    goal: "Premium skin microdetail and hair-fibre material enhancements for existing player appearances, without replacing player identity.",
    styleDirection: "Broadcast-ready close-camera realism: restrained pore scale, believable skin response, clean hair-fibre definition and stable daylight/night appearance.",
    deliverables: ["Five original skin microdetail profiles and four hair-fibre profiles", "Neutral overlay, normal-source and roughness-source maps with SHA-256 manifest", "Verified UV/material mapping workflow for existing faces and hair", "Matched in-game before/after captures and rollback-safe optional package"],
    assetRequirements: ["THEGODMODS-authored skin and hair microdetail maps", "Rights-cleared existing player face/hair source supplied by the user or patch owner", "Verified face/hair UV layout, resource path and material channel conventions", "Explicit likeness and redistribution rights for any future player-specific work"],
    acceptanceChecks: ["Existing player identity, skin colour, tattoos, facial hair and hairline remain intact", "No UV seams, pore tiling or hair-pattern moiré at close and broadcast camera distances", "Normal/roughness channels match the target shader", "Correct roster/resource mapping is evidenced before install", "Disable restores the untouched player appearance", "No unlicensed third-party likeness assets"],
    rightsPolicy: "The current lab contains only neutral original procedural microdetail, not likenesses. Any player-specific appearance asset must be commissioned or explicitly authorized for redistribution; public availability is not permission.",
    previewPlan: ["Skin detail close-up under daylight", "Night floodlight close-up", "Hairline/fibre detail", "Same existing player and camera before/after"]
  },
  {
    id: "thegodmods.god-atmosphere", name: "GOD ATMOSPHERE", department: "audio", productLine: "Audio & Atmosphere",
    productionState: "brief-ready",
    goal: "A matchday audio library with properly licensed or original anthems, chants, crowd beds and event sounds.",
    styleDirection: "Clear, stadium-scale sound with consistent loudness and smooth transitions; preserve commentary intelligibility.",
    deliverables: ["Audio event packs", "Team/competition trigger mapping", "Codec/sample-rate metadata", "Rights ledger and in-game audio test notes"],
    assetRequirements: ["Original recordings or written redistribution licences for every recording", "Source/edited master and edit notes", "Target codec, sample rate, channel and duration", "Event/slot mapping for PES 2017"],
    acceptanceChecks: ["Every clip decodes and matches declared format", "No clipping, abrupt cuts or severe loudness mismatch", "Correct anthem/chant/event triggers", "No copyrighted music or recordings without explicit rights"],
    rightsPolicy: "Audio rights must be documented per recording; do not assume a chant or anthem is free to redistribute.",
    previewPlan: ["Short authorized audio preview", "Event trigger demonstration", "Loudness/format report", "Rights and creator credit"]
  },
  {
    id: "thegodmods.god-gameplay", name: "GOD GAMEPLAY", department: "gameplay", productLine: "Gameplay",
    productionState: "brief-ready",
    goal: "Versioned gameplay tuning and extensions with repeatable scenario testing and clear compatibility boundaries.",
    styleDirection: "Believable match tempo and player response; avoid arbitrary claims of realism without repeatable evidence.",
    deliverables: ["Versioned gameplay configuration/Lua packages", "Change log and parameter rationale", "Scenario test matrix", "Known limitations and safe reset path"],
    assetRequirements: ["Original Lua/config source", "Exact target executable, patch and Sider versions", "Baseline and modified parameter records", "Reproducible test scenarios and logs"],
    acceptanceChecks: ["Lua/config syntax and schema validation", "No unmanaged executable modification", "Repeatable scenario results across declared builds", "Disable/uninstall restores original behavior"],
    rightsPolicy: "Code and configuration must be original or licensed; do not redistribute proprietary game executables or protected data.",
    previewPlan: ["Parameter change summary", "Scenario comparison", "Match footage from declared build", "Compatibility and known-issues panel"]
  }
];

export function getOriginalContentProject(name: string): OriginalContentProject | undefined {
  return originalContentProjects.find(project => project.name === name);
}

export interface GeneratedAssetStatus {
  summary: string;
  files: string[];
  readiness: string;
}
const generatedAssetStatus: Record<string, GeneratedAssetStatus> = {
  "GOD ATMOSPHERE": { summary: "25 original synthesized club identity stingers and four generic stereo stadium ambience beds, with PCM WAV metadata and SHA-256 integrity manifest.", files: ["clubs/*-identity-stinger.wav", "beds/*.wav", "manifest.json", "README.md"], readiness: "Original source audio generated; listening review, commentary loudness mastering, patch-specific event/team mapping and in-game Sider validation remain required. No copyrighted chants or anthems are included." },
  "GOD VISUALS": { summary: "Six original 17³ LUT grades plus six native Sider 3.5 graphics profiles and a Lua adapter for brightness, sharpness, player-shadow softness and reflection.", files: ["profiles.json", "luts/*.cube", "sider/modules/godmods_gfx.lua", "sider/content/godmods/profiles/*.ini"], readiness: "Native Sider controls are implemented against documented APIs; validate each profile in daylight, night, rain and replay on the target PES 2017/Sider build." },
  "GOD CINEMATIC": { summary: "Cinematic matchday profile and original 3D LUT source.", files: ["profiles.json", "luts/cinematic-matchday.cube", "luts/european-evening.cube"], readiness: "Source grades generated; supported shader adapter and in-game validation pending." },
  "GOD NATURAL": { summary: "Natural realism, daylight and overcast profiles with original LUT sources.", files: ["profiles.json", "luts/natural-realism.cube", "luts/sunlit-daylight.cube", "luts/overcast-realism.cube"], readiness: "Source grades generated; supported shader adapter and in-game validation pending." },
  "GOD TURF": { summary: "Six original pitch looks with 18 DDS source maps: albedo, normal and roughness.", files: ["pack.json", "surface-library.json", "textures/*-albedo.dds", "textures/*-normal-source.dds", "textures/*-roughness-source.dds"], readiness: "Source maps generated; PES material channels, DDS target format and stadium resource mapping need verification." },
  "GOD STADIUMS": { summary: "Ten original 2048×512 LED board vector masters, four 2048×256 fascia masters, matchday art-direction data and SHA-256 manifest, alongside the optional Sider conditions adapter.", files: ["boards/*.svg", "fascia/*.svg", "profiles/matchday-art-direction.json", "manifest.json", "sider/modules/godmods_conditions.lua"], readiness: "Original source artwork generated; stadium-specific texture export, resource mapping and in-game verification remain required. No lighting injector or stadium overlay is claimed." },
  "GOD KITS": { summary: "Four original fabric families with 12 DDS source maps: diffuse weave overlays, normal and roughness sources. This improves existing kits worn by players; it does not create new kits.", files: ["materials/*-diffuse-overlay.dds", "materials/*-normal-source.dds", "materials/*-roughness-source.dds", "materials/material-library.json"], readiness: "Material source layers generated. Apply as masked layers to existing kit UV textures; confirm kit shader channels and texture path mappings before any automated installation." },
  "GOD FACES": { summary: "Four procedural skin-tone textures and one hair-detail texture.", files: ["textures/*-detail-source.dds", "textures/procedural-hair-detail-source.dds"], readiness: "Generic texture sources generated; no face meshes, player likenesses or roster IDs included." },
  "GOD GAMEPLAY": { summary: "Three conservative Sider gameplay-library profiles and a Lua adapter using documented ball and player tuning properties.", files: ["profiles/*.json", "sider/modules/godmods_gameplay.lua", "sider/content/godmods/gameplay/*.ini"], readiness: "Adapter is opt-in and disabled by default. Sider marks these gameplay controls experimental; match-scenario testing is mandatory." }
};
export function getGeneratedAssetStatus(name: string): GeneratedAssetStatus | undefined {
  return generatedAssetStatus[name];
}
