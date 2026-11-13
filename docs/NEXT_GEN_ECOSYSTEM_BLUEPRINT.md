# THEGODMODS NEXT GEN — Ecosystem Blueprint

## Product promise

**The user chooses what they want. THEGODMODS does the complicated work.**

The desktop manager is the trusted control plane for discovering, validating, installing, updating, enabling, disabling, and removing PES 2017 enhancements. A catalogue entry is never represented as installable until its package is hosted, its publisher and redistribution permissions are known, its manifest and payload are validated, and its game/Sider compatibility is declared.

## Six first-class content departments

1. **Graphics** — visual overhauls, lighting, weather, colour grading, broadcast/presentation and texture collections.
2. **Stadium & Turf** — stadium environments, pitch/turf resources, adboards, stadium-server assets and compatible stadium modules.
3. **Kits & Equipment** — kits, boots, balls, gloves, goalkeeper equipment and accessories.
4. **Players** — faces, hair, tattoos, body details and player-specific asset collections.
5. **Audio & Atmosphere** — chants, crowd ambience, club anthems, commentary and matchday atmosphere.
6. **Gameplay** — gameplay configuration, physics, movement, AI and compatible Lua extensions.

These departments are catalogue categories, not promises that every content type can be installed through the same mechanism. Each package must declare its actual deployment method and compatibility requirements.

## Catalogue trust and package lifecycle

A catalogue record is descriptive metadata. It is not executable content and must never be treated as a trusted install source by itself.

Proposed catalogue record fields:
- Stable package ID and catalogue schema version.
- Display name, category, short description, detailed change notes and publisher/author.
- Preview image references with explicit licensing/hosting provenance.
- Game version, patch/data-pack requirements, Sider version and required modules.
- Deployment type: direct game files, LiveCPK, Lua/Sider module, configuration, or manual-assisted.
- Package version, immutable download URL, archive size and SHA-256.
- License identifier, redistribution permission and source attribution.
- Dependencies, conflicts, supported update path and removal/rollback capabilities.
- Verification state and last validation timestamp.

A record without a trusted immutable package URL, digest, compatible manifest and redistribution permission may be shown as an **external source / information only** entry. It must not expose an in-app Install action.

## Required install transaction

1. Resolve a catalogue record to a version-pinned package.
2. Verify publisher/source policy, archive size limits and SHA-256 before extraction.
3. Extract into an isolated staging directory; reject traversal paths, symlinks, duplicate targets and unexpected files.
4. Validate the manifest, payload hashes, declared target paths, game/Sider compatibility, dependencies and conflicts.
5. Build a human-readable preview of every file and configuration change.
6. Create and verify backups of all manager-owned replacement targets.
7. Apply changes transactionally with a durable journal; abort and roll back on any failed write or verification.
8. Synchronize only manager-owned Sider configuration entries while preserving user configuration.
9. Verify installed file hashes and module registration; report partial/manual steps explicitly.
10. Support safe disable, update, rollback and uninstall. Never delete or overwrite unknown user files.

## Deployment adapters

- **Direct replacement:** only for manifest-declared, safe relative targets with backups and ownership records.
- **LiveCPK:** install into a declared root and register only that manager-owned root in Sider.
- **Lua/Sider:** install a validated Lua module and register/enable it through the existing Sider configuration manager.
- **Configuration:** use format-specific parsers and preserve comments/user-owned settings where possible.
- **Manual-assisted:** create a clearly labelled package and exact instructions for actions that cannot safely be automated. Never claim completion for a manual step that the user has not completed.

## User experience requirements

- Every department has a real catalogue view with search, filters, curated collections, package detail, preview media, compatibility and author/source details.
- Package detail shows deployment method, file footprint, requirements, conflicts, license and rollback support before the user installs.
- Installation progress uses explicit phases (download, verify, stage, preview, backup, apply, verify); cancellation is safe before commit.
- Installed content has clear enabled/disabled state, installed version, update availability, health and ownership information.
- Empty, offline, unsupported and untrusted states are explained honestly. No fake catalogue entries, fake progress or fake success.
- Preserve the existing DDS Viewer and pitch-resource inspection/build workflows as specialist tools within the Graphics and Stadium departments.
- Keep the existing safe module engine as the foundation; extend it through tested adapters rather than replacing it with a second installer.

## Delivery sequence

### Phase 0 — Foundation and audit
- Inventory current renderer, IPC, module manifest, transaction journal, backup/recovery, Sider synchronization, DDS tools, pitch tooling and CI.
- Document package trust boundaries and define catalogue/package contracts.
- Add tests before changing installer behaviour.

### Phase 1 — Real catalogue foundation
- Add a versioned local catalogue schema and strict validator.
- Implement all six category views using truthful availability states.
- Keep external community links separate from verified in-app packages.
- Add package detail and compatibility presentation.

### Phase 2 — Trusted package delivery
- Establish an owned package host/release process and publisher metadata.
- Add version-pinned download, size limits, digest/signature verification and resumable downloads.
- Add tests for hostile archives, network interruption and corrupted payloads.

