# PES 2017 Next Gen

A modular, Sider-based enhancement platform for Pro Evolution Soccer 2017.

## Project goals

- Deliver observable in-game visual improvements through properly packaged replacement assets and runtime configuration.
- Use Sider and LiveCPK-compatible modules where appropriate.
- Provide a Windows desktop manager for module discovery, installation, profiles, backups, diagnostics, and launch.
- Keep installation reversible and protect saves, option files, settings, and unknown user files.

## Architecture

- `app/`: Windows desktop manager (Electron, React, TypeScript).
- `loader/`: Sider integration, configuration management, and Lua module contracts.
- `modules/`: installable module manifests and content packages.
- `docs/`: architecture, compatibility, safety, and development documentation.
- `tools/`: validation and packaging utilities.

## Safety principles

The installer must never blindly delete files from a PES installation. It must identify managed files, back up changes, preserve unknown files, and support rollback.

## Development status

Repository initialization. No game assets are bundled yet. Live-game compatibility and visual results must be tested against a real PES 2017 installation and a compatible Sider version.

## Licensing

Only distribute original assets or content for which redistribution permission has been obtained. Third-party tools and mods remain subject to their own licenses.
