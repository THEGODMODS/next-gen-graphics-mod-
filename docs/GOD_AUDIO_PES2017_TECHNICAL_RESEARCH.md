# GOD AUDIO — PES 2017 Audio Format, Routing and Team-ID Research

Research baseline only. The user's installed patch/option-file is not yet identified, so the IDs below are reference values, not enabled runtime mappings.

## Executive decision

Use two separate integration routes:
1. Sider Lua audio playback for original ambience and additional cues. Keep these assets as PCM WAV files for Sider's audio.new playback.
2. Native PES audio-bank replacement only after extracting and identifying the exact CPK resource path, ACB cue sheet, AWB waveform bank, cue IDs, codec, loop metadata and encryption state.

LiveCPK is a path-based override. Its root is a folder whose descendants mirror the game's exact internal relative paths. A folder named AudioServer has no special meaning by itself.

## 1. Audio formats and containers

| Format | Meaning | GOD AUDIO decision |
|---|---|---|
| WAV PCM | Uncompressed waveform file | Preferred source and Sider Lua playback asset. Validate RIFF chunks, PCM format, sample rate, channels, bit depth and loop points. |
| ADX | CRI lossy audio codec | Valid codec, but not a universal PES 2017 requirement. Do not convert everything to ADX by default. |
| HCA | CRI high-compression codec | Proven in historical PES 2017 chant packs. Use for native-bank work only when matching the original bank settings. |
| ACB | Atom CueSheet Binary | Cue/sequence metadata and playback parameters. |
| AWB | Atom Wave Bank | Holds encoded waveform data referenced by the ACB, especially streamed audio. |
| ACF | Atom Configuration File | Project-wide CRI Atom settings. Do not replace casually. |
| CPK | Konami game archive | Original archive containing the game's internal resource tree. |

HCA and ADX are codecs, not substitutes for the ACB/AWB relationship. Replacing one raw HCA file without preserving cue metadata, waveform indexing, encryption and length references is unsafe.

CRI documentation describes ACB as cue metadata/parameters and AWB as the streaming waveform bank. CRI Atom Craft builds related binaries together. Keep ACB/AWB and project settings coherent.

## 2. PES 2017 evidence

Historical releases provide concrete evidence:
- Predator002's 2017 chants pack advertises 589 teams with eight chant slots each plus 64 generic slots (4,776 audio files). It says playback depends on corresponding team ID and licensing state, and audio is HCA.
- Mauri_d's PES 2017 chant pack covers 23 teams, specifies 48 kHz stereo HCA (explicitly not ADX), and claims DLC 3/default team-ID compatibility.
- A PES 2017 Schalke goal-song mod also specifies 48 kHz stereo HCA and recommends Stadium Server. Its sound folder is placed under a Stadium Server stadium folder's common tree, with a StadiumServer Lua module.

This proves HCA is a supported precedent for native PES 2017 chant/goal-song bank work. It does not prove every PES audio resource uses HCA or that 48 kHz stereo is a universal requirement.

## 3. WAV specification for Sider Lua playback

Sider's audio implementation exposes audio.new(filename) and sound methods including play, pause, finish, set_volume, get_volume, fade_to and when_done. This is separate from native CRI audio banks.

For generated GOD AUDIO WAVs:
- PCM integer, 16-bit.
- Existing generated ambience uses 22,050 Hz mono. Keep this as a source baseline; test alternate rates only if needed.
- Mono for centred ambience; use stereo only for intentionally authored stereo field recordings.
- Parse RIFF chunks rather than hard-coding the data chunk offset. Optional chunks can change its location.
- Master conservative loudness and true peak. Crowd must sit below commentary and native game effects.
- Select stable loop points and use fades/crossfades. A 45-second duration does not itself guarantee a seamless loop.
- Keep source masters separate from runtime assets and retain provenance/licence metadata.

The 48 kHz stereo HCA setting from historic chant packs is a reference for native-bank work, not a blanket WAV requirement.

## 4. Native PES audio-bank workflow

