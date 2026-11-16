# GODMODS enhancement packages

THEGODMODS enhances PES 2017 while preserving the user's existing patch, stadium selections and game files. Department packages install into the existing game folder under `content/GODMODS/<Department>/<ModName>/`; they do not replace the user's patch, original CPK files, Stadium Server tree, Kit Server or Face Server assets.

## Unified Sider architecture

The library currently builds **18 department packages** behind one shared Sider 3.5 runtime entry point:

- **Graphics (7):** GOD NATURAL, GOD CINEMATIC, GOD VISUALS Broadcast, EA FC 27 Inspired, eFootball 27 Inspired, UFL Inspired and ISS Pure.
- **Matchday conditions (7):** three stadium profiles (Summer Day, Night Match, Rainy Evening) and four weather profiles (Fine Day, Rain Day, Rain Night, Winter Night).
- **Gameplay (3):** Balanced Simulation, Grounded Match and Quick Transition. Sider 3.5 labels gameplay controls experimental; these remain opt-in and require match testing.
- **Audio (1):** GOD ATMOSPHERE Continuous Matchday Crowd, using four original synthesized ambience beds with editable volume and profile settings.

Each department package contains its own Lua source, configuration and supporting assets under its GODMODS content folder. At build time the Lua feature sources are embedded into `GODMODS_Loader.lua`. The manager installs the shared `thegodmods.core-loader` dependency automatically with the first department package and registers only that one module in `sider.ini`. Each department package has its own persistent `enabled.ini` activation marker. The master loader now initializes and registers callbacks only for packages whose marker is ON at game startup; OFF packages are not initialized and register no Sider callbacks. Turning a package OFF changes only that marker; its installed Lua source, configuration and assets remain in place. Turning it ON takes effect on the next PES/Sider launch. If mutually conflicting profiles are both marked ON (for example, two stadium/weather presets), the loader fails closed and skips both conflicting profiles rather than allowing them to compete. Uninstall is separate and removes only unchanged manager-owned files, restoring approved backups and preserving files modified outside the manager.

## Installation

1. Select the exact PES 2017 game folder in GODMODS Manager.
2. Open a department and scan the built-in GODMODS library.
3. Select a real package and choose **Review Installation**.
4. Review all target paths, dependencies and existing-file replacements before approving installation.
5. The manager installs the shared master loader if needed, installs the selected package and synchronizes the single Sider module entry.
6. Uninstall a department package from Modules to remove its configuration and deactivate that feature. The shared loader remains while other installed GODMODS products depend on it.

For manual recovery only, copy `modules/GODMODS_Loader.lua` to `PES 2017/modules/` and add `lua.module = GODMODS_Loader.lua` under Extension modules in `sider.ini`. Do not add each department Lua source as a separate Sider entry.

## Compatibility boundary

The 18 Sider packages are real manager-installable packages using documented Sider 3.5 callbacks/APIs, but CI proves package integrity and Lua syntax—not in-game correctness. Gameplay settings are experimental. Graphics profiles use documented Sider gfx controls; match-condition profiles use documented condition callbacks; the audio engine uses Sider audio APIs. Each still needs testing on the exact PES 2017 executable, patch and Sider build.

The other original content libraries are **source assets, not drop-in game replacements**:

- GOD TURF and GOD STADIUMS need exact Stadium Server resource paths, DDS format/channel conventions, UV/material binding and stadium-load tests.
- GOD KITS needs an inspected kit resource, UV mask, protected badge/sponsor/number regions and Kit Server test.
- GOD FACES needs face/hair resource IDs, UV/material mapping, roster assignment evidence and close-up tests.
- GOD VISUALS/CINEMATIC/NATURAL LUT source libraries are not a PES shader injector; a supported colour adapter and known colour-space contract are still required.

Do not claim these source assets are installable or in-game verified until their mapping and test evidence exists. Use the PES 2017 Resource Compatibility Workbench and the department mapping workbenches to build evidence from the user's actual installation. Preserve original files; all deployments must remain additive and reversible.

## Build verification

- `npm run mods:build-original` generates original source-asset libraries.
- `npm run mods:build-packs` generates the 18 department packages and embeds their Lua sources into the single master loader.
- `npm run mods:verify-packs` verifies manifests, payload hashes, dependency declarations, the single loader and required config/assets.
- `npm run mods:check-lua` parses the generated master Lua file as Lua 5.1.
- CI verifies source generation, package integrity, Lua syntax, TypeScript, unit tests and the production app build. It does not run PES 2017 or validate target-game rendering/audio/gameplay.
