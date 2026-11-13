# First-party GODMODS packages — build tranche

The Windows manager build now generates and bundles a local first-party module library at `content/packs/`. Open **Module Library → Scan built-in GODMODS packages** to discover these packages, preview each one, and install it through the existing transactional installer. After installation, explicitly synchronize Sider to register the module in `sider.ini`.

## Real installable Sider modules

All nine packages target PES 2017 and Sider 3.5.x, include a real Lua payload, a `module.json` manifest, and a SHA-256 payload digest.

| Product line | Included packages | What they actually do |
|---|---:|---|
| GOD VISUALS / GOD CINEMATIC | 3 profiles | Apply documented Sider `gfx` brightness, sharpness, player-shadow softness and reflection settings at match setup |
| GOD STADIUMS | 3 profiles | Apply documented Sider `set_conditions` day/night, weather and season settings; never change stadium IDs |
| GOD GAMEPLAY | 3 profiles | Opt-in gameplay library settings around documented defaults |

The graphics and conditions modules use documented Sider 3.5 events and properties. Gameplay settings are explicitly experimental in the Sider 3.5 guide; the three profiles are opt-in, conservative and removable. Install only one profile within each conflict family. Uninstalling a module and synchronizing Sider removes its registration; the manager's hash-guarded ownership journal protects the installed Lua file.

## Still authoring/source assets — not drop-in replacement mods

The original content generator also creates substantial source assets for the other GODMODS lines:

- **GOD TURF:** six procedural grass looks with albedo, normal-source and roughness-source DDS maps.
- **GOD KITS:** four procedural fabric families with diffuse overlay, normal-source and roughness-source maps. These must be masked onto a known existing kit UV.
- **GOD FACES:** generic procedural skin/hair detail source maps; no real-player meshes, likenesses or roster assignments.
- **GOD STADIUMS artwork:** editable sponsor-neutral LED/adboard concepts; no stadium texture IDs or geometry.
- **GOD ATMOSPHERE:** synthetic ambience and tone source clips; no chants, anthems, commentary or copyrighted recordings.

Those source assets are bundled separately under `content/originals/generated/`. They are not falsely declared as installable replacement packages. PES 2017 texture targets are patch-specific and require exact resource mapping, dimensions, compression, mip chain and material channel validation. Kits/faces require verified UVs and authorized models. Audio needs event-slot mapping and rights-cleared masters. No game-specific path or asset permission is invented.

## Reproducible build checks

- `npm run mods:build-original` generates the source-asset library.
- `npm run mods:build-packs` creates the nine Sider module folders and manifests.
- `npm run mods:verify-packs` validates package identities, target versions, Lua structure, expected Sider API use, and every payload SHA-256.
- The Windows CI publishes a separate `thegodmods-installable-modules-<sha>` artifact and the Electron installer includes `content/packs/**/*`.

A successful automated build validates package structure and payload integrity, not a live PES match. Final in-game verification still requires a real PES 2017 installation with Sider 3.5.x.
