# Architecture

## Runtime model

PES 2017 remains the game process. Sider 3.5.x is the runtime integration layer. The manager configures Sider and installs content into managed LiveCPK roots; it does not replace the game executable.

### Components

1. **Desktop manager** — Electron + React + TypeScript UI for discovery, module management, profiles, backups, diagnostics, and launch.
2. **Install engine** — validates module manifests, resolves dependencies/conflicts, stages files, backs up overwritten paths, applies changes transactionally, and records a rollback journal.
3. **Sider adapter** — detects a compatible Sider installation, manages only the tool-owned section of `sider.ini`, and launches Sider without closing its process prematurely.
4. **LiveCPK content roots** — ordered directories containing game-relative replacement paths.
5. **Lua modules** — optional Sider 3.5-compatible scripts placed in Sider's `modules` directory and enabled through `lua.module` entries.

## Content precedence

Sider checks configured `cpk.root` entries in order and uses the first matching path. The manager must show the effective root order and warn when two enabled modules provide the same game-relative path. Never silently resolve a collision.

## Module lifecycle

`discover -> validate -> resolve dependencies -> stage -> backup -> apply -> verify -> commit journal`

If any apply or verification step fails, restore the journaled files. Uninstall must remove only files recorded as owned by that module and restore prior versions where applicable.

## Profiles

A profile records enabled module IDs, versions, root order, and manager-owned configuration. Switching profiles must be transactional and must not alter unrelated Sider settings.

## Compatibility

Sider version, PES executable variant, module game-version range, and required Lua APIs must be checked before activation. Unsupported combinations are blocked or clearly marked, not guessed.
