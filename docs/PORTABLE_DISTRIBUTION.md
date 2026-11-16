# GODMODS Manager portable distribution

The primary Windows distribution is a ZIP archive, not an NSIS installer.

The archive contains one `GODMODS` directory:
- `GODMODS Tool/` — portable Electron application.
- `content/` — generated GODMODS source assets and validated module package library.
- `modules/` — Lua payloads extracted from included package manifests for manual Sider setup.
- `README.txt` — copy/launch and manual Sider instructions.

Copy the complete `GODMODS` directory into `PES 2017/content/`, then launch `GODMODS Tool/GODMODS Manager.exe`.

The manager resolves its bundled package library from the sibling `content/packs` directory. Per-user settings, transaction journals and backups remain in the Windows user profile, so the portable content folder can be moved as one unit without moving machine-specific state.

The existing module installer continues to own game-facing writes. It validates package manifests and hashes, journals changes, backs up collisions and coordinates Sider configuration. Portable packaging itself never writes to a PES installation.

The `modules/` folder is provided for manual Sider installation. A Lua file's presence is not proof that its callbacks or associated assets have been verified in-game. Package-specific compatibility and resource mapping remain evidence-gated.
