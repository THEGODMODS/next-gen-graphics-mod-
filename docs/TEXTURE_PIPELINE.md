# Texture asset pipeline (PES 2017)

## Non-negotiable rule

A valid DDS file is not automatically a valid PES 2017 replacement. PES 2017 uses game-specific texture containers and indexed resource paths. The manager must not rename arbitrary DDS files to .ftex, invent LiveCPK target paths, or claim compatibility based on dimensions alone.

## Current audit tool

Run \`npm run audit:dds -- <folder>\` to recursively inspect DDS files before conversion or packaging. It checks DDS magic/header sizes, dimensions, mip-chain bounds, payload presence, and a conservative compression allowlist (BC1/BC2/BC3/BC5 and selected DXGI BC formats). It does not decode pixels, validate colour-space intent, verify game-specific swizzles, convert formats, or prove PES compatibility. Symlink entries are not followed. A failed audit exits non-zero.

See [PES 2017 pitch resource discovery](PITCH_RESOURCE_DISCOVERY.md) for the verified stadium-server pitch subtree and the one-stadium-at-a-time discovery process.

## Required workflow for the first pitch pack

1. Capture a clean baseline screenshot in a known stadium, weather, time-of-day, camera, resolution and graphics configuration.
2. Identify the exact pitch material/resource path from a legally obtained PES 2017 installation or documented format reference. Record source archive, internal path, format and game build.
3. Extract the original texture for inspection; keep it local and do not commit proprietary game assets.
4. Build an original replacement at the exact dimensions, channel layout, compression, mip count and container format required by that resource. Preserve alpha/normal/roughness semantics where applicable.
5. Repack with a format-aware tool whose output has been validated by reopening it. Record tool/version and hashes.
6. Package only the original replacement and a manifest with the exact game-relative LiveCPK path, license and SHA-256.
7. Install to a disposable PES copy first. Confirm Sider log resolution, no missing-resource errors, and visible in-game difference against baseline.
8. Compare screenshots side-by-side and check multiple lighting/weather conditions. Reject packs that merely change a preview image or produce subtle/unverifiable changes.

## Compatibility gate

Until the exact PES 2017 resource path and texture container requirements are verified, this repository intentionally ships no fabricated pitch replacement. The DDS audit is an asset-quality gate, not a substitute for a PES-aware Ftex/container inspector or in-game validation.
