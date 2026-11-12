import type {
  ManifestValidation,
  ModuleCategory,
  ModuleManifest,
} from "../../shared/module-types";
import { normalizeSafeRelativePath } from "./path-safety";

const categories = new Set<ModuleCategory>([
  "graphics", "stadiums", "kits", "players", "gameplay",
  "audio", "scoreboards", "tifos", "patches", "other",
]);
const moduleIdPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
const semverPattern = /^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-fA-F0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateModuleManifest(input: unknown): ManifestValidation {
  const errors: string[] = [];
  if (!isRecord(input)) return { valid: false, errors: ["Manifest root must be an object."] };

  const add = (condition: boolean, message: string) => { if (!condition) errors.push(message); };
  add(input.schemaVersion === 1, "schemaVersion must be 1.");
  add(typeof input.id === "string" && moduleIdPattern.test(input.id), "id must be lowercase and namespaced (for example, studio.pitch-pack).");
  add(typeof input.name === "string" && input.name.trim().length > 0, "name is required.");
  add(typeof input.version === "string" && semverPattern.test(input.version), "version must be a valid major.minor.patch version.");
  add(typeof input.description === "string", "description must be a string.");
  add(typeof input.category === "string" && categories.has(input.category as ModuleCategory), "category is not supported.");

  const game = input.game;
  add(isRecord(game), "game must be an object.");
  if (isRecord(game)) {
    add(game.title === "PES 2017", "game.title must be PES 2017.");
    add(Array.isArray(game.executable) && game.executable.length > 0 &&
      game.executable.every((v) => typeof v === "string" && /^[a-zA-Z0-9_.-]+\\.exe$/i.test(v)),
      "game.executable must contain executable filenames only.");
    add(typeof game.sider === "string" && game.sider.trim().length > 0, "game.sider version range is required.");
  }

  for (const field of ["dependencies", "conflicts"] as const) {
    const value = input[field];
    add(Array.isArray(value) && value.every((v) => typeof v === "string" && moduleIdPattern.test(v)),
      field + " must be an array of namespaced module IDs.");
  }

  const seenTargets = new Set<string>();
  add(Array.isArray(input.files) && input.files.length > 0, "files must contain at least one payload mapping.");
  if (Array.isArray(input.files)) {
    input.files.forEach((entry, index) => {
      if (!isRecord(entry)) { errors.push(`files[${index}] must be an object.`); return; }
      try { normalizeSafeRelativePath(entry.source); } catch (error) {
        errors.push(`files[${index}].source: ${(error as Error).message}`);
      }
      try {
        const target = normalizeSafeRelativePath(entry.target);
        if (seenTargets.has(target.toLowerCase())) errors.push(`Duplicate target: ${target}`);
        seenTargets.add(target.toLowerCase());
      } catch (error) {
        errors.push(`files[${index}].target: ${(error as Error).message}`);
      }
      add(typeof entry.sha256 === "string" && sha256Pattern.test(entry.sha256),
        `files[${index}].sha256 must be a 64-character SHA-256 hex digest.`);
    });
  }

  add(Array.isArray(input.luaModules), "luaModules must be an array.");
  if (Array.isArray(input.luaModules)) {
    input.luaModules.forEach((entry, index) => {
      if (!isRecord(entry)) { errors.push(`luaModules[${index}] must be an object.`); return; }
      try { normalizeSafeRelativePath(entry.source); } catch (error) {
        errors.push(`luaModules[${index}].source: ${(error as Error).message}`);
      }
      add(typeof entry.moduleName === "string" && /^[a-zA-Z0-9_.-]+$/.test(entry.moduleName),
        `luaModules[${index}].moduleName is invalid.`);
    });
  }

  add(isRecord(input.license), "license metadata is required.");
  if (isRecord(input.license)) {
    add(typeof input.license.id === "string" && input.license.id.trim().length > 0, "license.id is required.");
    add(typeof input.license.redistributionAllowed === "boolean", "license.redistributionAllowed must be boolean.");
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true, errors, manifest: input as unknown as ModuleManifest };
}

export function parseModuleManifest(json: string): ManifestValidation {
  let parsed: unknown;
  try { parsed = JSON.parse(json) as unknown; }
  catch { return { valid: false, errors: ["module.json is not valid JSON."] }; }
  return validateModuleManifest(parsed);
}
