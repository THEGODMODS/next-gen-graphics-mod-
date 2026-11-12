import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const destination = path.join(root, "dist-electron", "electron");
await mkdir(destination, { recursive: true });
await Promise.all(["dds-service.cjs", "pitch-workflow.cjs"].map(name => copyFile(path.join(root, "electron", name), path.join(destination, name))));
const toolDestination = path.join(root, "dist-electron", "tools");
await mkdir(toolDestination, { recursive: true });
await Promise.all(["sider-pitch-log.cjs", "sider-pitch-log.mjs"].map(name =>
  copyFile(path.join(root, "tools", name), path.join(toolDestination, name))
));
console.log("Copied Electron runtime services and pitch-log analyzer assets.");