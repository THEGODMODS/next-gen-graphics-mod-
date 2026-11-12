import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";

export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(hash.digest("hex")));
  });
}

export async function verifySha256(filePath: string, expected: string): Promise<boolean> {
  if (!/^[a-fA-F0-9]{64}$/.test(expected)) return false;
  return (await sha256File(filePath)).toLowerCase() === expected.toLowerCase();
}
