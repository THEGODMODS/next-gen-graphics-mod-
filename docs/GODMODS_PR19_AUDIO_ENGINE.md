# GODMODS PR 19 — Premium Crowd Engine

## Scope

This milestone advances the Audio & Atmosphere department from a source-only sound library to a reusable, optional Sider 3.5 crowd engine.

## Runtime module

The generated `godmods_atmosphere_matchday.lua` module:

- Uses Sider's documented `audio.new`, `play`, `set_volume`, `finish` and `when_done` sound methods.
- Supports four original premium ambience beds: Open Air, Intimate Ground, Night Match and Cup Final.
- Supports one optional secondary texture layer, independently mixed below the primary bed.
- Supports four manually selected intensity levels: calm, normal, tense and peak.
- Restarts a loop after its WAV completes and prevents a stopped sound's stale completion callback from restarting it.
- Reads a game-root INI and validates every editable setting.
- Is disabled by default; the user must set `enabled = 1` to opt in.
- Stops both layers when ambience is disabled at a team-setup notification.

## Configuration

`GODMODS/Audio/GOD-ATMOSPHERE-MATCHDAY/audio.ini`:

```ini
enabled = 0
ambience = 1
bed = stadium-open-air
texture = none
intensity = 1
volume = 0.16
texture_volume = 0.035
```

The primary bed may be `stadium-open-air`, `stadium-intimate`, `stadium-night` or `stadium-cup-final`. The optional texture is `none` or a different bed. Intensity values are 0–3. Volume values are 0.0–1.0.

## Explicit exclusions

This milestone does not trigger club stingers or infer goal, half-time, full-time, corner or save events. The 25 club identity stingers remain original synthesized source assets; club team IDs, patch-specific aliases and match-event signals require target-install evidence before routing. The engine uses no undocumented memory hooks and does not replace commentary or native game audio.

## Validation boundary

Automated source tests and Lua 5.1 parsing can validate generated code and package integrity. They cannot prove audible loop continuity, commentary balance, correct runtime path resolution, long-session stability or compatibility with the user's exact PES 2017 + YosfX + Sider installation. Those remain controlled in-game tests.
