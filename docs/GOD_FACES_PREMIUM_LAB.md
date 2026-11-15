# GOD FACES — Premium Appearance Lab

## Product direction

GOD FACES raises the material quality of existing PES 2017 player appearances without replacing player identities. The creative target is premium close-camera realism: restrained skin microtexture, believable pore scale, clean hair-fibre definition and stable appearance under daylight and floodlights. FC, eFootball and UFL are quality references only; all GODMODS artwork is original.

## First original source release

The Premium Appearance Lab builds a reversible sidecar source library containing:

- **Five skin detail profiles:** Natural Pore, Broadcast Fine, Athlete Texture, Soft Diffuse and High Definition.
- **Four hair detail profiles:** Straight Fibre, Soft Wave, Defined Coil and Close Crop.
- **27 DDS maps:** each profile has a neutral detail overlay, normal-source map and roughness-source map.
- **512×512 RGBA8 DDS** with complete mip chains, SHA-256 hashes and a machine-readable manifest.

The skin overlays are neutral microdetail layers, not a skin-colour replacement. Hair overlays are fibre-detail sources, not hair models or player likenesses.

## Non-destructive integration rules

1. Existing faces, hair, player IDs, roster data, tattoos, facial hair, skin colour and hairlines remain untouched.
2. No real-player likenesses, face meshes, roster assignments or fabricated player-ID mappings are included.
3. Do not mount any map into LiveCPK until the exact player resource path, material role, UV layout, dimensions, format and roster mapping are verified for the target PES 2017 + YosfX setup.
4. Normal and roughness maps remain source assets until the target material's channel conventions are confirmed.
5. The generated `addon-layout/GODMODS/Players/GOD-FACES-PREMIUM/` tree is a sidecar library, not a claim of automatic in-game rendering. It can be removed without touching existing player assets.

## Build

```bash
npm run mods:build-faces
```

Output: `content/originals/generated/GOD-FACES-PREMIUM/`

The complete original asset build also runs this builder after GOD TURF and GOD KITS.

## Acceptance gates

- All 27 DDS files have valid headers, expected dimensions and full mip chains.
- Manifest file sizes and SHA-256 hashes match generated files.
- Skin overlays preserve base colour when composited with a low-intensity blend.
- No pore/strand pattern produces obvious tiling or moiré at face close-up and broadcast distances.
- Exact face/hair UV mapping and shader channel use are demonstrated on the user's installed patch before an installable LiveCPK overlay is released.
- Same-player before/after captures are taken under matched daylight and night lighting.
- Disable/uninstall restores the unmodified player appearance.

## Current status

**Generated source library:** built by the deterministic generator and validated by CI.

**Mapped/in-game verified:** not yet. The exact YosfX face resource inventory, UVs, material channels and player roster mapping have not been supplied or independently verified. No compatibility claim is made.
