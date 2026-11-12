import { defineConfig } from "vitest/config";

// Let Node load native .mjs modules directly instead of sending them through Vite's VM.
export default defineConfig({
  test: {
    pool: "forks",
    server: {
      deps: {
        external: [/\.mjs$/]
      }
    }
  }
});
