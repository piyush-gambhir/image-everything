import path from "node:path";

import { defineConfig } from "vitest/config";

const dependencyFallback =
  process.env.IMAGE_EVERYTHING_TEST_DEPENDENCY_FALLBACK === "1";

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
      ...(dependencyFallback
        ? {
            zod: path.resolve(__dirname, "../../backend/node_modules/zod"),
            sharp: path.resolve(__dirname, "../../backend/node_modules/sharp"),
            exifr: path.resolve(__dirname, "../../backend/node_modules/exifr"),
            "heic-decode": path.resolve(
              __dirname,
              "../../backend/node_modules/heic-decode",
            ),
            archiver: path.resolve(
              __dirname,
              "../../backend/node_modules/archiver",
            ),
          }
        : {}),
    },
  },
});
