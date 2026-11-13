# Module engine

The module engine validates package metadata and paths before any game-directory write is permitted.

## Implemented

- Runtime validation for schema version 1 manifests.
- Namespaced module IDs, semantic versions, supported categories, PES 2017 executable names, dependencies and conflicts.
- Canonical relative-path validation for package sources and LiveCPK targets.
- Duplicate target detection (case-insensitive for Windows filesystem behavior).
- SHA-256 digest validation and streaming file hashing.
- Required license metadata; redistribution rights are never inferred.
- Persistent ownership journal stored in the manager state directory.
- Serialized install/uninstall operations using an exclusive lock directory.
- Full package preflight and staging before target files are changed.
- Payload hash verification before staging and immediately before final placement.
- Existing files are protected by default. Replacing one requires its exact target path to be explicitly approved by the caller after an install preview.
- Existing targets managed by another module are never replaced.
- Backups for explicitly approved replacements.
- Durable pending-transaction records are written before game files are replaced.
- The recovery API, desktop startup, and subsequent install/uninstall operations roll back interrupted installs using verified backups and installed-file hashes.
- Recovery preserves files that no longer match the transaction's expected hash, avoiding overwriting later user edits.
- Best-effort transaction rollback on an install error.
- Uninstall removes only files whose current SHA-256 still matches the manager's journal. Modified files are preserved and reported. Backups are restored when present.
- Installed module dependency IDs are persisted for newly installed packages. Uninstall checks reverse dependencies before touching any target files.
- The desktop Modules screen exposes individual uninstall with a confirmation step, and attempts to synchronize Sider registrations after removal. A Sider synchronization failure is reported separately from the completed file removal.

## Important limitations

- Module upgrades are not enabled yet. Uninstall is blocked when another journaled module declares a dependency on the selected module; older journals without dependency metadata remain readable.
- Lua module registration and Sider configuration edits are not part of this transaction yet.
- Electron exposes a package preview that validates the manifest and payload hashes, reports file additions/replacements and dependency/conflict status, and does not write to the game folder.\n- The Modules screen requires a separate confirmation before calling the transactional installer; the confirmation lists replacement targets, which are backed up before being replaced.\n- A package preview is invalidated when the selected game folder changes. The package manifest is re-read and revalidated at install time.
- Lua module registration and Sider INI edits remain outside the install transaction; modules that require those changes are not fully activated yet.
- Recovery has automated unit-test coverage committed, but a passing CI run and Windows filesystem behavior have not yet been confirmed.
- Filesystem operations must be tested on Windows with real PES directories before release. Reparse-point behavior differs by platform, so this implementation rejects detected symbolic links and rechecks target parents immediately before writes.


## Installed module controls

The Modules view lists journal-owned packages and their managed file targets.
For each installed Lua payload, the user can enable or disable its Sider
registration independently. Activation state is stored in manager state and
the Sider INI is synchronized through the existing backup-and-verify flow.
Disabling a Lua module removes only its manager-owned `lua.module` entry; it
does not delete the Lua file. Uninstall remains a separate operation and keeps
the install journal's hash-guarded restore/preserve behavior. Modules not
owned by the install journal cannot be toggled by this interface.


Legacy journals remain compatible: missing dependency arrays are treated as having no recorded dependencies. This is necessarily less protective for packages installed before dependency metadata was stored; those modules should be reviewed before removal.


## Phase 3 — deployment adapter foundation

The module engine now resolves package manifests through explicit deployment adapters before any game-directory write:

- **Direct files:** ordinary game-relative targets are staged and installed transactionally.
- **LiveCPK:** targets must remain under the declared `LiveCPK/` tree; the existing Sider-root synchronization remains the registration path.
- **Lua/Sider:** Lua-only packages map to `modules/<moduleName>` and remain registered/activated through the manager-owned Sider configuration workflow.
- **Configuration:** configuration templates are classified as manual artifacts, require a declared format and explicit instructions, and are never blindly copied over a user's live configuration.
- **Manual-assisted:** package artifacts and steps are surfaced as non-automated work; the installer refuses to report these as installed or write them into the game folder.

Legacy manifests retain automatic routing so existing local packages continue to work. Adapter validation and path-boundary tests cover legacy direct/LiveCPK routing, explicit LiveCPK constraints, Lua mapping, configuration safety and required manual instructions.

This is the first Phase 3 increment, not the completed phase. Full module update transactions, generic enable/disable, transactional Sider/config application, and end-to-end UI workflows remain to be implemented and tested before Phase 3 sign-off.


## Package-wide Lua activation

Lua-only packages can be enabled or disabled as a group. The main process resolves the package ID against the install journal and verifies every owned target is a managed Lua module before applying the request. The Sider manager validates the complete group, updates activation state in one operation, backs up and verifies the INI change, and restores the previous activation state if synchronization fails. The Modules screen exposes this action for Lua-only packages.

Packages containing direct or LiveCPK files are deliberately excluded: package-wide activation for those assets requires a separate reversible file adapter. Transactional version upgrades also remain unimplemented and are not represented as supported.


## Sider synchronization compensation

The Electron install action now synchronizes manager-owned Sider registrations after the installer has committed its file/journal transaction. If the Sider INI update fails, the main process compensates by uninstalling the just-installed package (which restores backed-up originals and removes only files still matching the installed hashes), then attempts to restore the prior Sider registration state. If compensation itself fails, the error explicitly tells the user to preserve manager state/backups and run recovery before launching the game. This is a compensating transaction across the filesystem and Sider INI, not a single atomic filesystem transaction; backups and journal recovery remain authoritative.

## Phase 3 supported-scope boundary

- Automatic installation, hash-guarded uninstall, crash recovery, direct/LiveCPK routing and Lua/Sider registration are supported by the local module engine.
- Package-wide enable/disable is supported for Lua-only packages. Direct/LiveCPK activation toggles are intentionally not exposed.
- Configuration templates and manual-assisted packages are instruction-only and are not reported as installed automatically.
- In-place version upgrades are not yet supported. The installer refuses duplicate installed package IDs rather than overwriting an existing managed version. Upgrade support requires a dedicated multi-version transaction that preserves the original pre-mod backup chain.
- Real PES 2017 gameplay verification still requires testing against an actual game installation and Sider version; CI can validate builds and filesystem behavior but cannot prove in-game rendering or compatibility.
