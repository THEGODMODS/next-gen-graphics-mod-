# GOD WEATHER + GOD MATCHDAY — Condition Control Suite

## Original profiles

This release adds four original Sider 3.5 condition profiles:

| Profile | Time | Weather | Season |
|---|---|---|---|
| GOD WEATHER — Fine Day | Day | Fine | Summer |
| GOD WEATHER — Rain Day | Day | Rain | Summer |
| GOD WEATHER — Rain Night | Night | Rain | Summer |
| GOD MATCHDAY — Winter Night | Night | Fine | Winter |

The profiles use Sider 3.5's documented `set_conditions` and `set_conditions_for_replay` events. The values are the PES 2017 values: `timeofday` 0=day / 1=night, `weather` 0=fine / 1=rain, `season` 0=summer / 1=winter. See the [Sider 3.5 scripting reference](https://github.com/pes-modding/sider3/blob/master/doc/scripting.txt).

## Important compatibility boundary

Sider 3.5's documented weather values are fine and rain. These packages do not claim snow, fog, wet-surface shaders, puddles, spray, dynamic lighting, or weather simulation. Rain profiles set Sider 3.5's documented `weather_effects = 2` flag to request falling rain. Actual rain rendering still requires an in-game check on the target patch/stadium. Wet pitch materials, puddles, spray and reflections require separate verified resources and are not included.

All seven stadium-condition profiles (the three existing GOD STADIUMS presets plus these four) are declared mutually exclusive in their manifests. Enable only one condition module at a time. The modules are optional; they do not edit the user's `sider.ini`, stadium files, CPKs, or executable. The user adds the module entry manually and can remove it to roll back.

## Build and validation

- `npm run mods:build-packs` builds the four packages with the existing module library.
- `npm run mods:verify-packs` checks package manifests, paths, hashes and Sider API structure.
- `npm test` includes a dedicated profile regression test.

A successful package build verifies source/package structure only. It is not a claim of in-game compatibility.
