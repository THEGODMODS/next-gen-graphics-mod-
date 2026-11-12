import { defineConfig } from "vitest/config";

// The DDS and pitch utilities are native Node ESM tools outside src/.
// Inline them into Vitest's SSR transform so Windows workers do not try to
// load them through the incompatible external-dependency path.
export default defineConfig({
  test: {
    pool: "forks",
    server: {
      deps: {
        inline: [/[/\\]tools[/\\].*\\.mjs$/]
      }
    }
  }
});
