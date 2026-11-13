#!/usr/bin/env node
import { createHash, sign } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf("--" + name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const archivePath = argument("archive");
const metadataPath = argument("metadata");
const privateKeyPath = argument("private-key");
const keyId = argument("key-id");
const outputPath = argument("output");
if (!archivePath || !metadataPath || !privateKeyPath || !keyId || !outputPath) {
  console.error("Usage: node tools/sign-package-release.mjs --archive <zip> --metadata <json> --private-key <offline-private.pem> --key-id <pinned-key-id> --output <release.json>");
  process.exitCode = 2;
} else {
  try {
    const archive = await readFile(archivePath);
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const requiredStrings = ["id", "version", "publisher", "licenseId", "downloadUrl"];
    for (const field of requiredStrings) {
      if (typeof metadata[field] !== "string" || !metadata[field].trim()) throw new Error(field + " is required.");
    }
    if (metadata.schemaVersion !== 1) throw new Error("schemaVersion must be 1.");
    if (metadata.redistributionAllowed !== true) throw new Error("redistributionAllowed must be explicitly true.");
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(metadata.id)) throw new Error("id must be a namespaced package ID.");
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(metadata.version)) throw new Error("version must be semantic major.minor.patch.");
    const url = new URL(metadata.downloadUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("downloadUrl must be HTTPS without credentials or a fragment.");
    const release = {
      schemaVersion: 1,
      id: metadata.id,
      version: metadata.version,
      publisher: metadata.publisher,
      licenseId: metadata.licenseId,
      redistributionAllowed: true,
      downloadUrl: metadata.downloadUrl,
      archiveSize: archive.length,
      archiveSha256: createHash("sha256").update(archive).digest("hex"),
    };
    const payload = Buffer.from([
      "THEGODMODS-PACKAGE-RELEASE-V1",
      String(release.schemaVersion), release.id, release.version, release.publisher,
      release.licenseId, String(release.redistributionAllowed), release.downloadUrl,
      String(release.archiveSize), release.archiveSha256
    ].join("\n"), "utf8");
    const privateKey = await readFile(privateKeyPath, "utf8");
    const signature = sign(null, payload, privateKey).toString("base64");
    const signed = { ...release, signature: { algorithm: "ed25519", keyId, value: signature } };
    await writeFile(outputPath, JSON.stringify(signed, null, 2) + "\n", { flag: "wx" });
    console.log("Signed release metadata written:", path.resolve(outputPath));
    console.log("Archive SHA-256:", release.archiveSha256);
    console.log("Keep the private signing key offline. Never commit or distribute it.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
