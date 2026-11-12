import path from "node:path";

/**
 * Accepts package-relative or managed-root-relative paths only.
 * Returned paths always use POSIX separators for stable manifests.
 */
export function normalizeSafeRelativePath(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error("Path must be a non-empty string.");
  }
  if (input.includes("\\0")) throw new Error("Path contains a null byte.");
  if (input.includes("\\\\")) throw new Error("Use forward slashes in module paths.");
  if (input.startsWith("/") || /^[a-zA-Z]:/.test(input) || input.startsWith("//")) {
    throw new Error("Absolute paths are not allowed.");
  }
  if (input.includes(":")) throw new Error("Alternate data streams are not allowed.");

  const segments = input.split("/");
  if (segments.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Path contains an empty, dot, or parent-traversal segment.");
  }

  const normalized = path.posix.normalize(input);
  if (normalized !== input || normalized === "." || normalized.startsWith("../")) {
    throw new Error("Path is not a canonical relative path.");
  }
  return normalized;
}

export function resolveInsideRoot(root: string, relativePath: string): string {
  const safe = normalizeSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, ...safe.split("/"));
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Target path escapes or aliases the managed root.");
  }
  return resolvedTarget;
}
