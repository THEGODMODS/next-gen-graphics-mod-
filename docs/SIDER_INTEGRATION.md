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


## Manager-owned INI block implementation

The manager's Sider adapter builds a clearly delimited block using the documented
`livecpk.enabled`, `cpk.root`, `lua.enabled`, and `lua.module` settings.
It replaces only its own block, sorts and de-duplicates requested registrations,
and refuses malformed or duplicate ownership markers. Removal likewise targets
only the delimited block.

This is currently a tested configuration-building layer, not yet an active
write path in the desktop app. The app does not yet copy Lua payloads into
Sider's modules directory, discover a compatible Sider version, back up and
atomically update a real `sider.ini`, or expose module activation controls.
Those steps remain gated until the manifest explicitly defines LiveCPK root
semantics and the filesystem transaction can track Sider configuration changes.


## LiveCPK root synchronization in the desktop manager

The manager now has an explicit **Register LiveCPK roots** action. It reads the
installed-module journal and registers the game's `LiveCPK` directory only
when at least one installed module owns files beneath `LiveCPK/`. It does not
register roots for uninstalled package previews.

Before changing `sider.ini`, the manager requires a regular, non-symlink file,
creates a timestamped backup under its private manager-state directory, updates
only its delimited block, writes through a temporary file, and verifies the
result. Repeated synchronization is idempotent. If there are no installed
LiveCPK payloads, it removes only the manager-owned block.

This action currently manages LiveCPK roots only. Lua payload installation and
registration, Sider version detection, and live-game verification remain
separate unfinished tasks. The manager does not silently activate anything
during package installation.
