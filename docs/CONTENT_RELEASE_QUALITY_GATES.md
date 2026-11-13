# Phase 4 — Curated Content & Quality Gates

## Purpose

Phase 4 establishes the release-control system for THEGODMODS Originals and authorized third-party packages. It does not manufacture content, imply redistribution rights, or mark an untested package as verified.

The governing rule remains: **the user chooses what they want; THEGODMODS does the complicated work.** The manager can only automate work supported by a declared deployment adapter and a tested rollback path.

## Ownership lanes

- **THEGODMODS Originals:** assets authored by THEGODMODS or commissioned under documented rights. Record source files, author, creation provenance and the applicable original-content licence.
- **Third-party:** creator/publisher identity, exact source URL, licence identifier, explicit redistribution permission and attribution are mandatory. A public download link is not proof of redistribution permission. If permission is absent or unclear, the item remains an external source link and must not be mirrored or packaged.

Do not bundle commercial game files, copyrighted music, player likeness assets, third-party textures or other creator assets without documented rights.

## Release candidate contract

The src/catalogue/release-gates.ts module defines the Phase 4 release candidate and evaluator. The evaluator derives the state; it does not trust a supplied verified label.

Required metadata:
- Namespaced package ID, semantic version, department and ownership lane.
- Publisher, author, licence, explicit redistribution permission and source attribution.
- PES 2017 executable names, tested patch/data-pack versions and Sider version range.
- Supported deployment strategy.
- HTTPS immutable package URL, exact archive byte count, lowercase SHA-256 and release-signing key ID.
- Manifest validation, payload hash verification, Windows CI run, automated test and rollback evidence.
- Real-game test status and, when passed, timestamp, game build, Sider version, tester and evidence URL.

## States

| State | Meaning | Install policy |
|---|---|---|
| Blocked | One or more metadata, rights, package, or automated quality gates are missing/failed | Not installable |
| Automated-ready | Metadata, rights, signed package reference, Windows CI, tests and rollback evidence are complete, but a real PES 2017 test is pending | Not verified; do not expose as verified |
| Verified | All automated gates pass and a documented real PES 2017 + declared Sider test passes | Eligible for catalogue release, subject to the trusted package-delivery policy |

The evaluator's eligible flag is true only for verified. The app must still validate the signed release, archive and module manifest at install time; catalogue approval is not a bypass around the installer.

## Required QA matrix

Every release must record the exact combinations tested, not broad claims such as "works with all patches".

- PES 2017 executable/build and patch/data pack.
- Sider version and any required Sider modules.
- Deployment strategy and target layout.
- Fresh install and replacement of an existing managed target.
- Enable/disable behaviour where the package declares it supported.
- Uninstall and rollback, including preservation of user-modified files.
- Relevant visual/audio/gameplay checks in a real match.
- Logs, screenshots or short capture with date and test environment.

A package tested on one patch/Sider combination must not be advertised as verified for an untested combination.

## Department-specific acceptance checks

- **Graphics:** texture dimensions/format, DDS decode/preview, colour and lighting review, no missing textures or crashes.
- **Stadium & Turf:** pitch resource inventory, DDS compatibility, Stadium Server/Sider mapping and stadium-load checks.
- **Kits & Equipment:** team/season/player mapping, texture integrity, correct kit assignment and match rendering.
- **Players:** player IDs, face/hair mapping, texture integrity and in-game appearance.
- **Audio & Atmosphere:** codec/sample-rate/channel checks, event/slot mapping, correct anthem/chant trigger and rights for every recording.
- **Gameplay:** executable/patch/Sider compatibility, Lua/config validation, deterministic scenario checks and match stability.

## Current publication status

The repository's department entries are discovery and studio-roadmap records, not downloadable content. No actual original mod asset bundle or third-party redistribution package is currently approved by this Phase 4 work. Do not add an install button until a real release candidate passes the evaluator and the package-delivery trust root is provisioned.

The current package downloader also requires production host and pinned Ed25519 public-key configuration. Test-only keys and example URLs are not production trust configuration.

## Automated tests

The tests/catalogue-release-gates.test.ts suite verifies complete approval, pending real-game status, rights/attribution failures, insecure URLs, malformed digests, wrong-game declarations and missing real-game evidence.
