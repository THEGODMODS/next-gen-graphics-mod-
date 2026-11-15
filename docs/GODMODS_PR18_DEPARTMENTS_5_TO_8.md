# GODMODS Premium Build — PR 18 (Departments 5–8)

## Scope
5. Audio & Atmosphere
6. Gameplay
7. Graphics grade pipeline (GOD VISUALS, GOD CINEMATIC and GOD NATURAL)
8. Final cross-department source and compatibility regression

## New measured QA systems

### Audio — GOD ATMOSPHERE
`tools/godmods-audio-qa.mjs` reads the generated PCM WAV assets and independently measures sample peak, RMS, clipping, duration, stream format and SHA-256. It also verifies the 350 ms sample-identical loop seam in all four generic ambience beds. It checks 25 original synthesized club stingers and four generic ambience beds. It does not claim authentic chants, commentary mastering, PES event-slot mapping or in-game routing.

### Gameplay — GOD GAMEPLAY
`tools/godmods-gameplay-qa.mjs` validates all five profiles, the eight supported adapter properties, every declared numeric bound, INI structure, disabled-by-default state, hashes and eight offline QA scenarios. Profiles remain experimental and not game-verified. The validator rejects enabled-by-default profiles and out-of-range/unknown properties.

### Graphics — GOD VISUALS / CINEMATIC / NATURAL
`tools/godmods-lut-qa.mjs` parses the .cube source files, checks lattice size, exact entry count, finite [0,1] values, domain declarations, SHA-256 and identity neutrality. It requires explicit non-stacking and colour-space warnings. It does not convert transfer functions or inject a PES 2017 shader. The host's input/output primaries and transfer function remain to be confirmed.

### Final regression
`tools/godmods-final-regression.mjs` aggregates audio, gameplay, all three LUT libraries and the read-only DDS inventory. It produces a machine-readable report separating source QA from game integration. It deliberately keeps `gameCompatibilityVerified` and `releaseReady` false until actual PES 2017/YosfX evidence and rollback tests exist.

## Commands

```bash
npm run audit:godmods-audio
npm run audit:godmods-gameplay
npm run audit:godmods-luts
npm run audit:godmods-final
```

The final regression writes to stdout by default. To save a report outside the generated asset root:

```bash
node tools/godmods-final-regression.mjs "content/originals/generated" "godmods-final-regression.json"
```

## Release truth

Passing source QA means the generated assets and their declared formats/integrity checks are internally consistent. It does not prove they load in PES 2017. Before release, the installed executable/build, patch, Sider version, actual resource IDs, audio event IDs, colour host, performance, coexistence and rollback must all be evidenced on the target setup. No original game or patch files are changed by these auditors.
