# GODMODS Premium Build — PR 17 (Departments 1–4)

## Scope
Graphics; Stadiums & Turf; Kits & Equipment; Players.

## Existing original source products carried forward
- GOD VISUALS: original LUTs and native Sider graphics profiles.
- GOD CINEMATIC and GOD NATURAL: independent original 33³ LUT libraries.
- GOD TURF: six original pitch surface families and DDS source maps.
- GOD STADIUMS: original LED/fascia vector artwork and matchday art direction.
- GOD KITS: six fabric families with weave, normal-source and roughness-source maps.
- GOD FACES: five skin and four hair detail families with overlay, normal-source and roughness-source maps.

## New compatibility engineering
The PES 2017 Resource Compatibility Workbench inventories actual local resources, verifies DDS structure and hashes, and validates explicit source-to-target mapping manifests. It is read-only, symlink-safe, bounded, and rejects unsafe paths or stale hashes. It does not create guessed bindings or modify the user's game.

## Truthful compatibility state
The repository does not contain the user's private YosfX patch inventory, exact stadium/kit/face resource paths, UV layouts, target shader conventions or a live PES 2017 test environment. Therefore PR 17 can improve compatibility discovery and validation, but cannot truthfully mark these assets as in-game verified. The next evidence needed is a compact inventory report from one chosen stadium, one kit and one face/hair resource—not a full asset upload.
