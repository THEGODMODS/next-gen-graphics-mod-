# PES 2017 pitch resource discovery

## What is verified

Sider 3 LiveCPK replaces a requested game-relative path by searching configured roots. The upstream Sider documentation gives an example replacement path and explains that roots are checked in order. This means a correct asset must preserve the exact internal path requested by the game; a visually correct DDS at the wrong path does nothing.

For stadium-server-managed PES 2017 stadiums, the documented stadium folder layout includes the pitch subtree:

\`common/bg/model/bg/pitch\`

The Stadium Server documentation describes this as one of the supported stadium content folders. This is the strongest initial integration target for a stadium-specific pitch pack.

## What is not yet verified

- The exact texture filenames and variants for each stadium.
- Whether a target stadium uses the same pitch resources as another stadium.
- Which resources are diffuse, normal, mask, lightmap, turf, or 3D grass data.
- The container/encoding required for each specific file.
- Whether a stadium is loaded through Stadium Server, a CPK, or another loader.
- Whether the intended Sider version and stadium-server module combination supports the installation.

Do not assume that every file in the pitch subtree is a DDS or that a DDS can be dropped in as a replacement. Do not replace model, XML, MTL, or texture resources without identifying their role and exact expected format.

## First pack acceptance process

1. Select one stadium-server-managed stadium and record its folder name and stadium ID.
2. Inspect that stadium's existing pitch subtree locally. Record every relative path, extension, byte size, and SHA-256.
3. Identify which texture resources are actually requested by the game. Use Sider logs and controlled one-file-at-a-time replacement tests.
4. Determine each resource's real container format and channel semantics. Preserve all untouched resources.
5. Produce one original replacement at a time. Keep source art and conversion settings alongside the build, but do not include proprietary source game assets in the public repository.
6. Put the replacement at the exact same relative path under the module's LiveCPK root.
7. Test on a disposable game copy, first with only that module enabled. Check Sider logs and compare matched screenshots.
8. Expand to other stadiums only after the first stadium passes.

## Why this is stadium-server-first

The documented Stadium Server layout gives a concrete stadium-specific content tree to inspect. A universal pitch replacement is not a safe first target: stadiums can have different material layouts and texture sets. The first release should therefore target one verified stadium and clearly declare that compatibility, rather than pretending to support every PES 2017 stadium.

## References

- Sider 3.5 LiveCPK documentation: https://github.com/pes-modding/sider3/blob/master/doc/readme.txt
- Stadium Server 1.3 supported stadium folder layout: https://pes-files.com/pes-2017-sider-module-stadium-server-v1-3-2/
- PES 2017 stadium/pitch resource notes: https://implyingrigged.info/wiki/Pro_Evolution_Soccer_2017/Stadiums

Third-party mod packages and texture sets are references only. Do not copy or redistribute them without permission.

## Sider pitch log evidence analyzer

The desktop Diagnostics screen can inspect a user-selected Sider `sider.log` (or another text log). It extracts lines containing the Stadium Server pitch subtree `common/bg/model/bg/pitch`, groups repeated resource path strings, and retains a bounded sample of the raw matching lines. The parser labels lines as positive-keyword, issue-keyword, or unclassified using simple text heuristics.

These labels are not a Sider protocol parser and do not prove a resource was rendered. A matching path is evidence that the path appeared in that log text only. A missing path is not proof that PES did not load it: logging levels, alternate paths, containers, and other logs can hide resource activity. For useful comparisons, preserve a clean log for a known stadium, make one controlled change, then compare a second log. Do not infer resource role from filename alone.

The desktop app limits selected logs to 32 MiB, scans at most 100,000 lines, returns at most 1,000 distinct paths and 500 raw evidence lines, and reads the file without modifying it.
