# Phase 5 — THEGODMODS Original Content Library

This phase turns the six-department Originals roadmap into actionable production briefs. The source of truth is `src/catalogue/original-content.ts`; every original product line has a stable package identity, department, style direction, deliverables, required source assets, acceptance checks, rights policy and preview plan.

## Production tracks

| Department | Original line | Production focus |
|---|---|---|
| Graphics | GOD VISUALS | Natural, balanced visual foundation |
| Graphics | GOD CINEMATIC | Restrained cinematic match presentation |
| Graphics | GOD NATURAL | Neutral colour and low-processing realism |
| Stadiums & Turf | GOD TURF | Original grass/pitch textures and mapping |
| Stadiums & Turf | GOD STADIUMS | Stadium presentation add-ons and mapped resources |
| Stadiums & Turf | GOD PITCH LAB | Source-texture inventory, DDS validation and reproducible module authoring |
| Kits & Equipment | GOD KITS | Team/season kit and equipment collections |
| Players | GOD FACES | Rights-cleared player appearance packs |
| Audio & Atmosphere | GOD ATMOSPHERE | Original/licensed anthems, chants and matchday audio |
| Gameplay | GOD GAMEPLAY | Versioned Lua/config tuning with repeatable scenarios |

## Status semantics

- `brief-ready`: the production brief and acceptance criteria exist; no asset bundle is implied.
- `tooling-prototype`: the project has supporting authoring/inspection tools, but is not a finished downloadable content pack.
- A future `released` state must only be assigned after real assets, provenance, package hashes, manifest validation, signing, automated rollback tests and real PES 2017/Sider evidence exist.

The UI deliberately does not add install buttons to these briefs. No sample textures, player likenesses, club marks, copyrighted audio or extracted game files are fabricated or bundled.

## Content production contract

For every asset, retain:
- Original editable source and exported runtime asset.
- Creator/author, creation date, source provenance and applicable licence.
- Exact PES 2017 patch, executable and Sider compatibility.
- Resource/player/team/event mapping where applicable.
- SHA-256, dimensions/codec/format and package version.
- Before/after preview evidence and test notes.
- Install, disable, update and rollback test evidence.

## Department acceptance

- **Graphics:** colour/lighting consistency, DDS integrity and real-match visual review.
- **Stadiums & Turf:** resource mapping, tile seams, DDS/mipmap checks and Stadium Server/Sider load tests.
- **Kits & Equipment:** team/season/slot mapping, texture integrity and in-game kit assignment.
- **Players:** player IDs, likeness permissions, model/texture integrity and in-game appearance.
- **Audio & Atmosphere:** per-recording rights, codec/sample rate, loudness, event mapping and trigger tests.
- **Gameplay:** Lua/config validation, exact build compatibility, repeatable scenarios and stability.

## First production candidate

GOD PITCH LAB is the most tooling-ready candidate because the repository already contains pitch inventory, DDS inspection/comparison, pitch mapping and module-builder workflows. It still requires a real PES 2017 stadium inventory and rights-cleared source textures before a content package can be built or verified. Do not mistake the authoring tool for a completed turf pack.

## Original assets now generated

Run `npm run mods:build-original` to create deterministic, original source assets under `content/originals/generated/`:

- **GOD TURF:** three 512×512 RGBA8 DDS grass surfaces (Natural Cut, Stadium Emerald and Heritage Worn), each with a complete mip chain and SHA-256 record.
- **GOD VISUALS / GOD NATURAL / GOD CINEMATIC:** three authored creative preset profiles with restrained broadcast, neutral realism and cinematic-matchday directions.

The generator uses only Node built-ins and is executed by the Windows quality workflow. These are genuine THEGODMODS-created source assets, not borrowed game files. The generated turf textures are uncompressed RGBA8 DDS; a target PES shader may require another format or resource layout, so conversion/mapping and in-game verification remain mandatory. The profiles are creative parameter targets, not claims that PES 2017 exposes those controls directly.


## Six-department generated source collection

The build now creates **seven original product packages across all six departments** (Graphics has three named profiles grouped into GOD VISUALS; Stadiums & Turf has GOD TURF and GOD STADIUMS):

| Department | Generated product | Actual deliverables |
|---|---|---|
| Graphics | GOD VISUALS | Three creative visual profiles: balanced broadcast, neutral realism and cinematic matchday |
| Stadiums & Turf | GOD TURF | Three original 512×512 RGBA8 DDS textures with full mip chains and SHA-256 records |
| Stadiums & Turf | GOD STADIUMS | Sponsor-neutral original LED/adboard artwork |
| Kits & Equipment | GOD KITS | Four fictional, sponsor-free kit design plates |
| Players | GOD FACES | Generic procedural skin-detail DDS source texture; no real-person likeness |
| Audio & Atmosphere | GOD ATMOSPHERE | Original synthesized crowd ambience and matchday horn WAV files |
| Gameplay | GOD GAMEPLAY | Documented simulation tuning profile and safe no-op Lua integration stub |

