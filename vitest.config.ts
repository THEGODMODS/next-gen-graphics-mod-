import { defineConfig } from "vitest/config";

// Keep Vitest's runner isolated from Node-native .mjs utilities. Tests load
// those utilities through tests/helpers/native-esm.ts using Node's ESM loader.
export default defineConfig({
  test: {
    pool: "forks"
  }
});
