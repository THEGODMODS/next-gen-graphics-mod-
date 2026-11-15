## GOD FACES — Premium Appearance Lab

Adds an original, non-destructive skin/hair microdetail source library for existing PES 2017 player appearances.

### Original deliverables
- Five neutral skin detail profiles: Natural Pore, Broadcast Fine, Athlete Texture, Soft Diffuse and High Definition.
- Four hair fibre profiles: Straight Fibre, Soft Wave, Defined Coil and Close Crop.
- 27 DDS maps (detail overlay, normal-source and roughness-source per profile), 512×512 RGBA8 with full mip chains.
- Deterministic builder, SHA-256 manifest and namespaced sidecar layout under `GODMODS/Players/GOD-FACES-PREMIUM/`.

### Non-destructive rules
- No player likenesses, meshes, IDs, roster assignments or replacement faces are generated.
- Existing identity, skin colour, tattoos, facial hair and hairline remain untouched.
- No CPK, patch, option file or existing face asset is edited.
- Normal/roughness maps remain source assets until target shader conventions are confirmed.
- No LiveCPK mapping is guessed; exact UV/material/resource/roster evidence is required before in-game injection.

### Validation
CI validates generated DDS structure, manifest hashes, syntax, tests and Windows build. UV mapping, target shader compatibility and in-game appearance remain pending target-setup validation.