### Phase 3 — Transactional deployment
- Extend the current journal/installer for download staging, atomic commit, rollback, update and disable.
- Add deployment adapters for direct files, LiveCPK, Lua and configuration packages.
- Add explicit manual-assisted workflows where automation is not technically safe.

### Phase 4 — Curated content and quality gates
- Publish only original or redistribution-authorized assets.
- Validate each package against declared PES 2017/Sider configurations.
- Require Windows CI, unit/integration tests and real-game validation evidence before marking a package verified.

## Non-negotiable release gates

- No unverified package can be installed.
- No archive can write outside its declared game-relative targets.
- No unknown user file is silently removed.
- Every managed replacement has a recoverable original backup.
- A failed transaction leaves the game in its previous state or reports a precise recovery requirement.
- CI must run type checks, unit tests, package validation and Windows installer packaging.
- A successful CI build is not represented as proof of in-game compatibility; that requires a real PES 2017 + Sider test.

## Current baseline (audited from the repository)

The current app already has an Electron/React shell, local module-library scanning, manifest and SHA-256 validation, an install preview, a module installer/journal, Sider configuration synchronization, startup recovery, a DDS inspection/comparison workbench and a read-only Stadium Server pitch inventory/module builder.

The current library is local-folder based. The repository README states that no game replacement assets are bundled. Remote downloads are intentionally disabled in the current UI. Most of the six content navigation destinations are not yet complete catalogue experiences. The next implementation work must preserve these safety boundaries and close those gaps without presenting community links as verified installable packages.


## Catalogue ownership lanes

Every department exposes two distinct catalogue lanes:

- **THEGODMODS Originals** — projects created and packaged by THEGODMODS. Project concepts and active tooling are visibly labelled as roadmap/in-development until the actual assets have been authored, tested and released.
- **Third-Party** — creator and publisher catalogues opened at their original source. These listings remain external-source information; they are not mirrored, endorsed, redistributed or treated as manager-verified packages.

Initial original-product lines include GOD VISUALS, GOD CINEMATIC and GOD NATURAL (Graphics); GOD TURF, GOD STADIUMS and GOD PITCH LAB (Stadiums & Turf); GOD KITS; GOD FACES; GOD ATMOSPHERE; and GOD GAMEPLAY. These are production tracks, not claims that downloadable packs already exist. The first original releases must be created from assets we have rights to use, with source provenance and repeatable validation.

Each department has a focused subcategory taxonomy. Graphics includes complete overhauls, eFootball/FC-inspired directions, natural realism, lighting/weather and broadcast presentation. Stadiums & Turf includes turf/pitch textures, grass patterns, stadium environments, adboards, lighting and Stadium Server modules. The remaining departments similarly separate their own content types.

## Phase 1 implementation record

The src/catalogue/departments.ts registry now defines the six department identities, descriptions, subcategories, original production tracks and allowed third-party source references. DepartmentCatalogue renders the Originals and Third-Party lanes, searchable cards, ownership/status labels and a strict release-gate explanation. The Graphics DDS workbench and Stadium Pitch Builder remain available beneath their new catalogues. Kits & Equipment, Players, Audio & Atmosphere and Gameplay now use the same catalogue component instead of the former generic placeholder.

The initial registry intentionally contains no installable catalogue package. Third-party cards open external publisher/community pages; original tracks are labelled as studio roadmap or development work. The local manifest scanner and safe installer remain the only current installation path. This avoids conflating discovery metadata with trusted packages.


## Phase 2 implementation record — trusted package delivery foundation

The new `src/main/module-engine/package-delivery.ts` module defines a versioned remote release contract and a fail-closed validation/download pipeline.

A remote release must provide:
- Namespaced package ID and semantic version.
- Publisher identity and explicit licence ID.
- An explicit `redistributionAllowed: true` declaration.
- HTTPS download URL on an application-configured trusted hostname, with no embedded credentials or fragment.
- Exact archive byte size and lowercase SHA-256 digest, bounded by the configured maximum.
- An Ed25519 detached signature over a stable canonical release payload, verified against a key ID in the application's pinned public-key trust map.

The downloader refuses redirects, non-200 responses, mismatched Content-Length, truncated/oversized payloads, hash mismatches and already-downloaded version collisions. It streams to a temporary `.part` file, verifies the exact byte count and digest, and only then links the verified archive into its final versioned filename. Failed downloads clean up the partial file. It does not extract archives or install packages; those operations remain behind the existing manifest validator and transactional installer.

Automated tests cover valid signatures, metadata tampering, unknown hosts/keys, absent redistribution permission, redirect responses, corrupted payloads, and successful verified downloads.

**Publisher onboarding is intentionally not activated yet.** This repository does not currently contain a THEGODMODS package-host domain, an official release-signing public key, or a production catalogue endpoint. No made-up host/key or unsigned fallback is introduced. Until THEGODMODS provisions and pins its Ed25519 public key and approved host, remote delivery remains unavailable by design; local package scanning and installation continue to work as before. A passing test with generated test-only keys is not evidence that a production publisher is trusted.
