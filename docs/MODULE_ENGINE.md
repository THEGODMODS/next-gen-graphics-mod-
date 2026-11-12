# Module engine implementation

The first engine layer is deliberately read-only: it validates package metadata and paths before any game-directory write is permitted.

## Current implementation

- Runtime validation for schema version 1 manifests.
- Namespaced module IDs, semantic versions, supported categories, PES 2017 executable names, dependencies and conflicts.
- Canonical relative-path validation for package sources and LiveCPK targets.
- Duplicate target detection (case-insensitive to match Windows filesystem behavior).
- SHA-256 digest format validation and streaming file hashing helpers.
- Required license metadata; redistribution rights are never inferred.

## Install transaction requirements (next layer)

The installer must stage files outside the game directory, verify every payload digest, produce a preview, and only then apply changes. Existing targets must be backed up before replacement. A durable journal must record only files created or replaced by this manager. On failure, restore backups and remove only files created by the failed transaction. Uninstall must preserve modified files and all untracked content.

Path validation is not a substitute for filesystem checks: the installer must also reject symlink/reparse-point traversal and re-check resolved paths immediately before each operation.