1. Identify the exact PES 2017 CPK and internal resource path from the installed game files. Do not guess common/aud/stadium paths.
2. Extract the relevant ACB and paired AWB, if present. Record original names, hashes, cue IDs, waveform IDs, codec, sample rate, channels, loop markers and encryption status.
3. Inspect and audition the bank with compatible CRI tools. CRI Atom Viewer can inspect ACB/AWB/ACF outputs built with Atom Craft.
4. Preserve cue order/IDs and references. If HCA is encrypted, determine key/subkey requirements before rebuilding.
5. Rebuild with CRI Atom Craft/Encoder using matching encoding, streaming, channel, loop and sample-rate settings. Keep ACB and AWB consistent.
6. Place replacements under a LiveCPK root mirroring the exact original path, or package a correctly ordered CPK using the user's established patch workflow.
7. Test the target club and unrelated clubs; verify fallback audio and commentary.

Do not ship native-bank replacements until the actual target bank has been extracted and round-trip tested.

## 5. LiveCPK root semantics

Sider's cpk.root points to a directory whose descendants mirror the game's internal paths. If the game requests common/render/thumbnail/ball/ball_001.dds, that exact relative path must exist beneath the root.

- livecpk.enabled = 1 enables LiveCPK.
- Each cpk.root is a root folder, not a particular audio file.
- Multiple roots are allowed. Sider checks them in listed order; the first matching file wins.
- Relative roots resolve relative to the folder containing sider.exe.
- AudioServer is only a folder name; its child paths still must match the game's exact requests.
- Keep custom roots isolated and document their priority to avoid conflicts with patch roots.

