import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({



  oxc: {
    decorator: { legacy: true, emitDecoratorMetadata: true },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@image-everything/contracts": path.resolve(
        __dirname,
        "../packages/image-contracts/src/index.ts",
      ),
      zod: path.resolve(__dirname, "./node_modules/zod/index.js"),
    },
  },
});
