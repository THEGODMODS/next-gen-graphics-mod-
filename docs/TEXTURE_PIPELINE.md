# Texture asset pipeline (PES 2017)

## Non-negotiable rule

A valid DDS file is not automatically a valid PES 2017 replacement. PES 2017 uses game-specific texture containers and indexed resource paths. The manager must not rename arbitrary DDS files to .ftex, invent LiveCPK target paths, or claim compatibility based on dimensions alone.

## Current audit tool

Run \`npm run audit:dds -- <folder>\` to recursively inspect DDS files before conversion or packaging. It checks DDS magic/header sizes, dimensions, mip-chain bounds, payload presence, and a conservative compression allowlist (BC1/BC2/BC3/BC5 and selected DXGI BC formats). It does not decode pixels, validate colour-space intent, verify game-specific swizzles, convert formats, or prove PES compatibility. Symlink entries are not followed. A failed audit exits non-zero.

See [PES 2017 pitch resource discovery](PITCH_RESOURCE_DISCOVERY.md) for the verified stadium-server pitch subtree and the one-stadium-at-a-time discovery process.


## Pixel-level DDS inspection

Run `npm run inspect:dds -- "<texture.dds>"` to decode the base mip of BC1, BC2, BC3 or BC5_UNORM textures and emit machine-readable statistics:

- dimensions, format and analyzed pixel count;
- per-channel means, minima and maxima;
- alpha mean and percentage below 128;
- RGB luminance mean and standard deviation for BC1/2/3;
- approximate reconstructed normal-vector length statistics for BC5.

This is a diagnostic aid for comparing candidate textures and spotting obvious channel/alpha problems. It does not render an image, infer whether RGB is albedo or another material channel, inspect higher mip pixel content, support BC5_SNORM or BC7 pixel decoding, or establish PES-specific channel conventions. The BC5 Z reconstruction assumes a positive hemisphere and is explicitly not a compatibility verdict. Analysis reads the whole DDS into memory and refuses files larger than 512 MiB.

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


## Decoded DDS comparison

Run `npm run compare:dds -- "<original.dds>" "<replacement.dds>"` to compare decoded base-mip pixels for matching BC1, BC2, BC3 or BC5_UNORM files. The report includes changed-pixel percentage and per-channel mean absolute error, root-mean-square error and maximum absolute error. Dimensions and exact compression format must match; incompatible inputs fail rather than producing a misleading score. BC5 compares stored R/G values only. This is a difference report, not a perceptual-quality score, image-similarity verdict, mip-chain comparison or PES compatibility test. Both inputs must be regular non-symlink files no larger than 512 MiB.


## DDS PNG previews

Run `npm run preview:dds -- "<input.dds>" "<output.png>"` to decode the supported base mip into a PNG without an additional runtime dependency. The output path must not already exist. BC1/BC2/BC3 are rendered as decoded RGBA; BC5_UNORM is shown as an explicitly labelled false-colour RG view (stored R in red, stored G in green, blue set to zero). The BC5 preview is not a reconstructed normal map and does not establish channel conventions. Only BC1/2/3 and unsigned BC5 are supported; BC5_SNORM and BC7 are rejected. Input files are limited to 512 MiB and decoded images to 16 megapixels. Higher mips are not rendered, and previews are not evidence of PES compatibility.
