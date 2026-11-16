# GODMODS final department stack

This is the consolidated engineering pass after GOD KITS and GOD FACES mapping workbenches. It deliberately keeps the remaining department work in one review and one Windows quality run.

## Included in this stack

- **GOD AUDIO:** source WAV integrity already has a dedicated auditor. This pass adds the final evidence contract for exact installed event IDs, team/competition IDs, measured loudness, commentary mix review, loop review, in-game playback capture and rollback.
- **GOD GAMEPLAY:** keeps the bounded, disabled-by-default profile model. Final acceptance now requires at least three completed full-match runs, repeatable scenario/match IDs, numeric outcome metrics, logs, captures, stability review and rollback.
- **GOD STADIUMS & TURF, GOD KITS & EQUIPMENT, GOD FACES:** final resource acceptance requires the exact installed resource ID/path, source and target hashes, inspected UV evidence, material role, verified texture format, in-game capture and tested rollback.
- **GOD VISUALS / CINEMATIC / NATURAL:** a graphics host must explicitly declare input/output primaries and transfer functions, provide adapter evidence and in-game captures, and pass profile-conflict tests. A .cube file alone is not proof of a working PES colour pipeline.
- **Cross-department:** interaction, performance and rollback evidence are required before release readiness.

## Final evidence command

`npm run validate:godmods-integration -- path/to/integration-evidence.json`

The schema is intentionally fail-closed. It rejects missing IDs, guessed paths, unsafe traversal, missing hashes, incomplete measurements, absent captures, untested rollback and incomplete full-match evidence. See `tests/godmods-integration-gate.test.ts` for a synthetic fixture. Fixture values are test-only and do not represent actual YosfX resources or game test results.

A successful report means the submitted evidence is internally complete. The validator cannot authenticate evidence or deploy anything; `deploymentAuthorized` remains false. The game must be tested on the exact user's PES 2017/YosfX installation before any real integration can be marked verified.

## Safety and honest status

No original CPK, executable, option file, patch, Stadium Server, Kit Server, Face Server, LiveCPK resource or Sider configuration is edited by this gate. Existing source audits remain separate and continue to report source QA independently from runtime compatibility. Do not infer real resource IDs, event IDs, UVs, colour host APIs or gameplay behaviour.
