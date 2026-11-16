import { defineConfig } from "vitest/config";

// Let Node load native .mjs modules directly instead of sending them through Vite's VM.
export default defineConfig({
  test: {
    pool: "forks",
    testTimeout: 30000,
    server: {
      deps: {
        external: [/\.mjs$/]
      }
    }
  }
});
