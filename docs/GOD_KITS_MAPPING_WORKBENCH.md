# GOD KITS — Evidence-Gated Mapping Workbench

The Premium Material Lab creates six original fabric families (weave, normal source and roughness source). Those are source assets, not drop-in kit replacements. This workbench adds a strict evidence gate before a kit-specific overlay is considered.

## Validate a kit mapping record

```bash
node tools/god-kits-mapping.mjs path/to/kit-evidence.json
```

The JSON record uses `schemaVersion: 1` and `kind: "godmods-kit-mapping-evidence"`. It must identify the exact PES build, patch, Sider and Kit Server versions; exact kit ID and inspected texture; SHA-256 hashes; dimensions, format and mip count; a matching fabric-only UV mask; material/normal/roughness conventions; and a dedicated `GODMODS/` output path. The original must remain untouched, an external backup must be identified, and resource collisions must be checked.

See `tests/god-kits-mapping.test.ts` for a complete example record. The example values are test fixtures, not real PES/YosfX resource mappings.

## Status semantics

- `blocked`: required evidence is missing, unsafe or inconsistent.
- `evidence-valid`: the submitted record is internally complete and consistent.
- `deploymentAuthorized` remains `false`: this validator does not install, mount or write any game files.
- `inGameVerified` remains `false`: only an actual target-install test with matched captures can establish that status.

The validator deliberately does not guess kit IDs, UVs, resource paths, shader channels, texture compression or YosfX compatibility. It does not alter the original kit, patch, game, Kit Server or LiveCPK files. Evidence validity is not proof that the submitted evidence is truthful; retain the source files and test notes for review.
