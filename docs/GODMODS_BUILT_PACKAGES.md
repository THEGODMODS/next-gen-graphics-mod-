# GODMODS enhancement packages

THEGODMODS enhances PES 2017 while preserving the user's existing patch, kits and stadium selections. Packages install into the existing game folder at `PES 2017/content/GODMODS/<Department>/<ModName>/`; they do not create a separate content root or overwrite the existing `content/stadium-server` directory.

## What the user sees

After installation, open the existing PES 2017 `content` folder, then open `GODMODS` and the relevant department/mod folder. Every installed package includes its own `README.md` beside its Lua module. Read that file for the exact module name and setup steps.

## Current Lua package library

The current build contains thirteen Sider 3.5 Lua settings modules:

- Graphics: Natural, Cinematic, Broadcast, EA FC 27 Inspired, eFootball 27 Inspired, UFL Inspired and ISS Pure.
- Stadium conditions: Summer Day, Night Match and Rainy Evening.
- Gameplay: Balanced Simulation, Grounded Match and Quick Transition.

These are settings modules, not full asset conversions. Graphics profiles use documented Sider `gfx` controls; stadium profiles change match conditions; gameplay values are experimental in Sider's own documentation.

## Manual Sider setup

1. Open the installed mod folder under `content/GODMODS` and read `README.md`.
2. Copy that package's Lua file into `Sider/modules`.
3. Add `lua.module = "<module filename>"` to the Extension modules section of `sider.ini`.
4. Keep LiveCPK disabled. The manager does not edit `sider.ini` or register these modules automatically.

## Important compatibility boundary

Sider 3.5's Lua API supports gameplay, graphics effects, match conditions and stadium-selection events. The official documentation describes LiveCPK as the mechanism for replacing arbitrary game content at runtime. Stadium Server is a separate supported system that serves extracted stadium resource trees from `content/stadium-server`. Therefore:

- Stadium-specific stadium/pitch assets can be packaged using the Stadium Server folder layout, provided the exact PES 2017 resource paths and formats are validated.
- General kits, faces, menu textures, scoreboard art and audio replacements are not made functional merely by placing DDS/model/audio files in an arbitrary folder or by writing a Lua module. They require a compatible game loader/resource route (for example a compatible CPK/DpFileList workflow, or LiveCPK). This project will not claim those assets work without a verified route.
- No placeholder Lua modules or generated artwork are counted as finished in-game mods.

## Build verification

- `npm run mods:build-original` generates source-asset libraries.
- `npm run mods:build-packs` generates installable packages.
- `npm run mods:verify-packs` verifies manifests, Lua structure, README payloads, target paths and SHA-256 hashes.
- CI validates package integrity and installer construction, not in-game behavior. Final acceptance still requires a PES 2017/Sider 3.5 test.
