# GODMODS enhancement packages — current build tranche

THEGODMODS exists to enhance the overall PES 2017 experience while preserving the user's existing game, patch, teams, kits and stadium choices wherever technically possible. Our goal is not to replace content for its own sake. We add visual, audio, interface and gameplay improvements as compatible enhancement layers.

The Windows manager bundles a local first-party module library at `content/packs/`. Open **Module Library → Scan built-in GODMODS packages** to discover, preview and install these modules. After installation, explicitly synchronize Sider to register the module in `sider.ini`.

## Current installable enhancement modules

All nine packages target PES 2017 and Sider 3.5.x, include a Lua payload, a `module.json` manifest and a SHA-256 payload digest.

| Enhancement area | Included packages | Current enhancement |
|---|---:|---|
| GOD VISUALS / GOD CINEMATIC | 3 profiles | Tune documented Sider brightness, sharpness, player-shadow softness and reflection settings for a more polished match presentation |
| GOD STADIUMS | 3 profiles | Enhance match atmosphere through documented day/night, weather and season conditions while keeping the selected stadium |
| GOD GAMEPLAY | 3 profiles | Opt-in gameplay-library tuning around documented defaults to explore a more natural match feel |

These are enhancement profiles, not stadium or game-content replacements. Graphics and conditions modules use documented Sider 3.5 events and properties. Gameplay settings are explicitly experimental in the Sider 3.5 guide; the three profiles are opt-in, conservative and removable. Install only one profile within each conflict family. Uninstalling a module and synchronizing Sider removes its registration; the manager's hash-guarded ownership journal protects the installed Lua file.

## The broader GODMODS enhancement programme

The original content generator also creates source assets that will be developed into compatible enhancement packs:

- **GOD TURF:** six procedural grass looks with albedo, normal-source and roughness-source DDS maps. The goal is richer grass detail, believable color, surface response and pitch presentation while respecting the user's installed pitch/patch setup.
- **GOD KITS:** four procedural fabric families with diffuse overlay, normal-source and roughness-source maps. The goal is better fabric, stitching, folds and material appearance applied as compatible overlays/material enhancements—not forcing users to replace their kits.
- **GOD FACES:** generic procedural skin/hair detail source maps intended for compatible visual enhancement workflows, without fabricating player likenesses or roster assignments.
- **GOD STADIUMS:** editable sponsor-neutral LED/adboard concepts and future compatible atmosphere/lighting enhancements that preserve the user's chosen stadium.
- **GOD ATMOSPHERE:** original synthetic ambience and tone source clips intended to make match presentation more immersive.
- **GOD MENUS:** premium interface, background, typography and navigation improvements for the manager and compatible PES menu workflows.
- **GOD PRESENTATION:** cohesive broadcast-style visual polish across match presentation, overlays and transitions where supported by the game/patch.

These source assets are bundled under `content/originals/generated/`. They are not yet all finished in-game enhancement packs. PES 2017 texture targets vary by patch and require verified resource mapping, dimensions, compression, mip chain and material-channel validation. Kit/faces workflows require verified compatible UVs and authorized assets. Audio needs supported event/slot mapping and rights-cleared masters. The implementation must favor additive overlays, compatible resource injection and reversible settings over destructive replacement.

## Reproducible build checks

- `npm run mods:build-original` generates the source-asset library.
- `npm run mods:build-packs` creates the nine Sider module folders and manifests.
- `npm run mods:verify-packs` validates package identities, target versions, Lua structure, expected Sider API use and every payload SHA-256.
- Windows CI publishes a separate `thegodmods-installable-modules-<sha>` artifact and the Electron installer includes `content/packs/**/*`.

A successful automated build validates package structure and payload integrity, not a live PES match. Final in-game verification still requires a real PES 2017 installation with Sider 3.5.x and the target patch. Compatibility and reversibility are core acceptance criteria for every enhancement.
