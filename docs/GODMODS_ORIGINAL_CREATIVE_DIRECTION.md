# GODMODS Original Creative Direction

## Product promise

THEGODMODS creates original football-game mods. Reference games are used to study quality, presentation and design principles; their proprietary assets, textures, code, logos, layouts and distinctive trade dress are not copied. Every shipped asset must be authored by THEGODMODS or explicitly licensed for redistribution.

The target is not "make PES look like another game". The target is a recognisable GODMODS identity that raises the visual, audio and gameplay quality of PES 2017 while respecting the actual engine and patch constraints.

## Four creative pillars

| Pillar | What we learn from the reference | GODMODS interpretation |
|---|---|---|
| EA SPORTS FC 27-inspired | Premium broadcast polish, clean presentation, high-quality surfaces and lighting | Refined, broadcast-ready realism with controlled contrast and crisp detail |
| eFootball-inspired | Material definition, believable pitch and stadium atmosphere | Fine surface detail, natural colour response and convincing matchday mood |
| UFL-inspired | Contemporary, energetic football presentation | Confident modern styling, purposeful contrast and clear visual identity |
| GODMODS original | No external game can define our ceiling | A signature look, original assets, consistent naming and a coherent identity across every department |

These are creative directions, not compatibility claims or instructions to reproduce another game's exact appearance.

## Stadiums & Turf: GOD TURF / GOD STADIUMS

### GOD TURF product family

Build a coherent collection rather than one universal replacement. Each look is an original art direction with a defined colour response, mowing language, wear pattern and intended stadium/weather use.

1. **GOD TURF — Broadcast Elite**: premium, tightly maintained match surface; balanced deep greens, crisp mowing bands and restrained wear.
2. **GOD TURF — ePitch Detail**: fine grass micro-detail and natural tonal variation; avoid noisy sharpening and artificial neon greens.
3. **GOD TURF — UFL Impact**: stronger pitch-side definition and a confident modern contrast profile while keeping the ball and line markings readable.
4. **GOD TURF — Heritage Natural**: softer, slightly varied grass tone, subtle divots and believable wear.
5. **GOD TURF — Rain Match**: darker damp surface response and controlled sheen; only author/use specular response when the target PES material supports it.
6. **GOD TURF — GOD Signature**: THEGODMODS flagship surface, combining realistic grass structure, distinctive but restrained mowing design, calibrated colour and stadium-scale consistency.

The existing six procedural surface variants are the starting source collection, not six proven in-game presets. Their albedo, normal-source and roughness-source maps must be checked against the actual target material. A source map is not automatically a supported game channel.

### GOD STADIUMS product family

Create original stadium presentation assets: LED/adboard artwork, tunnel and entrance dressing where resource mappings exist, stadium lighting/atmosphere profiles and matchday details. Keep every stadium-specific package separate and mapped to a verified Stadium Server stadium/resource. Never overwrite the user's Stadium Server folder or assume one resource path works across all venues.

### Required first release

The first public content target is one stadium-specific GOD TURF release, not a universal pack:
- one user-selected YosfX Stadium Server stadium;
- local pitch inventory and baseline captures;
- exact resource path and texture-role evidence;
- original authored texture at the required dimensions, encoding, channels and mip count;
- package manifest, hashes, provenance and rollback plan;
- controlled one-file-at-a-time test and matched in-game screenshots.

No resource path, shader channel, stadium ID or compression format is to be guessed. Do not bundle extracted proprietary stadium files.

## The same creative standard across every department

| Department | Product direction | Original GODMODS signature |
|---|---|---|
| Graphics | FC-style broadcast polish, eFootball-like natural material response, UFL-like confident presentation | GOD VISUALS: consistent colour science, readable gameplay, signature matchday grade |
| Stadiums & Turf | Premium pitch surfaces and stadium atmosphere | GOD TURF + GOD STADIUMS: venue-aware original surfaces and presentation |
| Kits & Equipment | Premium fabric/material detail and clean kit presentation | GOD KITS: original fabric systems and UV-aware enhancement layers that preserve the user's kit identity |
| Players | Modern player-detail quality and believable skin/hair response | GOD FACES: rights-cleared, roster-mapped original appearance work with consistent quality |
| Audio & Atmosphere | Immersive stadium scale, layered crowd and event-aware sound | GOD ATMOSPHERE: original sound identity, balanced mix and verified event mapping |
| Gameplay | Responsive, coherent football with deliberate match tempo | GOD GAMEPLAY: original tuning profiles, transparent parameters and repeatable scenario tests |

Every department must produce actual content, not only a configuration label or an authoring tool. Where the engine does not expose a feature, mark it as unavailable or experimental instead of simulating a claim.

## Asset production and release gates

For each product:
1. Write an art brief with reference pillars and a distinct GODMODS signature.
2. Author editable source assets and deterministic exports.
3. Record provenance, licence, generator/tool version, dimensions, format, channels and SHA-256.
4. Validate the exact PES 2017 patch, Sider version, resource mapping and runtime loader.
5. Compare against a clean baseline under matched camera, stadium, weather, time and graphics settings.
6. Test performance, visual defects, install, disable and rollback.
7. Publish only the compatibility actually demonstrated.

A generated preview, valid DDS header, successful CI build or catalogue entry is not proof of an in-game mod. Product states must distinguish concept, generated source asset, mapped package, and in-game verified release.

## Current status

The repository already generates original GOD TURF source maps and original assets across the six departments. GOD PITCH LAB provides inventory and package-authoring tools. The next creative step is to turn the existing source library into a deliberately art-directed, stadium-specific GOD TURF release using the user's YosfX installation as the compatibility target. The actual stadium inventory and controlled in-game test evidence are still required.
