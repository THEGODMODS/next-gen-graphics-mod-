import { afterEach, describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { downloadVerifiedPackage, releaseSigningPayload, validateRemotePackageRelease, type RemotePackageRelease } from "../src/main/module-engine/package-delivery";

const keys = generateKeyPairSync("ed25519");
const payload = Buffer.from("trusted PES package archive fixture");
const policy = { allowedHosts: ["packages.thegodmods.com"], publicKeys: { "test-release": keys.publicKey.export({ type: "spki", format: "pem" }).toString() }, maxArchiveBytes: 1024 * 1024 };
function signedRelease(overrides: Partial<RemotePackageRelease> = {}): RemotePackageRelease {
  const unsigned = {
    schemaVersion: 1 as const, id: "studio.god-visuals", version: "1.0.0",
    publisher: "THEGODMODS", licenseId: "THEGODMODS-ORIGINAL", redistributionAllowed: true as const,
    downloadUrl: "https://packages.thegodmods.com/releases/god-visuals-1.0.0.zip",
    archiveSize: payload.length, archiveSha256: requireHash(payload),
    signature: { algorithm: "ed25519" as const, keyId: "test-release", value: "" }, ...overrides
  };
  const signature = sign(null, releaseSigningPayload(unsigned), keys.privateKey).toString("base64");
  return { ...unsigned, signature: { ...unsigned.signature, value: signature } };
}
function requireHash(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true }))); });

describe("trusted remote package delivery", () => {
  it("accepts a correctly signed release with explicit redistribution rights", () => {
    expect(validateRemotePackageRelease(signedRelease(), policy).valid).toBe(true);
  });
  it("rejects unknown hosts, missing permission, unknown keys and altered metadata", () => {
    const release = signedRelease();
    expect(validateRemotePackageRelease({ ...release, downloadUrl: "https://evil.example/payload.zip" }, policy).valid).toBe(false);
    expect(validateRemotePackageRelease({ ...release, redistributionAllowed: false }, policy).valid).toBe(false);
    expect(validateRemotePackageRelease({ ...release, signature: { ...release.signature, keyId: "unknown" } }, policy).valid).toBe(false);
    expect(validateRemotePackageRelease({ ...release, publisher: "Impersonator" }, policy).valid).toBe(false);
  });
  it("downloads to an isolated file and verifies signed size and SHA-256", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nextgen-delivery-"));
    directories.push(directory);
    const release = signedRelease();
    const fetcher: typeof fetch = async () => new Response(payload, { status: 200, headers: { "content-length": String(payload.length) } });
    const result = await downloadVerifiedPackage(release, directory, policy, fetcher);
    expect(result.bytes).toBe(payload.length);
    expect(await fs.readFile(result.filePath)).toEqual(payload);
  });
  it("rejects redirects, truncated bodies and corrupt bytes without leaving partial files", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nextgen-delivery-"));
    directories.push(directory);
    const release = signedRelease();
    const redirect: typeof fetch = async () => new Response(null, { status: 302, headers: { location: "https://evil.example/file.zip" } });
    await expect(downloadVerifiedPackage(release, directory, policy, redirect)).rejects.toThrow(/HTTP 200/);
    const corrupt: typeof fetch = async () => new Response(Buffer.from("tampered"), { status: 200 });
    await expect(downloadVerifiedPackage(release, directory, policy, corrupt)).rejects.toThrow();
    expect((await fs.readdir(directory)).filter(name => name.endsWith(".part") || name.endsWith(".zip"))).toEqual([]);
  });
});
