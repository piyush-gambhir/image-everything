import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    singleFork: true,
  },
  resolve: {
    alias: {
      "@image-everything/contracts": path.resolve(
        __dirname,
        "../../packages/image-contracts/src/index.ts",
      ),
    },
  },
});