Run `npm run mods:build-original`. Windows CI runs this command and publishes the generated `content/originals/generated/` folder as a downloadable workflow artifact named `thegodmods-original-content-<commit>`. Each product folder contains a package descriptor, per-file SHA-256 hashes and a README describing its exact scope.

**Installability remains false by design.** The output is a real original source-content collection, but it is not yet a set of PES-ready replacement packages. We do not guess DDS compression/shader requirements, stadium/kit/player/audio IDs, Sider hook APIs or engine controls. Each target-specific adapter and mapping must pass the module manifest checks, Windows tests, rollback checks and real-game validation before the manager enables one-click installation. The generic face texture is not a player face; the kit plates are not mapped club kits; synthesized ambience is not a chant/anthem library; and the gameplay stub does not modify physics or AI.

## Remaining production work

These generated assets are the first real content tranche, not all ten finished product lines. GOD STADIUMS still needs original stadium artwork and verified stadium resource IDs; GOD KITS needs original kit designs and slot mappings; GOD FACES needs commissioned/authorized likeness assets; GOD ATMOSPHERE needs original recordings and event mappings; GOD GAMEPLAY needs a verified Sider API/config adapter and repeatable in-game tests. No package is labelled installable until its actual deployment mapping, compatibility, rights and rollback are validated.

## Premium asset expansion

The original asset workshop now expands the source collection substantially:

- **GOD VISUALS:** six authored visual profiles and six 17³ 3D LUTs in standard .cube source format.
- **GOD TURF:** six pitch looks, each with albedo, derived normal-source and roughness-source DDS maps (18 DDS maps total), full mip chains, dimensions and SHA-256 integrity records.
- **GOD STADIUMS:** five sponsor-neutral editable LED/adboard artwork concepts.
- **GOD KITS:** eight original fictional, sponsor-free kit design plates.
- **GOD FACES:** four procedural skin-tone source textures and one procedural hair-detail source texture. These are not face models or real-player likenesses.
- **GOD ATMOSPHERE:** five synthesized WAV source clips: crowd beds/swell, matchday horn and whistle tone. They are not recorded chants, club anthems or commentary.
- **GOD GAMEPLAY:** three distinct tactical/tempo design profiles and a safe Lua stub that registers no undocumented engine hooks.

Every product descriptor records source ownership, version, per-file size and SHA-256, scope and explicit integration status. CI tests the expected asset counts and publishes the generated source library as an artifact.

These assets are materially richer authoring deliverables, but they are still not falsely marked as game-ready. .cube LUTs need a supported post-processing adapter; turf normal/roughness channels need a verified PES material shader; stadium boards and kit plates need UV conversion and resource mapping; face sources need proper commissioned meshes/likeness permissions; audio needs PES event mapping and mastering; gameplay profiles need a supported adapter and repeatable match tests.


The Windows app build now runs the original asset generator before packaging and includes `content/originals/generated/**/*` in the Electron application payload. The catalogue project-detail panel reports which original source files exist and clearly separates generated source assets from game-ready, one-click installable mods.


## EA SPORTS FC 27-inspired / PES 2017-native upgrade tranche

Research and implementation notes: see [EAFC27_PES2017_RESEARCH_UPGRADE.md](EAFC27_PES2017_RESEARCH_UPGRADE.md).

- GOD KITS is explicitly an **existing kit appearance enhancement**, not a new-kit generator. Four fabric families provide 12 DDS source maps (diffuse weave overlay, normal and roughness). They must be UV-masked onto existing kit textures; no blind/global replacement or unsupported material channel is assumed.
- GOD VISUALS now includes six native Sider 3.5 graphics profiles and a Lua adapter for documented brightness, sharpness, player-shadow softness and reflection properties, in addition to the 17³ LUT source grades.
- GOD GAMEPLAY now includes a documented Sider gameplay-library adapter and three conservative profiles. It is disabled by default because Sider's own guide labels these properties experimental and warns about side effects.
- GOD STADIUMS includes a disabled-by-default adapter for documented time-of-day/weather/season conditions; it never invents stadium IDs.
- GOD TURF uses seeded pitch generation so the six variants have distinct mowing/wear patterns; each has albedo, normal-source and roughness-source DDS maps.
- GOD FACES adds procedural skin micro-normal and hair detail sources. No real-player likenesses or face meshes are claimed.
- All Sider Lua modules use documented PES 2017 Sider 3.5 events/APIs. Manual Sider registration is described; no automatic module activation is forced.

Still required before one-click releases: inspect the actual installed PES 2017 patch's kit UVs, LiveCPK paths, stadium texture resource IDs, Sider build and shader channel support; perform identical-condition before/after match captures, performance checks and rollback validation. No unsupported EAFC proprietary assets or third-party mod packages are copied.
