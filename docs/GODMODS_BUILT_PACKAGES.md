# GODMODS enhancement packages

THEGODMODS enhances PES 2017 while preserving the user's existing game, patch, kits and stadium selections. Every package installs into its own folder under the game's `content/GODMODS/<Department>/<ModName>/` directory. No package uses LiveCPK and no package automatically edits `sider.ini`.

## Install workflow

1. Scan the built-in package library in the manager.
2. Preview the selected mod and tap Install.
3. The manager writes the package's files into its own dedicated folder under `content/GODMODS`, with hash verification and reversible ownership tracking.
4. The user manually copies that mod's Lua file into the Sider `modules` folder and adds its filename to `lua.module` in `sider.ini`.
5. The user can remove the package from the manager; manager-owned unchanged files are removed safely.

## Installable Lua module catalogue

The current build creates thirteen separate modules:

- Graphics profiles: GOD NATURAL, GOD CINEMATIC, GOD VISUALS Broadcast, EA FC 27 Inspired, eFootball 27 Inspired, UFL Inspired and ISS Pure.
- Stadium conditions: Summer Day, Night Match and Rainy Evening.
- Gameplay profiles: Balanced Simulation, Grounded Match and Quick Transition.

The four inspired graphics profiles are original GODMODS tuning presets using documented Sider 3.5 `gfx` controls. They do not contain EA, eFootball, UFL or third-party proprietary assets, and they are not full shader/texture conversions. Stadium modules adjust documented match conditions while preserving the user's selected stadium. Gameplay controls are experimental in Sider 3.5 and remain opt-in.

## Department roadmap and honest compatibility

GOD TURF, GOD KITS, GOD FACES, stadium artwork, menu presentation and GOD ATMOSPHERE are separate enhancement departments. Their source art/audio must become department-specific content packages with a tested PES 2017 runtime integration before being advertised as in-game working mods. A Lua file alone cannot make an arbitrary DDS, model, menu texture or audio clip load in PES. We will not fake that integration or silently switch to LiveCPK.

## Build verification

- `npm run mods:build-original` generates source-asset libraries.
- `npm run mods:build-packs` generates the department-scoped packages.
- `npm run mods:verify-packs` verifies manifests, Lua structure, target paths and payload SHA-256 hashes.
- The Windows installer includes `content/packs/**/*`; packages deploy to the PES installation's `content/GODMODS` directory.

CI validates package integrity and installer construction, not live in-game effects. Real PES 2017/Sider 3.5 testing is still required for final gameplay and visual acceptance.
