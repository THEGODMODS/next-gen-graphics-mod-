# GODMODS Masked DDS Detail Compositor

The compositor lets a user enhance an existing kit or player texture without painting over the entire texture. It requires a verified UV mask supplied for the exact target texture. White mask pixels receive the neutral detail overlay; black pixels remain untouched. The overlay's alpha also controls detail strength.

## Supported inputs
- Base texture: uncompressed 32-bit RGBA8 or BGRA8 DDS.
- Detail overlay: uncompressed 32-bit RGBA8 or BGRA8 DDS.
- UV mask: uncompressed 32-bit RGBA8 or BGRA8 DDS.
- All three inputs must have identical dimensions and mip counts.

Compressed DXT/BC textures are deliberately rejected until a separately tested decoder/encoder is integrated. Do not convert a game texture by guessing its format.

## Command

```bash
node tools/godmods-dds-compositor.mjs base.dds detail-overlay.dds uv-mask.dds enhanced-copy.dds 0.8 r
```

Opacity is 0–2 (default 1); mask channel is r/g/b/a (default r). The neutral greyscale detail is applied additively, modulated by both mask coverage and overlay alpha. The base alpha is preserved. All mip levels are composited.

## Safe workflow
1. Back up the selected base texture outside the game directory.
2. Confirm the exact UV layout and create a fabric-only or face/hair-only mask.
3. Run the compositor to a new output path. It refuses to overwrite any input.
4. Inspect the result and verify all mip levels before testing on a disposable game copy.
5. Only after target format, material semantics, exact resource path and rollback are confirmed should a separate LiveCPK mapping be considered.

The tool never edits the original texture, game, patch, Stadium Server, Kit Server or LiveCPK files. A generated output is not automatically PES 2017-compatible; the target's original DDS compression may differ, and this compositor currently accepts only uncompressed RGBA8/BGRA8.
