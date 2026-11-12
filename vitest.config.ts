import { defineConfig } from "vitest/config";

// Inline the native Node ESM utilities under tools/ into Vitest's SSR
// transform. This avoids the Windows worker's external-module loading path.
export default defineConfig({
  test: {
    pool: "forks",
    server: {
      deps: {
        inline: [/tools.*\.mjs$/]
      }
    }
  }
});
