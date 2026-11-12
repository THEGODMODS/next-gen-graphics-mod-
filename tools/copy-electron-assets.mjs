import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const destination = path.join(root, "dist-electron", "electron");
await mkdir(destination, { recursive: true });
await Promise.all(["dds-service.cjs", "pitch-workflow.cjs"].map(name => copyFile(path.join(root, "electron", name), path.join(destination, name))));
console.log("Copied Electron runtime service assets.");
