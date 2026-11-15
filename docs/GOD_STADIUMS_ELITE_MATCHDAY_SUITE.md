# GOD STADIUMS Elite — Matchday Presentation Suite

## Original assets

The Elite suite adds a distinct GODMODS stadium identity through ten sponsor-neutral 2048×512 LED board masters and four 2048×256 fascia/ribbon masters:

- Broadcast Elite
- European Night
- Golden Hour
- Cup Final
- Heritage Classic
- Rain Match
- Natural Pitchside
- Impact
- GOD Signature
- Minimal Neutral

All vector masters are generated deterministically by `tools/build-god-stadiums-elite.mjs`. The output includes an art-direction profile and SHA-256 manifest.

## What this is — and is not

This is a real original artwork source pack. It is not a stadium model, texture injector, DDS resource pack, lighting mod, or ready-to-install Stadium Server overlay. SVG source masters must be exported to the exact dimensions and format required by a verified stadium resource. Do not invent a resource filename, material role, UV layout, alpha convention, or stadium ID.

## Safe integration plan

1. Select one existing YosfX Stadium Server stadium.
2. Inventory its actual resources and identify the LED/fascia texture from evidence.
3. Record exact internal path, dimensions, pixel format, mip count, alpha use and material/UV mapping.
4. Export one selected GODMODS artwork variant to that verified target specification.
5. Package only the namespaced GODMODS overlay, with collision detection and hashes.
6. Test on/off, original fallback, performance and visual quality in PES 2017.
7. Keep each stadium mapping separate; never edit or replace the user's Stadium Server files on disk.

## Build

- `npm run mods:build-stadiums` — build this suite independently.
- `npm run mods:build-original` — includes the suite in the complete original-content build.

The package manifest deliberately reports `installable: false` until mapping, compatibility and in-game validation are complete.
