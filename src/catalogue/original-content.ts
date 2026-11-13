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
    productionState: "brief-ready",
    goal: "A coherent visual foundation for PES 2017 with balanced colour, readable detail and consistent match presentation.",
    styleDirection: "Natural realism first: controlled saturation, believable contrast, neutral whites and stable daylight/night lighting.",
    deliverables: ["Base visual preset and documented install profile", "Texture replacement modules only where source assets and mappings are verified", "Before/after captures from the same stadium, camera and weather conditions"],
    assetRequirements: ["Original or licensed LUT/colour-grade source", "Documented shader/config changes where supported", "Verified DDS textures with dimensions, format and colour-space notes", "Preview captures from a real PES 2017 match"],
    acceptanceChecks: ["No crushed blacks, clipped highlights or oversaturated pitch/skin tones", "No missing texture references or visual regressions across tested weather/lighting", "DDS files pass structural validation and load in-game", "Rollback restores the exact previous visual state"],
    rightsPolicy: "All authored presets and textures must be original or explicitly licensed; never bundle extracted commercial game assets.",
    previewPlan: ["Daylight wide shot", "Night match floodlights", "Close player/grass detail", "Side-by-side baseline comparison"]
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
    productionState: "brief-ready",
    goal: "High-quality original player appearance packages with reliable player ID mapping and transparent creator provenance.",
    styleDirection: "Consistent in-game likeness quality, realistic skin response and clean hairline/texture transitions.",
    deliverables: ["Player appearance modules", "Player ID and roster compatibility map", "Creator credits and update history", "In-game preview captures"],
    assetRequirements: ["Original or licensed face/hair source assets", "Player identity and ID mapping", "Texture/mesh format notes", "Explicit likeness and redistribution rights"],
    acceptanceChecks: ["Correct player ID and roster assignment", "No face/hair mismatch or broken model references", "Texture quality and skin tone reviewed in-game", "No unlicensed third-party face assets"],
    rightsPolicy: "Use only commissioned, creator-authorized or otherwise rights-cleared likeness assets; public availability is not permission.",
    previewPlan: ["Face close-up", "In-game broadcast camera", "Lighting variation", "Player ID and roster context"]
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
  "GOD VISUALS": { summary: "Six original 17³ LUT grades plus six native Sider 3.5 graphics profiles and a Lua adapter for brightness, sharpness, player-shadow softness and reflection.", files: ["profiles.json", "luts/*.cube", "sider/modules/godmods_gfx.lua", "sider/content/godmods/profiles/*.ini"], readiness: "Native Sider controls are implemented against documented APIs; validate each profile in daylight, night, rain and replay on the target PES 2017/Sider build." },
  "GOD CINEMATIC": { summary: "Cinematic matchday profile and original 3D LUT source.", files: ["profiles.json", "luts/cinematic-matchday.cube", "luts/european-evening.cube"], readiness: "Source grades generated; supported shader adapter and in-game validation pending." },
  "GOD NATURAL": { summary: "Natural realism, daylight and overcast profiles with original LUT sources.", files: ["profiles.json", "luts/natural-realism.cube", "luts/sunlit-daylight.cube", "luts/overcast-realism.cube"], readiness: "Source grades generated; supported shader adapter and in-game validation pending." },
  "GOD TURF": { summary: "Six original pitch looks with 18 DDS source maps: albedo, normal and roughness.", files: ["pack.json", "surface-library.json", "textures/*-albedo.dds", "textures/*-normal-source.dds", "textures/*-roughness-source.dds"], readiness: "Source maps generated; PES material channels, DDS target format and stadium resource mapping need verification." },
  "GOD STADIUMS": { summary: "Five original sponsor-neutral LED/adboard SVG masters plus a disabled-by-default Sider weather/time/season conditions adapter.", files: ["artwork/led-board-*.svg", "sider/modules/godmods_conditions.lua"], readiness: "Conditions adapter uses documented Sider events; stadium artwork still needs stadium-specific texture mapping and real-game verification." },
  "GOD KITS": { summary: "Four original fabric families with 12 DDS source maps: diffuse weave overlays, normal and roughness sources. This improves existing kits worn by players; it does not create new kits.", files: ["materials/*-diffuse-overlay.dds", "materials/*-normal-source.dds", "materials/*-roughness-source.dds", "materials/material-library.json"], readiness: "Material source layers generated. Apply as masked layers to existing kit UV textures; confirm kit shader channels and texture path mappings before any automated installation." },
  "GOD FACES": { summary: "Four procedural skin-tone textures and one hair-detail texture.", files: ["textures/*-detail-source.dds", "textures/procedural-hair-detail-source.dds"], readiness: "Generic texture sources generated; no face meshes, player likenesses or roster IDs included." },
  "GOD ATMOSPHERE": { summary: "Five original synthesized WAV source clips.", files: ["audio/*.wav"], readiness: "Audio sources generated; mastering, PES codec and event mapping pending." },
  "GOD GAMEPLAY": { summary: "Three conservative Sider gameplay-library profiles and a Lua adapter using documented ball and player tuning properties.", files: ["profiles/*.json", "sider/modules/godmods_gameplay.lua", "sider/content/godmods/gameplay/*.ini"], readiness: "Adapter is opt-in and disabled by default. Sider marks these gameplay controls experimental; match-scenario testing is mandatory." }
};
export function getGeneratedAssetStatus(name: string): GeneratedAssetStatus | undefined {
  return generatedAssetStatus[name];
}
