#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const luaparse = require("luaparse");
const root = path.resolve("content", "packs");
const entries = await readdir(root, { withFileTypes: true });
const files = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const payload = path.join(root, entry.name, "payload");
  let names;
  try { names = await readdir(payload); } catch { continue; }
  for (const name of names) {
    if (name.endsWith(".lua")) files.push(path.join(payload, name));
  }
}

if (files.length !== 14) {
  throw new Error(`Expected 14 generated Lua modules, found ${files.length}`);
}

const failures = [];
for (const file of files.sort()) {
  try {
    const source = await readFile(file, "utf8");
    luaparse.parse(source, { luaVersion: "5.1", scope: true, comments: false });
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Lua 5.1 syntax validation passed for all ${files.length} generated Sider modules.`);
}
