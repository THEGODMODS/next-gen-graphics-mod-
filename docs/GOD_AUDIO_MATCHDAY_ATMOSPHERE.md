# GOD AUDIO — Matchday Atmosphere Department

## Status

Design baseline for the PES 2017 / Sider 3.5 implementation. This document is not a claim that the department is finished or real-game verified. The existing GOD ATMOSPHERE package is a one-shot home-team-selection cue; it is not yet a continuous crowd or match-event system.

## Club selection: biggest / most recognisable

The initial 25-club scope is based on a blend of historical honours, long-term domestic stature, continental profile and broad international recognition. It is deliberately not a current-table ranking. Club identity data must remain editable because PES 2017 patches and option files can assign different team IDs.

### Premier League
1. Manchester United
2. Liverpool
3. Arsenal
4. Chelsea
5. Manchester City

### La Liga
1. Real Madrid
2. FC Barcelona
3. Atlético de Madrid
4. Valencia CF
5. Sevilla FC

### Bundesliga
1. FC Bayern München
2. Borussia Dortmund
3. FC Schalke 04
4. Hamburger SV
5. SV Werder Bremen

### Serie A
1. Juventus
2. AC Milan
3. Inter
4. AS Roma
5. SSC Napoli

### Ligue 1
1. Paris Saint-Germain
2. Olympique de Marseille
3. Olympique Lyonnais
4. AS Monaco
5. AS Saint-Étienne

The five-per-league list is the agreed first release scope. Team IDs, display-name aliases, competition IDs and stadium IDs are intentionally not guessed: they must be supplied by a verified PES 2017 database/patch profile and tested in-game.

## Product experience

The department is a matchday soundscape, not just goal sound effects.

### Core layers
- **Crowd bed:** continuous, loop-safe stadium ambience with seamless loop points; separate home/away balance and configurable loudness.
- **Crowd intensity:** calm, normal, tense and peak states; smooth transitions and no abrupt volume jumps.
- **Supporter identity:** club-specific original chants, call-and-response textures, rhythmic claps/drums and crowd timbre. Every club receives a recognisably different original palette without copying protected recordings or melodies.
- **Match action:** restrained attack/build-up swells, saves, corners, near misses and referee whistles where reliable game signals exist.
- **Club moments:** pre-match entrance, walkout/anthem slot, kickoff, home goal, away goal, half-time, full-time win, full-time draw and full-time loss.
- **Stadium context:** optional stadium-specific reverb/size profile and day/night crowd variation, without assuming stadium IDs are universal.

### Event policy
- Never fire a goal cue merely because an arbitrary animation or file was loaded. Use a verified goal-celebration signal and identify the scoring side before selecting home/away audio.
- Never claim a full-time or half-time callback exists until confirmed in the exact Sider 3.5 API or validated against PES 2017 runtime traces.
- Where the game exposes only a reliable animation-load signal, use a narrowly matched allow-list and debounce it; do not hook broad, frequently loaded files.
- If event attribution is uncertain, fall back to ambience/intensity changes rather than playing the wrong club cue.
- All cues are additive and must duck under gameplay audio/commentary rather than masking it.

## PES 2017 / Sider 3.5 integration constraints

The Sider 3.5 guide documents set_home_team and set_away_team notifications, the livecpk_make_key / livecpk_data_ready file-loading events, and an external audio API (audio.new, play, set_volume, fade_to, pause, finish, when_done). A Sider 3 example detects one player's celebration by matching a specific animation file. These are useful primitives, but they do not establish native goal_scored, half_time or match_end callbacks.

Implementation must therefore:
1. Keep the audio engine isolated from event detection.
2. Use a patch profile to map team IDs to canonical club keys.
3. Validate each goal/celebration file signature in PES 2017 before enabling its cue.
4. Instrument and test candidate half-time/full-time signals before enabling those event slots.
5. Keep a safe ambience-only mode when event detection is unavailable.
6. Avoid memory writes or undocumented addresses in the first implementation.

## Club audio identity data model

Each of the 25 clubs gets a profile with:
- stable internal club key and league key;
- verified PES team ID(s), patch/profile identifier and optional aliases;
- original crowd-bed variant and chant palette;
- home and away reaction multipliers;
- pre-match, goal, half-time and full-time cue slots;
- per-slot enable flags, volume and cooldown;
- provenance, creator and licence metadata for every audio asset.

A profile must be allowed to omit a licensed-song slot. Original crowd/chant material remains the default. Optional user-supplied licensed recordings can be referenced by local file path and must not be redistributed by the project unless the rights holder expressly permits it.

## Configuration and controls

Expose a global master enable, ambience enable, event-cue enable, master volume, ambience volume, cue volume, crowd intensity, home/away balance, and per-event toggles. Club-specific overrides must not require editing Lua source. Invalid values must be rejected or clamped safely and logged once, not on every frame.

## Asset and engineering requirements

- Use original recordings/synthesis or assets with explicit redistribution rights.
- Store source/provenance/licence metadata alongside each asset.
- Prefer WAV for predictable Sider playback; verify RIFF/WAVE structure, codec, sample rate, bit depth, channel count, duration, peak level and loop boundaries.
- Avoid clipping, DC offset, harsh high-frequency content and abrupt loop seams.
- Crossfade ambience layers and duck cues against the crowd bed.
- Ensure every sound object is stopped/released or reused safely; debounce repeated game notifications.
- Fix all audio path construction with path.join in the Node build pipeline and correct Windows separators in generated Lua paths.
- Preserve the installer's backup, hash verification and rollback behaviour.
- Do not mark audio verified until a real PES 2017 + Sider 3.5 test has evidence.

## Acceptance gates

1. 25 club profiles exist and each resolves through a verified team-ID mapping for the declared patch.
2. Ambience loops for at least 10 minutes without audible seams, runaway volume or leaked sound objects.
3. Home/away identity and reaction routing are correct in repeated test fixtures.
4. Goal cue triggers exactly once per goal and never for a non-goal celebration; uncertain attribution falls back safely.
5. Half-time/full-time cues trigger exactly once only after their signals are proven.
6. Pre-match cue timing is correct and does not overlap kickoff or drown out commentary.
7. All global and per-event controls persist and invalid configuration fails safely.
8. WAV metadata, loudness, loop seams, hashes, rights and provenance pass automated validation.
9. Fresh install, overwrite approval, uninstall and rollback pass the existing installer tests.
10. Real-game evidence records exact executable, patch/option-file, Sider version, selected clubs, scenarios and logs.

## Current known gap

The current generated module only plays one selected synthetic WAV on set_home_team. Its paths rely on Sider's ctx.sider_dir value already ending with a directory separator (as the official examples appear to assume); confirm that contract against the exact installed Sider 3.5 build and add path-resolution tests before extending the module. The verifier currently checks only basic RIFF/WAVE headers and fixed counts, not audio format compatibility or match-event behaviour.
