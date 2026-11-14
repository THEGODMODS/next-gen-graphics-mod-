# GODMODS enhancement packages

THEGODMODS enhances PES 2017 while preserving the user's existing patch and stadium selections. Department packages install into the existing game folder at `PES 2017/content/GODMODS/<Department>/<ModName>/`; they do not replace or overwrite the existing `content/stadium-server` directory.

## Package layout

Each package installs its Lua module and a `README.md` into its own folder under the existing `content/GODMODS` directory. The README explains the exact Sider registration and supporting files.

Graphics packages also install editable `graphics.ini` files under `PES 2017/GODMODS/Graphics/<ModName>/`; Sider's official guide documents reading `gfx.ini` and applying the values at match setup. Gameplay packages install editable `gameplay.ini` files under `PES 2017/GODMODS/Gameplay/<ModName>/`; Sider's official `gameplay2.lua` example documents that same pattern. Stadium-condition packages install editable `stadium.ini` files under `PES 2017/GODMODS/Stadiums/<ModName>/`; their Lua modules read the day/night, weather and season values before returning the documented `set_conditions` event result. The Lua modules read their own game-root configuration files at match setup.

## Current Lua package library

The current build contains thirteen Sider 3.5 Lua modules:

- Graphics: Natural, Cinematic, Broadcast, EA FC 27 Inspired, eFootball 27 Inspired, UFL Inspired and ISS Pure.
- Stadium conditions: Summer Day, Night Match and Rainy Evening.
- Gameplay: Balanced Simulation, Grounded Match and Quick Transition.

Graphics, gameplay and stadium-condition modules read their own editable game-root INI at match setup. Settings include ball weight, physics, bounce, friction, Magnus effect, shooting power and player speed. The INI also supports `match_minutes = 0` to retain the game's duration, or an integer from 5 to 90 to override it through Sider's documented `set_match_time` event. Numeric gameplay values are checked against conservative safety bounds; missing or invalid values fall back to profile defaults.

**Compatibility warning:** Sider 3.5 explicitly describes gameplay controls as experimental and warns of unexpected side effects. The memory API is powerful and dangerous; these packages do not use arbitrary memory writes.

## Manual Sider setup

1. Open the installed mod folder under `content/GODMODS` and read `README.md`.
2. Copy that package's Lua file into `Sider/modules`.
3. Add `lua.module = "<module filename>"` to the Extension modules section of `sider.ini`.
4. For gameplay packages, edit the corresponding INI in the PES 2017 game-root `GODMODS/Gameplay/<ModName>/` folder. Changes are read at the next match setup.
5. Keep LiveCPK disabled. The manager does not edit `sider.ini` or register modules automatically.

## Asset integration boundary

Sider 3.5 documents LiveCPK as the general mechanism for replacing arbitrary game content at runtime. Stadium Server is a separate supported system that serves extracted stadium resource trees from `content/stadium-server`. Arbitrary kits, faces, menus, scoreboard art, turf textures and audio cannot be made functional merely by placing DDS/model/audio files in a random folder or by writing a Lua module. They require a compatible CPK/DpFileList workflow, LiveCPK, or another verified game-specific loader. We will not claim those assets work until their resource paths, formats and runtime loading method are validated.

## Build verification

- `npm run mods:build-original` generates original source-asset libraries.
- `npm run mods:build-packs` generates installable packages.
- `npm run mods:verify-packs` verifies manifests, Lua structure, README payloads, seven graphics INIs, three gameplay INIs, three stadium INIs, target paths and SHA-256 hashes.
- CI validates package integrity and installer construction, not in-game behavior. Final acceptance still requires PES 2017/Sider 3.5 in-game testing.
