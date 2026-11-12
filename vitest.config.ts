import { defineConfig } from "vitest/config";

// Load first-party Node ESM tools with Node's native loader instead of Vite's VM.
export default defineConfig({
  test: {
    pool: "forks",
    server: {
      deps: {
        external: [/\\.mjs$/]
      }
    }
  }
});
