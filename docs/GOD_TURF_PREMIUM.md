# GOD TURF Premium — Nine Surface Families

## Original surface library

GOD TURF now generates nine deterministic procedural pitch surface families:

1. Natural Cut — restrained natural green and subtle mowing.
2. Stadium Emerald — richer broadcast-ready emerald.
3. Heritage Worn — visibly varied, worn match surface.
4. Cool Climate — cooler natural response.
5. Sunlit Hybrid — brighter hybrid-grass presentation.
6. Matchday Striped — stronger mowing direction.
7. Broadcast Cut — defined mowing bands and controlled contrast.
8. Natural Pro — restrained natural palette and fine surface variation.
9. Hybrid Elite — balanced hybrid tone with moderate mowing and wear.

Each family contains three original DDS source maps:
- Albedo
- Tangent-space normal source
- Roughness source

That is 27 generated DDS maps. They are RGBA8 mipmapped source assets. The normal and roughness maps are not assumed to match every PES material's channel convention.

## Stadium Server sidecar

The build also creates an additive folder at:

`common/bg/model/bg/pitch/GODMODS/<variant>/`

The builder records each file's size and SHA-256. It never replaces an existing pitch resource and never assigns guessed stadium material names or filenames. The new folder is a sidecar library; the stadium will not render these textures until its actual model/material resource references are verified and a compatible mapping is created.

## Compatibility and release gates

- Source generation and DDS structure must pass automated tests.
- The exact Stadium Server stadium, pitch resource paths, material channel convention, UV mapping and requested resource names must be inventoried.
- Test one verified overlay at a time with a clean rollback path.
- Record the exact PES 2017 executable, patch, Sider and Stadium Server versions.
- Compare the same stadium, camera, weather and lighting in-game.
- Do not claim production compatibility until the target game renders the intended texture correctly.

Build with `npm run mods:build-original`. The Stadium Server sidecar is assembled by `tools/build-god-turf-stadiumserver.mjs`.
