import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Unit tests for the pure canvas/geometry layer. Scoped to src/**/*.test.ts so
// the Playwright spec under e2e/ is never collected here (Playwright owns that).
export default defineConfig({
  resolve: {
    alias: { "@": path.join(root, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
