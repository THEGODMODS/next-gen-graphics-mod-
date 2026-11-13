# PES 2017 Next Gen

A modular, Sider-based enhancement platform for Pro Evolution Soccer 2017.

## Project goals

- Deliver observable in-game visual improvements through properly packaged replacement assets and runtime configuration.
- Use Sider and LiveCPK-compatible modules where appropriate.
- Provide a Windows desktop manager for module discovery, installation, profiles, backups, diagnostics, and launch.
- Keep installation reversible and protect saves, option files, settings, and unknown user files.

## Product architecture

The six-department catalogue, trusted package lifecycle, deployment adapters and release gates are defined in [the Next Gen ecosystem blueprint](docs/NEXT_GEN_ECOSYSTEM_BLUEPRINT.md). This is the product contract for the catalogue and installer work; catalogue entries remain non-installable until their packages and permissions are verified.

## Architecture

- `app/`: Windows desktop manager (Electron, React, TypeScript).
- `loader/`: Sider integration, configuration management, and Lua module contracts.
- `modules/`: installable module manifests and content packages.
- `docs/`: architecture, compatibility, safety, and development documentation.
- `tools/`: validation and packaging utilities.

## Safety principles

The installer must never blindly delete files from a PES installation. It must identify managed files, back up changes, preserve unknown files, and support rollback.

## Development status

The desktop manager, transactional module installer, Sider synchronization, local package library and DDS audit tooling are under active development. No game replacement assets are bundled yet. The DDS audit checks a conservative set of DDS headers and block-compressed payload lengths; it is not a PES texture compatibility validator. The read-only pitch inventory records paths, sizes, and SHA-256 hashes under a Stadium Server stadium's `common/bg/model/bg/pitch` subtree. Run `npm run inventory:pitch -- "<stadium-folder>"` to create a local JSON inventory. Live-game compatibility and visual results must be tested against a real PES 2017 installation and compatible Sider version. See [the texture pipeline](docs/TEXTURE_PIPELINE.md), [pitch resource discovery](docs/PITCH_RESOURCE_DISCOVERY.md), and [pitch inventory](docs/PITCH_INVENTORY.md) before authoring pitch or stadium assets.

## Licensing

Only distribute original assets or content for which redistribution permission has been obtained. Third-party tools and mods remain subject to their own licenses.

## Windows test installer

Pushes to `main` run the quality checks on Windows and Ubuntu. After both validation jobs pass, GitHub Actions builds the Windows NSIS installer and uploads the `.exe` as a workflow artifact named `pes2017-nextgen-windows-<commit-sha>` (14-day retention).

To download a test build:

1. Open the repository's **Actions** tab.
2. Open the latest successful **Quality** run for the commit you want.
3. Download the `pes2017-nextgen-windows-<commit-sha>` artifact.
4. Extract the ZIP and run the installer.

A workflow artifact is a development test build, not a stable public release. Do not install it over a production PES setup without a backup. A release is not considered validated until the packaged application is launched on Windows and its Sider/PES workflows are tested on a real installation.
