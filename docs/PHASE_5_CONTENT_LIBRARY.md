# Phase 5 — THEGODMODS Original Content Library

This phase turns the six-department Originals roadmap into actionable production briefs. The source of truth is `src/catalogue/original-content.ts`; every original product line has a stable package identity, department, style direction, deliverables, required source assets, acceptance checks, rights policy and preview plan.

## Production tracks

| Department | Original line | Production focus |
|---|---|---|
| Graphics | GOD VISUALS | Natural, balanced visual foundation |
| Graphics | GOD CINEMATIC | Restrained cinematic match presentation |
| Graphics | GOD NATURAL | Neutral colour and low-processing realism |
| Stadiums & Turf | GOD TURF | Original grass/pitch textures and mapping |
| Stadiums & Turf | GOD STADIUMS | Stadium presentation add-ons and mapped resources |
| Stadiums & Turf | GOD PITCH LAB | Source-texture inventory, DDS validation and reproducible module authoring |
| Kits & Equipment | GOD KITS | Team/season kit and equipment collections |
| Players | GOD FACES | Rights-cleared player appearance packs |
| Audio & Atmosphere | GOD ATMOSPHERE | Original/licensed anthems, chants and matchday audio |
| Gameplay | GOD GAMEPLAY | Versioned Lua/config tuning with repeatable scenarios |

## Status semantics

- `brief-ready`: the production brief and acceptance criteria exist; no asset bundle is implied.
- `tooling-prototype`: the project has supporting authoring/inspection tools, but is not a finished downloadable content pack.
- A future `released` state must only be assigned after real assets, provenance, package hashes, manifest validation, signing, automated rollback tests and real PES 2017/Sider evidence exist.

The UI deliberately does not add install buttons to these briefs. No sample textures, player likenesses, club marks, copyrighted audio or extracted game files are fabricated or bundled.

## Content production contract

For every asset, retain:
- Original editable source and exported runtime asset.
- Creator/author, creation date, source provenance and applicable licence.
- Exact PES 2017 patch, executable and Sider compatibility.
- Resource/player/team/event mapping where applicable.
- SHA-256, dimensions/codec/format and package version.
- Before/after preview evidence and test notes.
- Install, disable, update and rollback test evidence.

## Department acceptance

- **Graphics:** colour/lighting consistency, DDS integrity and real-match visual review.
- **Stadiums & Turf:** resource mapping, tile seams, DDS/mipmap checks and Stadium Server/Sider load tests.
- **Kits & Equipment:** team/season/slot mapping, texture integrity and in-game kit assignment.
- **Players:** player IDs, likeness permissions, model/texture integrity and in-game appearance.
- **Audio & Atmosphere:** per-recording rights, codec/sample rate, loudness, event mapping and trigger tests.
- **Gameplay:** Lua/config validation, exact build compatibility, repeatable scenarios and stability.

## First production candidate

GOD PITCH LAB is the most tooling-ready candidate because the repository already contains pitch inventory, DDS inspection/comparison, pitch mapping and module-builder workflows. It still requires a real PES 2017 stadium inventory and rights-cleared source textures before a content package can be built or verified. Do not mistake the authoring tool for a completed turf pack.

## Current limitation

This phase creates the content production library and its concrete briefs, not binary mod assets. The repository currently has no authorized source artwork/audio/likeness assets and no real-game test environment in CI. The next content-production work must start from user/creator-supplied or newly authored source assets; it must not invent mappings or reuse proprietary PES files.
