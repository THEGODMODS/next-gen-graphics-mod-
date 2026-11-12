import { defineConfig } from "vitest/config";

// These utilities are first-party ESM files, not installed dependencies.
// Inline the complete module graph so Vitest's runner, rather than the
// Windows worker's external-module loader, evaluates them.
export default defineConfig({
  test: {
    pool: "forks",
    server: {
      deps: {
        inline: true
      }
    }
  }
});
