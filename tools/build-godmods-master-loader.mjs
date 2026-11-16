#!/usr/bin/env node
/**
 * Build the single shared Sider 3.5 runtime for all first-party GODMODS products.
 * Department Lua sources stay in their content folders and are embedded here.
 * Each enabled.ini marker is checked for every callback; OFF never uninstalls files.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "content", "packs"));
const CORE_ID = "thegodmods.core-loader";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const luaLongString = value => {
  let equals = "";
  while (value.includes("]" + equals + "]")) equals += "=";
  return "[" + equals + "[" + value + "]" + equals + "]";
};
const luaQuote = value => JSON.stringify(value.replace(/\\/g, "/"));

const entries = await readdir(OUT, { withFileTypes: true });
const features = [];
for (const entry of entries.filter(item => item.isDirectory() && item.name !== CORE_ID).sort((a,b) => a.name.localeCompare(b.name))) {
  const packageRoot = path.join(OUT, entry.name);
  const manifest = JSON.parse(await readFile(path.join(packageRoot, "module.json"), "utf8"));
  if (!manifest.id || manifest.id === CORE_ID) continue;
  const luaEntry = manifest.files.find(item => item.target.toLowerCase().endsWith(".lua"));
  const activationEntry = manifest.files.find(item => item.target.toLowerCase().endsWith("/enabled.ini"));
  if (!luaEntry || !activationEntry) throw new Error("Package " + manifest.id + " is missing its Lua source or enabled.ini marker.");
  features.push({ id: manifest.id, name: manifest.name, config: activationEntry.target,
    source: await readFile(path.join(packageRoot, luaEntry.source), "utf8") });
}
if (features.length !== 18) throw new Error("Expected 18 department Lua features; found " + features.length + ".");

const featureLua = features.map(feature => [
  "  {",
  "    id = " + luaQuote(feature.id) + ",",
  "    name = " + luaQuote(feature.name) + ",",
  "    config = " + luaQuote(feature.config) + ",",
  "    source = " + luaLongString(feature.source),
  "  }"
].join("\n")).join(",\n");

const loader = [
  "-- THEGODMODS unified PES 2017 / Sider 3.5 runtime",
  "local M = {}",
  "local features = {",
  featureLua,
  "}",
  "",
  "local function config_exists(path)",
  "  local file = io.open(path, \"r\")",
  "  if not file then return false end",
  "  local enabled = false",
  "  for line in file:lines() do",
  "    local key, value = string.match(line, \"^%s*([%w_]+)%s*=%s*([01])%s*$\")",
  "    if key == \"enabled\" then enabled = value == \"1\" end",
  "  end",
  "  file:close()",
  "  return enabled",
  "end",
  "",
  "function M.init(ctx)",
  "  for _, feature in ipairs(features) do",
  "    local chunk, load_error = loadstring(feature.source, \"@\" .. feature.id)",
  "    if not chunk then",
  "      log(\"GODMODS: failed to compile \" .. feature.id .. \": \" .. tostring(load_error))",
  "    else",
  "      local ok, module = pcall(chunk)",
  "      if not ok or type(module) ~= \"table\" or type(module.init) ~= \"function\" then",
  "        log(\"GODMODS: invalid feature module \" .. feature.id .. \": \" .. tostring(module))",
  "      else",
  "        local feature_ctx = {",
  "          register = function(event_name, callback)",
  "            ctx.register(event_name, function(...)",
  "              if not config_exists(feature.config) then return nil end",
  "              return callback(...)",
  "            end)",
  "          end",
  "        }",
  "        local initialized, init_error = pcall(module.init, feature_ctx)",
  "        if not initialized then log(\"GODMODS: feature init failed \" .. feature.id .. \": \" .. tostring(init_error)) end",
  "      end",
  "    end",
  "  end",
  "  log(\"GODMODS master loader initialized\")",
  "end",
  "",
  "return M",
  ""
].join("\n");

const coreRoot = path.join(OUT, CORE_ID);
await rm(coreRoot, { recursive: true, force: true });
await mkdir(path.join(coreRoot, "payload"), { recursive: true });
const loaderBytes = Buffer.from(loader, "utf8");
await writeFile(path.join(coreRoot, "payload", "GODMODS_Loader.lua"), loaderBytes);
const manifest = {
  schemaVersion: 1, id: CORE_ID, name: "GODMODS Unified Sider Loader", version: "0.2.0",
  description: "Single Sider 3.5 runtime routing installed GODMODS department features with independent activation markers.",
  category: "other", deployment: { strategy: "lua", manualSteps: [] },
  game: { title: "PES 2017", executable: ["PES2017.exe", "PES2017patched.exe"], sider: ">=3.5.0 <4.0.0" },
  dependencies: [], conflicts: [], files: [],
  luaModules: [{ source: "payload/GODMODS_Loader.lua", moduleName: "GODMODS_Loader.lua", sha256: sha256(loaderBytes) }],
  license: { id: "THEGODMODS-ORIGINAL-1.0", redistributionAllowed: true }
};
await writeFile(path.join(coreRoot, "module.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(coreRoot, "README.md"), "# GODMODS Unified Loader\n\nOne Sider entry point for all first-party GODMODS products. Product activation is controlled by each installed enabled.ini marker.\n");
console.log("Built one GODMODS_Loader.lua routing " + features.length + " department features.");