Conceptual Sider/game-root layout:

    PES 2017/
      sider.exe
      sider.ini
      GODMODS/Audio/GOD-ATMOSPHERE-MATCHDAY/audio.ini
      content/GODMODS/Audio/GOD-ATMOSPHERE-MATCHDAY/*.wav
      modules/godmods_atmosphere_matchday.lua
      livecpk-audio-root/<exact-original-game-relative-paths>

The final LiveCPK subtree remains empty until exact resource paths are extracted from the user's game.

## 6. Stadium Server

PES 2017 Stadium Server v1.3 lists supported stadium resource trees including common/bg/model/bg/audi and other stadium subfolders; common/demo/fixdemo resources for entrance, goal and result; and common/demo/anime/behavior/fixdemo/animations. It maps home teams through map_teams.txt and competitions through map_competitions.txt. Its GDB layout mirrors the original CPK tree beginning at common.

Historical goal-song mods put sound resources under content/stadium-server/<stadium-folder>/common and use a StadiumServer Lua module. This is precedent, not proof every chant slot is controlled by Stadium Server. Never overwrite a user's existing StadiumServer.lua blindly; inspect the installed version and integrate compatibly.

## 7. Sider 3.5 event boundaries

The Sider 3.5.1 programmer guide documents set_home_team(ctx, team_id) and set_away_team(ctx, team_id) after team selection/next-match determination. These are suitable for loading club profiles.

The guide also documents livecpk_make_key, livecpk_get_filepath and livecpk_rewrite for file lookup/rewriting. They are not goal, half-time or full-time events.

Sider examples demonstrate a narrowly matched animation-file load as a celebration signal in a specific case. This is not a universal goal callback. Any detector must be tested against the exact PES executable/patch, debounced and able to attribute the scoring side. If attribution is uncertain, do not play a club-specific cue.

Do not assume later Sider 4 events exist in Sider 3.5.1. Use only documented events or signals proven by runtime traces.

## 8. Reference IDs for the 25-club shortlist

These are reference values from PES 2017 default database lists (2016-era team lists and corroborating Bundesliga ID material). They are not active mappings for an unknown patch. The installed database/option file is authoritative.

| League | Club | Reference team ID |
|---|---|---:|
| Premier League | Manchester United | 100 |
| Premier League | Liverpool | 103 |
| Premier League | Arsenal | 101 |
| Premier League | Chelsea | 102 |
| Premier League | Manchester City | 173 |
| La Liga | Real Madrid | 109 |
| La Liga | FC Barcelona | 108 |
| La Liga | Atlético de Madrid | 172 |
| La Liga | Valencia CF | 110 |
| La Liga | Sevilla FC | 265 |
| Bundesliga | FC Bayern München | 127 |
| Bundesliga | Borussia Dortmund | 126 |
| Bundesliga | FC Schalke 04 | 184 |
| Bundesliga | Hamburger SV | 129 |
| Bundesliga | SV Werder Bremen | 185 |
| Serie A | Juventus | 120 |
| Serie A | AC Milan | 121 |
| Serie A | Inter | 119 |
| Serie A | AS Roma | 125 |
| Serie A | SSC Napoli | 327 |
| Ligue 1 | Paris Saint-Germain | 114 |
| Ligue 1 | Olympique de Marseille | 113 |
| Ligue 1 | Olympique Lyonnais | 181 |
| Ligue 1 | AS Monaco | 112 |
| Ligue 1 | AS Saint-Étienne | 418 |

Gemini's list had clear errors for this reference database: Manchester City is 173, not 104; Atlético Madrid is 172, not 111. In the reference list, 104 is Leeds United and 111 is Deportivo La Coruña.

Patch modifications can replace, reorder, repurpose or add teams, and may alter licensing flags/callnames. The catalog therefore stores these values as referenceTeamId; operational teamIds remain empty until the installed patch is verified. Inspect the actual Edit.bin/EDIT00000000 database or the patch's own team list, then confirm by team name, callname and in-game selection.

## 9. Club identity and rights

Use original or explicitly licensed material for all 25 clubs: distinct crowd timbre, original supporter rhythms and call-and-response, home/away intensity balance, entrance cues and goal cues. Club names can identify profiles but do not grant music rights. Do not package commercial songs, official club anthems, broadcast recordings or supporter recordings without the required rights.

## 10. Current build status and next steps

Already present on the feature branch: 25-club catalog with original identity concepts; reference IDs stored as non-active metadata; generic two-layer crowd engine; independent volume controls and ambience toggle; generated PCM WAV assets.

Research-driven fixes made in this branch:
- WAV verifier now parses RIFF chunks correctly; previous code searched for the data identifier at the wrong offset.
- Audio module no longer assumes ctx.sider_dir exists. The Sider 3.5.1 documented context does not include that field. Audio config and assets use game-root-relative paths; README requires launching Sider with the PES 2017 folder as working directory.
- Loop restarts now read the current volume setting instead of retaining the initial callback-captured value.

Next:
1. Run CI and fix remaining failures.
2. Obtain exact patch/option-file name and version, plus Sider version.
3. Verify all 25 IDs against that patch and create an editable patch map.
4. Build 25 distinct original identity assets and route only when the active map matches.
5. Inspect installed audio CPKs/ACB/AWB before native chant-bank replacement.
6. Integrate Stadium Server only after identifying its installed version and module layout.
7. Add goal/half-time/full-time reactions only after reliable signals and scorer-side attribution are proven.
8. Run real-game loop, home/away, 25-team selection, goal, fallback, commentary-balance and Sider-log tests.

## Research references

- Sider 3.5.1 programmer guide: https://github.com/pes-modding/sider3/blob/master/doc/scripting.txt
- Sider 3.5.1 LiveCPK root semantics: https://github.com/pes-modding/sider3/blob/master/doc/readme.txt
- Sider audio implementation: https://github.com/pes-modding/sider3/blob/master/audio.cpp
- PES 2017 default team list: https://parchespes2017.blogspot.com/2016/10/team-list-id-pes-2017.html
- PES 2017 Bundesliga IDs: https://mohammadahsanulm.blogspot.com/2017/01/pes-2017-bundesliga-2016-17-kits.html
- PES 2017 HCA chant pack: https://www.ketubanjiwa.com/2017/02/pes-2017-chant-pack-by-mauri-d.html
- PES 2017 589-team/eight-slot chant pack: https://www.ketubanjiwa.com/2017/04/pes-2017-chants-update-v1-21-04-2017-by-predator002.html
- PES 2017 goal-song/Stadium Server example: https://www.ketubanjiwa.com/2017/06/pes-2017-fc-schalke-04-goal-song-goaltune.html
- PES 2017 Stadium Server v1.3: https://pes-files.com/pes-2017-sider-module-stadium-server-v1-3-2/
- CRI Atom Craft ACB/AWB build overview: https://blog.criware.com/index.php/2024/09/05/adx-beginners-guide-15-building-binary-data/
- CRI AWB documentation: https://game.criware.jp/manual/adx2_tool_en/latest/criatom_tools_atomcraft_awb_file.html
- CRI material encoding/loop settings: https://game.criware.jp/manual/adx2_tool_en/latest/criatom_tools_atomcraft_material_infomation.html
- CRI supported codecs: https://game.criware.jp/manual/native/adx2_en/latest/criatom_feat_voice_codec.html
