import { createHash, verify as verifySignature } from "node:crypto";
import { createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export type PackageSignature = { algorithm: "ed25519"; keyId: string; value: string };
export type RemotePackageRelease = {
  schemaVersion: 1;
  id: string;
  version: string;
  publisher: string;
  licenseId: string;
  redistributionAllowed: true;
  downloadUrl: string;
  archiveSize: number;
  archiveSha256: string;
  signature: PackageSignature;
};

export type PackageTrustPolicy = {
  allowedHosts: readonly string[];
  publicKeys: Readonly<Record<string, string>>;
  maxArchiveBytes?: number;
};

const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const digestPattern = /^[a-f0-9]{64}$/;
const signaturePattern = /^[A-Za-z0-9+/]+={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Stable bytes signed by the publisher's Ed25519 release key. */
export function releaseSigningPayload(release: Pick<RemotePackageRelease,
  "schemaVersion" | "id" | "version" | "publisher" | "licenseId" |
  "redistributionAllowed" | "downloadUrl" | "archiveSize" | "archiveSha256">): Buffer {
  return Buffer.from([
    "THEGODMODS-PACKAGE-RELEASE-V1",
    String(release.schemaVersion), release.id, release.version, release.publisher,
    release.licenseId, String(release.redistributionAllowed), release.downloadUrl,
    String(release.archiveSize), release.archiveSha256.toLowerCase()
  ].join("\n"), "utf8");
}

export function validateRemotePackageRelease(input: unknown, policy: PackageTrustPolicy): {
  valid: boolean; errors: string[]; release?: RemotePackageRelease;
} {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["Release record must be an object."] };
  const add = (condition: boolean, message: string) => { if (!condition) errors.push(message); };
  add(input.schemaVersion === 1, "schemaVersion must be 1.");
  add(typeof input.id === "string" && idPattern.test(input.id), "id must be a namespaced package ID.");
  add(typeof input.version === "string" && versionPattern.test(input.version), "version must be semantic major.minor.patch.");
  add(typeof input.publisher === "string" && input.publisher.trim().length >= 2 && input.publisher.length <= 120, "publisher is required.");
  add(typeof input.licenseId === "string" && input.licenseId.trim().length > 0 && input.licenseId.length <= 100, "licenseId is required.");
  add(input.redistributionAllowed === true, "Redistribution permission must be explicitly true.");
  add(typeof input.archiveSize === "number" && Number.isSafeInteger(input.archiveSize) && input.archiveSize > 0 &&
    input.archiveSize <= (policy.maxArchiveBytes ?? 512 * 1024 * 1024), "archiveSize is outside the permitted limit.");
  add(typeof input.archiveSha256 === "string" && digestPattern.test(input.archiveSha256), "archiveSha256 must be lowercase SHA-256 hex.");
  let parsedUrl: URL | null = null;
  if (typeof input.downloadUrl === "string") {
    try { parsedUrl = new URL(input.downloadUrl); } catch { /* reported below */ }
  }
  add(Boolean(parsedUrl && parsedUrl.protocol === "https:" && !parsedUrl.username && !parsedUrl.password &&
    !parsedUrl.hash && policy.allowedHosts.includes(parsedUrl.hostname.toLowerCase())),
    "downloadUrl must use HTTPS on an explicitly trusted host, without credentials or a fragment.");
  const signature = input.signature;
  add(isRecord(signature) && signature.algorithm === "ed25519" &&
    typeof signature.keyId === "string" && signature.keyId.length > 0 &&
    typeof signature.value === "string" && signaturePattern.test(signature.value),
    "signature must contain an Ed25519 keyId and base64 value.");
  if (errors.length) return { valid: false, errors };
  const release = input as unknown as RemotePackageRelease;
  const publicKey = policy.publicKeys[release.signature.keyId];
  if (!publicKey) return { valid: false, errors: ["Signing key is not trusted by this application."] };
  try {
    const validSignature = verifySignature(null, releaseSigningPayload(release), publicKey, Buffer.from(release.signature.value, "base64"));
    if (!validSignature) return { valid: false, errors: ["Release signature verification failed."] };
  } catch {
    return { valid: false, errors: ["Trusted signing key is invalid or signature verification failed."] };
  }
  return { valid: true, errors: [], release };
}

/**
 * Downloads only a validated, signed release. Redirects are rejected to prevent
 * a trusted publisher URL from silently forwarding to an untrusted host.
 */
export async function downloadVerifiedPackage(
  input: unknown,
  destinationDirectory: string,
  policy: PackageTrustPolicy,
  fetcher: typeof fetch = fetch
): Promise<{ filePath: string; bytes: number; sha256: string }> {
  const validation = validateRemotePackageRelease(input, policy);
  if (!validation.valid || !validation.release) throw new Error(validation.errors.join(" "));
  const release = validation.release;
  const directory = path.resolve(destinationDirectory);
  await fs.mkdir(directory, { recursive: true });
  const realDirectory = await fs.realpath(directory);
  const fileName = release.id.replace(/[^a-z0-9.-]/g, "_") + "-" + release.version.replace(/[^a-zA-Z0-9.+-]/g, "_") + ".zip";
  const finalPath = path.join(realDirectory, fileName);
  const temporaryPath = finalPath + ".part";
  try {
    await fs.lstat(finalPath);
    throw new Error("This exact package version is already downloaded.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await fs.rm(temporaryPath, { force: true });
  try {
    const response = await fetcher(release.downloadUrl, { method: "GET", redirect: "manual", headers: { "accept": "application/zip, application/octet-stream" } });
    if (response.status !== 200 || !response.body) throw new Error("Package host did not return a complete HTTP 200 download.");
    if (response.headers.get("location")) throw new Error("Package redirects are not permitted.");
    const declaredLength = response.headers.get("content-length");
    if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) !== release.archiveSize)) {
      throw new Error("Package Content-Length does not match the signed release size.");
    }
    const hash = createHash("sha256");
    let bytes = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length;
        if (bytes > release.archiveSize || bytes > (policy.maxArchiveBytes ?? 512 * 1024 * 1024)) {
          callback(new Error("Package download exceeded its signed or configured size limit."));
          return;
        }
        hash.update(chunk);
        callback(null, chunk);
      }
    });
    await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream), meter, createWriteStream(temporaryPath, { flags: "wx" }));
    if (bytes !== release.archiveSize) throw new Error("Downloaded package size does not match the signed release.");
    const actualHash = hash.digest("hex");
    if (actualHash !== release.archiveSha256) throw new Error("Downloaded package SHA-256 does not match the signed release.");
    await fs.link(temporaryPath, finalPath);
    await fs.rm(temporaryPath, { force: true });
    return { filePath: finalPath, bytes, sha256: actualHash };
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}
