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
- The recovery API and subsequent install/uninstall operations roll back interrupted installs using verified backups and installed-file hashes.
- Recovery preserves files that no longer match the transaction's expected hash, avoiding overwriting later user edits.
- Best-effort transaction rollback on an install error.
- Uninstall removes only files whose current SHA-256 still matches the manager's journal. Modified files are preserved and reported. Backups are restored when present.

## Important limitations

- Module upgrades and dependency removal planning are not enabled yet.
- Lua module registration and Sider configuration edits are not part of this transaction yet.
- The manager must call this engine only after showing the exact install preview and receiving explicit confirmation.
- Crash recovery is implemented in the module engine but is not yet invoked by the desktop app at startup; the UI/IPC integration remains outstanding.
- Recovery has automated unit-test coverage committed, but a passing CI run and Windows filesystem behavior have not yet been confirmed.
- Filesystem operations must be tested on Windows with real PES directories before release. Reparse-point behavior differs by platform, so this implementation rejects detected symbolic links and rechecks target parents immediately before writes.
