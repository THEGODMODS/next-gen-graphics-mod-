# THEGODMODS package release operations

This guide provisions the publisher side of Phase 2 without putting a signing secret in the application or repository.

## 1. Create the publisher key once

Run on a trusted offline workstation. Keep the private key in encrypted offline storage and back it up under the studio's key-custody policy.

```js
// node --input-type=module
import { generateKeyPairSync } from "node:crypto";
import { writeFile } from "node:fs/promises";
const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
await writeFile("thegodmods-release-private.pem", privateKey, { flag: "wx", mode: 0o600 });
await writeFile("thegodmods-release-public.pem", publicKey, { flag: "wx" });
```

Assign a stable key ID (for example, `thegodmods-2026-01`). The public key and key ID are pinned in a reviewed application release. The private key is never bundled, committed, uploaded to the package host, or entered in the renderer.

## 2. Prepare release metadata

Create a JSON file containing the package identity and publisher/licence declarations. These are the fields the signing utility reads:

```json
{
  "schemaVersion": 1,
  "id": "studio.god-visuals",
  "version": "1.0.0",
  "publisher": "THEGODMODS",
  "licenseId": "THEGODMODS-ORIGINAL",
  "redistributionAllowed": true,
  "downloadUrl": "https://YOUR-APPROVED-PACKAGE-HOST/releases/god-visuals-1.0.0.zip"
}
```

Replace the example URL only after the studio owns or controls the HTTPS host and has configured TLS, access controls, immutable versioned objects, monitoring and backups. Do not publish a release until the licence and asset provenance have been checked.

## 3. Sign the exact archive

After uploading the immutable archive to the approved host, run:

```sh
node tools/sign-package-release.mjs \
  --archive ./god-visuals-1.0.0.zip \
  --metadata ./god-visuals-1.0.0.metadata.json \
  --private-key /secure/offline/thegodmods-release-private.pem \
  --key-id thegodmods-2026-01 \
  --output ./god-visuals-1.0.0.release.json
```

The tool computes the exact archive size and SHA-256, creates the canonical Phase 2 release-signing payload, signs it with Ed25519, and writes the release record without overwriting an existing output file. Publish the resulting JSON beside the immutable archive. The release's download URL, metadata, size and digest are all covered by the signature.

## 4. Application trust provisioning

Before enabling remote downloads in a production build, a maintainer must:
1. Review the publisher identity, package-host ownership and redistribution rights.
2. Add the approved hostname and public key under the stable key ID to the application's reviewed trust policy.
3. Add tests using the real public key and a non-production fixture release.
4. Verify that the package manifest's licence and redistribution declarations agree with the signed release.
5. Run the Windows quality workflow and validate the full release on a clean test machine.

The app deliberately has no editable renderer-side trust settings. A user-provided public key is not an authoritative publisher trust root. The repository currently has no production package host or official THEGODMODS signing key, so remote package delivery stays disabled until these steps are completed. Do not replace this gate with a sample domain, generated test key, or unsigned mode.

## 5. Key rotation and incident response

For rotation, ship a reviewed application update that pins the new public key ID before signing packages with it. Keep the old public key pinned only for the explicitly supported migration window. If a private key is suspected compromised, stop publishing immediately, revoke its key ID in a reviewed app update, rotate the key on the offline workstation, and issue new signed releases. Never silently reuse a compromised key.
