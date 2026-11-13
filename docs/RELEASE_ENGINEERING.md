# Phase 6 — Release engineering

## Release policy

A versioned application release is produced only from a tag of the same version as `package.json`, and the tagged commit must already be reachable from `main`. The release workflow is Windows-only because the deliverable is an NSIS installer.

## Automated tag pipeline

Pushing a tag such as `v0.1.0` starts `.github/workflows/release.yml`. The workflow:

1. Checks out the exact tagged source and verifies the tag equals `v<package.json version>`.
2. Requires the tagged commit to be reachable from `main`.
3. Installs dependencies, runs TypeScript validation, native Node ESM smoke tests and unit tests.
4. Builds the production Electron application and Windows x64 NSIS installer.
5. Fails if no installer executable is produced.
6. Generates a SHA-256 checksum manifest for every installer executable.
7. Uploads the installer and checksums as a 30-day workflow artifact.
8. Creates a **draft**, not a public release, with the installer, checksum manifest and release notes attached.

A failed step prevents draft release creation. The workflow does not publish a public release automatically.

## Human release checklist

Before publishing a draft:

- [ ] Review the exact tagged commit and release notes.
- [ ] Download the installer and verify its SHA-256 against `SHA256SUMS.txt`.
- [ ] Install on a clean supported Windows machine and confirm launch/uninstall.
- [ ] Test upgrade/install behavior without risking a user's existing PES folder.
- [ ] Test with a backed-up PES 2017 installation and the exact supported Sider version.
- [ ] Exercise package preview, install, Lua activation, uninstall, recovery and backup restoration where supported.
- [ ] Confirm no sample, proprietary or unlicensed game assets are included.
- [ ] Confirm catalogue entries still distinguish planned projects, external sources and verified installable packages.
- [ ] Review crash logs and Windows Defender/SmartScreen behavior.
- [ ] Only then publish the GitHub draft release.

## Signing and trust boundaries

The current workflow builds an NSIS installer but does not Authenticode-sign it. A code-signing certificate, secure secret provisioning, timestamping service and certificate rotation policy have not been supplied. Do not claim that the executable is publisher-signed.

Package release metadata uses a separate Ed25519 signing process documented in `PACKAGE_RELEASE_OPERATIONS.md`. Production remote package delivery remains disabled until the official THEGODMODS public key and approved package host are provisioned and pinned by the application. Never commit private keys or substitute test keys for production trust.

## Release limitations

- CI cannot prove that the manager works with every PES 2017 patch, stadium server, gameplay patch or Sider version.
- No actual original mod binary packs are implied by an application installer release.
- Installer upgrades and app-level migration behavior require dedicated Windows testing.
- A draft GitHub release is a review candidate, not a public stable release.
- The release workflow is intentionally tag-triggered; do not create a release tag until the implementation has been merged to `main` and the version is intentionally chosen.
