import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const destination = path.join(root, "dist-electron", "electron");
await mkdir(destination, { recursive: true });
await copyFile(path.join(root, "electron", "dds-service.cjs"), path.join(destination, "dds-service.cjs"));
console.log("Copied Electron DDS service runtime asset.");
