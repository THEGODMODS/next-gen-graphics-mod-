# GODMODS Add-On Enhancement Standard

## Non-negotiable product promise

GODMODS enhances the player's existing PES 2017 + YosfX setup. It is not a conversion patch, file-replacement pack, or clean-install requirement. The original game, patch, option file, stadium collection, kits, faces, and audio remain the user's source of truth.

**Never overwrite, delete, rename, or edit an original game/patch asset.** Every product must be an independently managed add-on with a clear disable and uninstall path.

## Supported enhancement patterns

1. **Sider runtime modules** — add optional visual controls, matchday profiles, audio layers, and documented gameplay integrations without modifying game binaries.
2. **LiveCPK virtual overlays** — where a verified resource mapping requires a texture or presentation asset, mount an optional GODMODS-owned file through LiveCPK's virtual resource layer. The original file on disk remains untouched; disabling the GODMODS root restores the original resource automatically.
3. **Sidecar content and profiles** — keep presets, LUTs, source textures, audio, manifests, and user settings in a dedicated `GODMODS/` namespace. Do not write into the user's existing Stadium Server or patch folders.
4. **Non-invasive presentation add-ons** — use Sider callbacks and supported configuration surfaces for lighting/colour profiles, match conditions, and ambience where the target Sider build documents those APIs.

A virtual overlay is not permission to guess a resource path. It may only be generated after the target resource, format, dimensions, material role, and compatibility are evidenced for that exact YosfX/Stadium Server setup.

## Department product requirements

| Department | Premium GODMODS enhancement | Add-on implementation |
|---|---|---|
| Graphics | GOD VISUALS: broadcast, natural, cinematic and time-of-day looks | Optional Sider graphics profiles and external colour-grade assets only when a supported adapter exists |
| Stadiums & Turf | GOD STADIUMS + GOD TURF: original LED artwork, venue mood and premium pitch surface looks | Stadium-specific LiveCPK virtual overlays and optional Sider matchday profiles; never edit Stadium Server originals |
| Kits & Equipment | GOD KITS: fabric weave, stitching/material response and equipment detail | UV-aware overlay/source maps mounted virtually after exact kit mapping; preserve the user's kit designs and IDs |
| Players | GOD FACES: skin/hair detail and appearance polish | Rights-cleared, roster/UV-mapped optional overlays; no forced face or player-ID replacement |
| Audio & Atmosphere | GOD ATMOSPHERE: layered crowd beds, spatial texture and event ambience | Optional Sider audio module and original sound assets in a dedicated namespace; preserve original audio banks |
| Gameplay | GOD GAMEPLAY: coherent simulation profiles and optional supported extensions | Opt-in documented Sider controls only; unsupported physics/AI hooks remain experimental and must not be faked |

## Installation contract

- Install only under the dedicated GODMODS namespace or the supported LiveCPK virtual-root configuration.
- Do not alter `dt*` archives, executable files, option files, original CPKs, or user-owned Stadium Server assets.
- If Sider configuration must be updated, make a minimal managed entry with a recorded before/after backup and exact rollback.
- Every package manifest must list its virtual paths, source hashes, target requirements, ownership/licence, and install state.
- Detect collisions before enabling a virtual root. Never silently shadow another mod's resource.
- Provide per-product enable/disable, restore the prior Sider configuration on uninstall, and leave unrelated files untouched.
- Preserve original resources as the fallback. A failed or disabled GODMODS module must degrade to the user's existing game.

## Quality gates

1. Confirm the user's exact PES 2017 executable/build, YosfX version, Sider version and relevant add-on versions.
2. Inspect the real resource and material/UV mapping; never invent stadium IDs, kit UVs, player IDs, shader channels, or audio event IDs.
3. Build original, rights-cleared assets with deterministic source and SHA-256 manifests.
4. Validate package structure and virtual paths without writing to the game.
5. Test enable, disable, collision handling, rollback and clean fallback.
6. Compare matched in-game captures and performance against the untouched baseline.
7. Label each product accurately: concept, source assets generated, mapped add-on, or in-game verified.

## Current asset status

The original-content generator creates assets for all six departments: six turf surface source variants, stadium LED artwork, kit fabric maps, procedural skin/hair detail sources, original synthesized ambience/cues, gameplay profile designs, and six visual LUTs. The repository also builds nine Sider Lua profiles (graphics, stadium conditions, and opt-in gameplay). These are meaningful first-party starting products, but generated source maps are not automatically compatible with every PES shader or YosfX resource. No product is called in-game verified until tested on the target setup.

The first content release should be one optional GOD TURF virtual-overlay package for a user-selected YosfX Stadium Server stadium, followed by one complete enhancement release per department. All releases must leave original files untouched.
