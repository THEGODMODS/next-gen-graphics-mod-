# EA SPORTS FC 27-inspired / PES 2017-native upgrade research

## Design target

Use FC 27 as a quality reference, not as a source of extracted assets or proprietary shaders. EA's official PC deep dive describes optional Enhanced Ultra Visuals, Performance/Balanced/High/Ultra presets, VRAM awareness and performance tuning. Its gameplay materials emphasise player spatial awareness, contextual movement, manual defending and more grounded match-to-match variation. The transferable design principles for this project are: a premium visual ceiling, a sensible performance ladder, readable player/ball/pitch presentation, restrained lighting, material fidelity and meaningful gameplay tuning—not a blanket saturation or sharpening filter.

## What PES 2017 actually exposes

The official Sider 3.5 documentation for PES 2017 describes:
- LiveCPK roots as ordered file-override directories. The first matching relative path wins.
- Lua 5.1/LuaJIT modules loaded from Sider/modules and registered in sider.ini.
- The set_home_team event for applying per-match graphics/gameplay settings.
- The set_conditions and set_conditions_for_replay events for returning supported weather, time-of-day and season options.
- The documented gfx library: brightness (default 1.0), sharpness (0.166), shadow_softness (0.5), reflection (1.0).
- The documented gameplay library: ball_weight, ball_physics, ball_bounce, ball_friction, ball_magnus, ball_scale_x/y/z, shooting_power, speed and speed_global.

Important caveat: Sider's own 3.5.1 guide explicitly calls the gameplay controls experimental and warns that some changes are sensitive or have side effects. GOD GAMEPLAY therefore ships disabled by default, uses only the documented library properties, and requires scenario-based testing. No undocumented memory patch or invented AI hook is included.

## Product upgrades in this tranche

### GOD VISUALS / GOD NATURAL / GOD CINEMATIC
- Retains the six original 17-cube LUT source grades for compatible external colour-management workflows.
- Adds six native Sider graphics profiles and a Lua adapter using only the documented gfx properties.
- Includes conservative Broadcast, Natural, Cinematic, Night, Sunlit and Performance starting profiles.
- The adapter reads a user-selected gfx.ini on the Sider set_home_team event. The module is not automatically registered or installed without user approval.

### GOD KITS — existing kit appearance, not new kits
- Removes the fictional new-kit design plates from the product.
- Adds four original fabric families: performance knit, classic cotton, ventilated mesh and goalkeeper grip.
- Each family has a diffuse weave overlay, normal source and roughness source (12 DDS maps total).
- These are masked authoring layers for the user's existing kit UV textures. They do not replace club designs, crests, sponsors, names, numbers or colours.
- Never apply a generic fabric layer globally: UV islands and target texture paths must be identified. Additional normal/roughness channels are used only if the target PES material supports them.

### GOD TURF
- Six seeded pitch variants now have genuinely distinct albedo patterns, mowing bands and wear variation.
- Each has albedo, normal-source and roughness-source DDS maps, full mip chains and SHA-256 records (18 maps total).
- Normal/roughness are source authoring maps; PES shader channel support and resource mapping still require validation.

### GOD STADIUMS
- Keeps five sponsor-neutral editable LED/adboard master designs.
- Adds an optional Sider conditions module for documented time-of-day, weather and season overrides, including replay conditions.
- It is disabled by default and never guesses or changes stadium IDs. Stadium texture replacement still requires an exact stadium-specific resource mapping.

### GOD FACES
- Adds micro-normal source maps alongside the procedural skin-tone and hair source textures.
- No face mesh, player likeness, player ID or roster mapping is fabricated.

### GOD ATMOSPHERE
- Keeps synthetic source audio separate from licensed club chants, anthems, commentary or captured supporter recordings.
- Production still requires sound mastering, PES-compatible encoding and verified event mapping.

### GOD GAMEPLAY
- Adds three conservative Sider profile files and a documented gameplay-library adapter.
- Adapter is opt-in (enabled=0 by default). Profile values are starting points, not claims of a proven gameplay balance.
- Must be tested in repeatable match scenarios: first touch, passing, through balls, ball bounce/friction, shooting, acceleration, fatigue, fouls and AI behaviour.

## Release and compatibility gates

Do not mark any source package as one-click installable until all of the following are established:
1. Exact PES 2017 executable/build and Sider version.
2. Exact LiveCPK relative paths or kit/stadium resource mapping from the installed patch.
3. Target DDS format, dimensions, alpha handling, mip count and channel convention.
4. Before/after screenshots from identical stadium, time, weather, camera and player/kit.
5. Performance comparison on supported hardware.
6. Backup, conflict detection, hash verification, uninstall and rollback test.
7. Rights and provenance for all third-party material.

## Research references

- EA SPORTS FC 27 PC Deep Dive (official): https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-pc-deep-dive
- EA SPORTS FC 27 Gameplay Deep Dive (official): https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-gameplay-deep-dive
- EA SPORTS FC 27 features (official): https://www.ea.com/games/ea-sports-fc/fc-27/features
- Sider 3.5 PES 2017 README: https://github.com/pes-modding/sider3/blob/master/doc/readme.txt
- Sider 3.5 Lua scripting guide: https://github.com/pes-modding/sider3/blob/master/doc/scripting.txt
- Sider 3.5 graphics example: https://github.com/pes-modding/sider3/blob/master/modules/gfx.lua
- Sider 3.5 gameplay example: https://github.com/pes-modding/sider3/blob/master/modules/gameplay.lua
- PES 2017 graphics/turf/weather modding precedent: https://pesnewupdate.com/pes-2017-gfx-next-gen-by-pes-mod-goip/
- PES 2017 Reshade/turf/stadium/crowd precedent: https://steamcommunity.com/sharedfiles/filedetails/?id=770118087

This research informs original implementation. It does not copy EA assets, proprietary shaders, or third-party mod packages.
