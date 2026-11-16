# GOD FACES — Player Mapping Workbench

GOD FACES currently generates neutral skin/hair microdetail source maps. It does not generate real-player likenesses, meshes, roster IDs, UV layouts or drop-in replacements. This workbench validates supplied mapping evidence before a player-specific add-on is considered.

Run:

```bash
node tools/god-faces-mapping.mjs path/to/face-evidence.json
```

The schema requires the exact game/patch/Sider/face-server versions, player and team roster identifiers, a hashed roster source and assignment explanation, separate face and hair resource records, hashes, dimensions, texture format, mip count, UV masks, UV sets, isolated UV regions and normal conventions. Output must remain in a dedicated `GODMODS/` namespace, with originals preserved, backups identified and collisions checked.

See `tests/god-faces-mapping.test.ts` for a complete fixture. Fixture IDs and values are examples for tests, not real roster/resource mappings.

`evidence-valid` means the submitted record is internally consistent; it does not authenticate the truth of the evidence. The validator never writes game files, installs modules, authorizes deployment or marks a result in-game verified. Only actual testing against the exact target installation with close-up captures and rollback evidence can establish compatibility.
