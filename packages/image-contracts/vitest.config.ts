import path from "node:path";

import { defineConfig } from "vitest/config";

const dependencyFallback =
  process.env.IMAGE_EVERYTHING_TEST_DEPENDENCY_FALLBACK === "1";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: dependencyFallback
      ? { zod: path.resolve(__dirname, "../../backend/node_modules/zod") }
      : {},
  },
});
