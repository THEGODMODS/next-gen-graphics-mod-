# GOD STADIUMS — Verified Resource Inventory

## Purpose

The Stadium Server resource inventory scans the selected stadium's actual `common/bg/model/bg` subtree and records model-relative file paths, sizes and SHA-256 hashes. DDS resources also receive a structural header audit, including dimensions, mip count, pixel format and payload completeness.

Run:

```bash
npm run inventory:stadium-resources -- "<stadium-folder>"
```

The command emits a JSON inventory. It does not modify the stadium folder. Symbolic links are reported but never followed; missing or unsafe model subtrees fail closed.

## Evidence-gated artwork mapping

Use the inventory to identify candidate LED-board, fascia or other stadium resources from their actual files. Before creating an overlay, verify:

1. The resource is actually requested by the selected stadium in the target PES 2017 + Stadium Server setup.
2. Its exact path, dimensions, DDS format, mip count, alpha/channel convention and UV/material role are known.
3. The replacement artwork is exported to that exact resource specification.
4. The original resource hash still matches the inventory immediately before packaging.
5. The overlay is namespaced, collision-checked, reversible and tested one resource at a time.

The inventory does not infer material names, UV coordinates, runtime requests or which DDS is an LED board. File names and visual inspection are evidence, not proof of a live material binding.

## Existing pitch workflow

For pitch resources, continue using `npm run inventory:pitch` and the verified pitch module builder. It restricts replacements to the conventional pitch subtree and requires the exact original resource hash. GOD TURF's nine-surface sidecar remains an additive source library until a real stadium mapping is verified.

## Compatibility boundary

A successful inventory proves only that the selected folder was scanned and its files fingerprinted. It does not prove PES loads those resources, that a replacement renders correctly, or that the stadium is compatible with every patch. Record the exact executable, patch, Sider and Stadium Server versions during in-game validation.
