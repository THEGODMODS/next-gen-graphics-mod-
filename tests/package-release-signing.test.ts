import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { validateRemotePackageRelease } from "../src/main/module-engine/package-delivery";

describe("offline package release signing utility", () => {
  it("creates a verifiable release record from the exact archive bytes", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nextgen-signing-"));
    try {
      const archivePath = path.join(directory, "fixture.zip");
      const metadataPath = path.join(directory, "metadata.json");
      const privateKeyPath = path.join(directory, "private.pem");
      const outputPath = path.join(directory, "release.json");
      const archive = Buffer.from("release signing fixture");
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      await fs.writeFile(archivePath, archive);
      await fs.writeFile(privateKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }));
      await fs.writeFile(metadataPath, JSON.stringify({
        schemaVersion: 1, id: "studio.fixture-pack", version: "1.2.3",
        publisher: "THEGODMODS", licenseId: "TEST-LICENSE",
        redistributionAllowed: true,
        downloadUrl: "https://packages.thegodmods.com/fixture.zip"
      }));
      const result = spawnSync(process.execPath, [
        "tools/sign-package-release.mjs", "--archive", archivePath,
        "--metadata", metadataPath, "--private-key", privateKeyPath,
        "--key-id", "fixture-key", "--output", outputPath
      ], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      const release = JSON.parse(await fs.readFile(outputPath, "utf8"));
      const policy = {
        allowedHosts: ["packages.thegodmods.com"],
        publicKeys: { "fixture-key": publicKey.export({ type: "spki", format: "pem" }).toString() }
      };
      expect(validateRemotePackageRelease(release, policy).valid).toBe(true);
      expect(release.archiveSize).toBe(archive.length);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
