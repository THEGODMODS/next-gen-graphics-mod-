import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Load first-party .mjs utilities with Node's native ESM loader.
 * Vitest's Vite transform must not rewrite these native Node modules.
 * Test paths are authored relative to the tests/ directory, while the
 * process working directory is the repository root in CI.
 */
export async function importNativeModule<T extends object>(relativePath: string): Promise<T> {
  const fromRepositoryRoot = relativePath.replace(/^\.\.\//, "");
  const url = pathToFileURL(resolve(process.cwd(), fromRepositoryRoot)).href;
  const nativeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<T>;
  return nativeImport(url);
}
