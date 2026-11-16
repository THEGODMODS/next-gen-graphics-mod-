# PES 2017 Next Gen

A modular, Sider- and LiveCPK-based **enhancement platform** for Pro Evolution Soccer 2017 and existing patches such as YosfX.

## Product promise

GODMODS upgrades the player's existing PES 2017 experience. It does not replace the game, convert the patch, or overwrite original files. Original assets stay intact; GODMODS features are optional add-ons that can be enabled, disabled, and removed independently.

- Original GODMODS design and assets, using EA SPORTS FC, eFootball and UFL as quality references only.
- Optional Sider runtime modules and documented integrations.
- Optional LiveCPK virtual overlays for verified resources; original on-disk assets are never modified.
- Dedicated GODMODS namespace for profiles, assets, logs and manifests.
- Reversible installation, collision detection, backups and rollback.

See [the GODMODS Add-On Enhancement Standard](docs/GODMODS_ADDON_ENHANCEMENT_STANDARD.md) and [the six-department creative direction](docs/GODMODS_ORIGINAL_CREATIVE_DIRECTION.md).

## Six premium departments

| Department | GODMODS product | Enhancement focus |
|---|---|---|
| Graphics | GOD VISUALS | Broadcast polish, natural colour response, cinematic and time-of-day profiles |
| Stadiums & Turf | GOD STADIUMS + GOD TURF | Original venue presentation, LED artwork, premium pitch surfaces and matchday profiles |
| Kits & Equipment | GOD KITS | Fabric weave, stitching and material-detail overlays that preserve existing kit designs |
| Players | GOD FACES | Original skin microdetail and hair-fibre material enhancements for existing player appearances |
| Audio & Atmosphere | GOD ATMOSPHERE | Original layered crowd ambience and optional matchday sound enhancements |
| Gameplay | GOD GAMEPLAY | Opt-in simulation profiles and carefully tested supported gameplay extensions |

## Repository architecture

- `electron/`: Windows desktop app, Sider integration, DDS and pitch services.
- `src/`: department catalogue, UI, shared types and module engine.
- `content/originals/`: generated original source-asset workshop.
- `docs/`: creative direction, compatibility, safety and release standards.
- `tools/`: deterministic asset generation, DDS/pitch validation, signing and packaging.
- `.github/workflows/`: Windows quality and draft-release pipelines.

## Existing first-party content

The original-content generator creates source assets across all six departments: nine turf surface variants, GOD STADIUMS Elite artwork, kit fabric maps, GOD FACES skin/hair microdetail libraries, synthesized ambience/cues, gameplay profile designs, six foundational 17³ LUTs and the eight-look GOD VISUALS Elite 33³ colour suite. The project also builds 18 Sider Lua profiles (graphics, stadium/weather conditions, matchday and opt-in gameplay).

These are real GODMODS source deliverables, but generated assets are not automatically compatible with every YosfX resource or PES material. A virtual overlay is created only after exact target mapping and format validation. No original game or patch file is overwritten.

## Build and test

- `npm run mods:build-original` — generate original department source assets, including the stadium artwork suite.
- `npm run mods:build-stadiums` — independently generate GOD STADIUMS Elite artwork and manifest.
- `npm run mods:build-faces` — generate the standalone GOD FACES Premium Appearance Lab sidecar library.
- `npm run mods:build-visuals` — generate eight GOD VISUALS Elite 33³ colour-grade LUTs and their integrity manifest.
- `npm run mods:build-packs` — build the Sider add-on packages.
- `npm run mods:verify-packs` — verify package manifests and payloads.
- `npm test` — run automated tests.
- `npm run build` — run the complete production build.

The Windows quality workflow builds a test installer artifact. A successful CI build is not proof of in-game compatibility; each department still requires controlled testing on the exact PES 2017 + YosfX + Sider setup.

## Safety

Never edit original CPKs, game binaries, option files or the user's Stadium Server content. Any Sider configuration change must be minimal, backed up and reversible. LiveCPK virtual roots must be optional, collision-checked and namespaced. Uninstall must restore the user's prior configuration and leave unrelated files untouched.

## Licensing

Only distribute original assets or content for which redistribution permission has been obtained. Third-party tools and mods remain subject to their own licenses.

## GOD WEATHER + GOD MATCHDAY\n\nFour original Sider 3.5 match-condition packages cover fine day, rain day, rain night and winter night. They use documented PES 2017 condition values only; no unsupported snow, fog or wet-surface shader behavior is claimed. See [GOD WEATHER + GOD MATCHDAY](docs/GOD_WEATHER_MATCHDAY.md).\n\n## GOD TURF Premium Surface Lab\n\nNine original pitch surface families provide 27 DDS maps (albedo, normal source and roughness source) in an additive Stadium Server sidecar layout. Exact stadium material/resource binding remains evidence-gated. See [GOD TURF Premium](docs/GOD_TURF_PREMIUM.md).\n\n## GOD FACES Premium Appearance Lab

The first GOD FACES source release builds five neutral skin-detail profiles and four hair-fibre profiles (27 DDS source maps total) with SHA-256 manifests. These are original microdetail overlays, not replacement faces, player likenesses, meshes or roster assignments. UV/material mapping and in-game validation on the exact YosfX setup remain required before any LiveCPK integration. See [GOD FACES Premium Lab](docs/GOD_FACES_PREMIUM_LAB.md).

## GOD VISUALS Elite Colour Suite

Eight original 33×33×33 display-grade LUTs (35,937 entries each) with neutral reference, broadcast, stadium HDR, night, golden-hour, overcast, cinematic and grass/kit-fidelity looks. These are colour-grade source files, not a game shader injector; confirm the host colour space and a compatible PES 2017 adapter before use. See [GOD VISUALS Elite Colour Suite](docs/GOD_VISUALS_ELITE_COLOUR_SUITE.md).
