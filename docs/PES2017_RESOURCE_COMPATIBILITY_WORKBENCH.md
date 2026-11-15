# GODMODS — PES 2017 Resource Compatibility Workbench

## Purpose

This workbench turns a user's local PES 2017 / YosfX / Stadium Server / Kit Server installation into a compact, read-only resource inventory. It is the bridge between original GODMODS art and a defensible resource mapping. It does not guess resource names, UV layouts, material channels or player/team IDs.

## Read-only discovery

Run from the project root:

```bash
node tools/pes2017-resource-audit.mjs scan "D:/Games/PES 2017"
node tools/pes2017-resource-audit.mjs scan "D:/Games/PES 2017/livecpk/StadiumServer" "stadium-inventory.json"
```

The report records relative path, extension, byte size, SHA-256, a conservative path-based category and DDS header/payload diagnostics. Symlinks are not followed. The scanner has a 100,000-file and 512 MiB per-file safety ceiling. It never edits the selected directory. It does not scan the contents of compressed CPK/FPK containers; unpack those with your existing trusted tools into a disposable copy if you need their internal paths.

Categories are discovery hints only. A path containing `pitch` is not proof that a file is the active pitch material. DDS validity is not proof that the target shader accepts that format.

## Mapping evidence contract

Create a JSON mapping manifest only after selecting one concrete stadium, kit or player resource. Use the exact relative paths and SHA-256 values from the inventory. Include:

- Exact PES 2017 executable/build, patch and Sider version.
- Original GODMODS source asset path and SHA-256.
- Target resource relative path and SHA-256.
- Intended role (diffuse, normal, roughness, mask, adboard, pitch, face-detail or hair-detail).
- Evidence method and a relative path to the log/notes/capture used to establish the binding.
- Explicit confirmation of UV layout, material role and target pixel format.

The validator checks file identity and evidence completeness. It cannot infer whether a UV layout is correct or whether a shader interprets a channel as intended; those confirmations must come from actual inspection/testing.

Validate:

```bash
node tools/pes2017-resource-audit.mjs validate "mapping.json" "D:/Games/PES 2017"
```

A successful result is labelled `resource-mapped-not-game-verified` unless a complete real-game test record is supplied. In-game verification requires timestamp, exact game build, patch, Sider version, evidence path and a successful rollback test. A manifest cannot make those facts true by setting a status string.

## Example manifest

```json
{
  "schemaVersion": 1,
  "department": "stadiums",
  "target": { "game": "PES 2017", "executable": "PES2017.exe" },
  "compatibility": { "patch": "record exact installed patch", "siderVersion": "record exact version" },
  "mappings": [{
    "sourceRelativePath": "source-assets/pitch.dds",
    "sourceSha256": "replace-with-64-character-lowercase-sha256",
    "targetRelativePath": "common/bg/model/bg/pitch/actual-resource.dds",
    "targetSha256": "replace-with-64-character-lowercase-sha256",
    "resourceRole": "pitch",
    "mappingEvidence": { "method": "sider-log", "evidenceRelativePath": "evidence/pitch-resource.log" },
    "uvLayoutConfirmed": false,
    "materialRoleConfirmed": false,
    "pixelFormatConfirmed": false
  }]
}
```

The example is intentionally not valid until real values and confirmations are supplied.

## Department-specific integration gates

### Stadiums & Turf
Start with one selected Stadium Server stadium. Capture the stadium folder identity and exact `common/bg/model/bg/pitch` resources. Determine which files are requested using controlled Sider logs and one-file-at-a-time disposable tests. Keep LED board/fascia masters as source artwork until the target UV, dimensions, alpha convention and texture format are established. Do not promote the current namespaced turf DDS files into guessed game paths.

### Kits & Equipment
Select one existing kit and identify its actual Kit Server resource and UV layout. Confirm fabric-only islands and protect crests, sponsors, shirt numbers, names, fonts, sleeve patches and kit colours. Confirm whether the target uses diffuse-only shading or any supported normal/specular channels. GOD KITS weave/normal/roughness maps remain sidecar sources until this is known.

### Players
Select one existing face/hair asset with permission to test. Confirm face and hair resource paths, UVs, material slots and player/roster mapping from the installed patch. Never infer player IDs from names or substitute a face. Preserve skin colour, likeness, hairline, facial hair and tattoos. GOD FACES neutral detail maps remain source assets until UV and shader validation passes.

### Graphics
Treat LUTs as external source grades until a supported colour pipeline consumes them. Verify the exact Sider graphics callback/version and host colour space. Do not stack GOD VISUALS, GOD CINEMATIC and GOD NATURAL simultaneously.

## Release ladder

1. Source generated — deterministic asset and hash manifest exists.
2. Resource discovered — exact installed target path is recorded.
3. Resource mapped — source/target hashes and material/UV evidence are recorded.
4. Game verified — matched captures, exact build/patch/Sider versions, stability and rollback are recorded.
5. Release ready — installer collision checks, disable/uninstall and full regression tests pass.

Only level 4 may be called in-game verified. The scanner is read-only; installation remains a separate explicit operation after review.
