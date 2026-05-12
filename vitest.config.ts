import { defineConfig } from "vite";
import { resolve } from "path";

// Vitest picks up this config automatically — `test` key is vitest-specific.
// Using vite's defineConfig keeps this compatible without importing vitest/config.
export default defineConfig({
  // @ts-expect-error — vitest adds `test` key not present in vite's types
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "playwright-tests"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**"],
      exclude: ["src/lib/env.ts", "src/integrations/**"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
