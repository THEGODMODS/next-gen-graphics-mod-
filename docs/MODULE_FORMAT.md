# Module package format (draft)

Each module package contains a UTF-8 `module.json` at its root and a `payload/` directory.

## Manifest example

```json
{
  "schemaVersion": 1,
  "id": "org.example.pitch-overhaul",
  "name": "Pitch Overhaul",
  "version": "1.0.0",
  "description": "Example manifest; contains no game assets.",
  "category": "graphics",
  "game": {
    "title": "PES 2017",
    "executable": ["PES2017.exe"],
    "sider": ">=3.5.0 <4.0.0"
  },
  "dependencies": [],
  "conflicts": [],
  "files": [
    {
      "source": "payload/LiveCPK/common/example/sample.dds",
      "target": "LiveCPK/common/example/sample.dds",
      "sha256": "REPLACE_WITH_REAL_SHA256"
    }
  ],
  "luaModules": [
    {
      "source": "payload/nextgen-weather.lua",
      "moduleName": "nextgen-weather.lua",
      "sha256": "REPLACE_WITH_REAL_SHA256"
    }
  ],
  "license": {
    "id": "SEE-LICENSE-FILE",
    "redistributionAllowed": false
  }
}
```

## Validation requirements

- Module IDs must be stable, lowercase, and namespaced.
- Reject absolute paths, parent traversal (`..`), drive prefixes, alternate data streams, and paths escaping the managed root.
- Verify every payload file against its SHA-256 before installation.
- Reject duplicate targets within one package.
- Check dependencies and conflicts against the selected profile before modifying the game.
- Every Lua module entry must include a safe `.lua` filename and SHA-256 digest.
- Lua payloads are installed transactionally to `modules/<moduleName>` beside `sider.exe`; their ownership is journaled and uninstall follows the same hash-guarded restore/preserve rules as other files.
- Lua modules are not registered automatically during installation. The user explicitly runs Sider synchronization, which registers only installed Lua files in the manager-owned INI block.
- License metadata is mandatory. The manager must not assume redistribution rights.

This schema is a draft and must be implemented with runtime validation and tests before third-party packages are accepted.
