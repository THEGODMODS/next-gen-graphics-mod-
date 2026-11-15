# GOD VISUALS — Elite Colour Suite

## Product direction

GOD VISUALS targets premium match presentation while protecting gameplay readability and kit/club colour identity. EA SPORTS FC, eFootball and UFL are quality references only; every GODMODS grade is authored independently.

## First Elite source release

The Elite Colour Suite contains eight original display-grade 3D LUTs:

- Neutral Reference
- Broadcast Natural
- Stadium HDR Balance
- European Night Elite
- Golden Hour
- Overcast Realism
- Cinematic Matchday
- Grass & Kit Fidelity

Each LUT is exported as an Adobe `.cube` file with a 33×33×33 lattice (35,937 RGB entries). The generator also emits a manifest with SHA-256 hashes and per-profile creative metadata.

## Colour pipeline and use

A `.cube` LUT does not encode its own input/output colour space. The host application or adapter must define the expected primaries and transfer function. These grades are display-oriented creative transforms; they do not perform automatic log-to-display or linear-to-display conversion.

Load one grade at a time in a compatible colour-management host or a verified post-processing adapter. Do not stack multiple grades. Confirm skin, white kits, saturated club colours, pitch greens, highlights and shadow detail against a neutral reference.

## Non-destructive integration

- Source LUTs only: no ReShade shaders, executables, CPKs, game binaries, option files, Sider config or patch resources are overwritten.
- No unsupported shader parameters or PES resource paths are invented.
- No assumption is made that PES 2017 or YosfX can load `.cube` files directly.
- Disable the selected LUT in its host or remove the LUT reference to roll back.

## Build

```bash
npm run mods:build-visuals
```

The complete original source build runs the Elite suite after the department generators:

```bash
npm run mods:build-original
```

Output: `content/originals/generated/GOD-VISUALS-ELITE/`

## Acceptance gates

- Eight valid 33³ LUTs, each with exactly 35,937 finite RGB entries inside [0,1].
- Neutral Reference is an identity transform at every lattice point.
- SHA-256 manifest values match the generated LUT files.
- Matched daylight, night floodlight and overcast tests show no clipped whites, crushed shadows, skin-tone casts or loss of kit-colour identity.
- Host colour-space and transfer-function behaviour are documented.
- In-game use is enabled only after a compatible PES 2017/YosfX post-processing adapter is verified and tested.

## Current status

**Generated source library:** deterministic builder and CI tests.

**Host-mapped/in-game verified:** not yet. No game-side LUT loader or compatible colour-management adapter is asserted by this release.
