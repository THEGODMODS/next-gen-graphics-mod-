# PES 2017 Sider integration

The target runtime is Sider 3.5.x for PES 2017. Consult the upstream documentation before implementing or changing configuration behavior:

- Sider 3 documentation: https://github.com/pes-modding/sider3
- Sider 3.5 readme: https://github.com/pes-modding/sider3/blob/master/doc/readme.txt
- Lua scripting guide: https://github.com/pes-modding/sider3/blob/master/doc/scripting.txt

## Configuration concepts

A compatible Sider configuration uses these settings when the corresponding features are required:

```ini
livecpk.enabled = 1
cpk.root = ".\\livecpk\\nextgen-base"
lua.enabled = 1
; Add one lua.module = "module_name.lua" entry per enabled module.
```

Sider's documented behavior is significant to the manager:

- Multiple `cpk.root` entries are supported.
- Roots are checked in listed order; the first matching file wins.
- Lua modules are loaded from Sider's `modules` directory.
- Sider should remain running while PES is running; inspect `sider.log` when attachment or loading fails.

## Implementation constraints

- Detect and report the actual Sider version where possible; do not silently assume compatibility from a filename.
- Preserve all user-owned INI lines and settings.
- Write only a clearly delimited manager-owned configuration block.
- Back up the original INI before editing and verify the resulting file can be parsed.
- Do not bundle Sider binaries or third-party Lua modules unless their licenses and redistribution terms permit it.
- Do not claim that a Lua module changes graphics unless its code actually implements a supported behavior. Visual asset replacement normally requires correct game-relative replacement files in LiveCPK roots.
