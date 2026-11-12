# Building a verified pitch module

The pitch module builder converts a manually reviewed inventory mapping and replacement files into the existing installer package format. It does not discover runtime-loaded resources, create textures, extract proprietary containers, or infer target paths.

## Workflow

1. Generate an inventory from one Stadium Server stadium:

   ```bash
   npm run inventory:pitch -- "<stadium-folder>" > stadium-inventory.json
   ```

2. Create a descriptor next to a `source/` folder. Every replacement must name an exact inventory path, repeat that resource's SHA-256 fingerprint, and point to an original replacement file.

   ```json
   {
     "schemaVersion": 1,
     "id": "studio.example-pitch",
     "name": "Example Original Pitch",
     "version": "1.0.0",
     "description": "Original replacement texture for a verified stadium resource.",
     "license": {
       "id": "Your actual asset license identifier",
       "redistributionAllowed": false
     },
     "replacements": [
       {
         "inventoryPath": "EXACT_FILENAME_FROM_INVENTORY.dds",
         "originalSha256": "COPY_THE_64_CHARACTER_SHA256_FROM_INVENTORY",
         "replacementFile": "source/EXACT_FILENAME_FROM_INVENTORY.dds"
       }
     ]
   }
   ```

3. Build into a new or empty output directory. For stronger protection against stale inventories, supply the current stadium folder as the optional fourth argument:

   ```bash
   npm run build:pitch-module -- pitch-descriptor.json stadium-inventory.json ./dist-pitch-module "<stadium-folder>"
   ```

4. Inspect the generated `module.json`, then use the manager's normal library scan, installation preview, and transactional installation flow.

## Safety and correctness

- Each original resource path must exist in the supplied inventory and its SHA-256 must still match. A stale inventory fails closed.
- Target paths are derived only from the fixed Stadium Server pitch subtree and the exact inventory path: `LiveCPK/common/bg/model/bg/pitch/<inventoryPath>`. The descriptor cannot redirect a package to an arbitrary game path.
- Replacement paths cannot traverse outside the descriptor folder or follow symbolic links.
- Replacement extension must match the original resource extension. DDS replacements must pass the conservative DDS header and complete compressed mip-payload audit.
- The builder copies replacement assets into a unique staging folder, hashes and audits the staged bytes, then renames the completed package into place. A failed build cleans up its staging folder. It refuses a non-empty output folder.
- License metadata is explicit and preserved in the manifest. `redistributionAllowed: false` permits a private/local package workflow but means the package must not be redistributed. The builder does not grant rights or publish assets.
- A successful package build proves packaging and hash consistency only. It does not prove PES loads that resource, that the DDS encoding matches the game's expected channels/material, or that the result looks correct in-game. Confirm runtime requests with Sider logs and test one resource at a time on a backed-up game copy.

## Desktop workflow

The **Stadiums & Turf → Pitch Builder** screen performs the same workflow inside the Electron manager: select a Stadium Server folder, inventory its pitch subtree, choose one inventoried DDS resource, select a replacement DDS, and build a private-use package. The manager then revalidates the generated package and opens the normal installation preview. The builder re-hashes the original stadium resource immediately before packaging and refuses to proceed if it changed since the inventory. Generated packages are written to a parent folder selected by the user; an existing package folder is never overwritten.

The current desktop builder intentionally handles one resource per package. This keeps the first in-game validation isolated: install one replacement, inspect Sider logs, compare the result in PES, then move on to another resource. It does not infer which resources the game actually requests.
