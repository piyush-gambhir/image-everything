import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@image-everything/contracts"],
  turbopack: {
    resolveAlias: {
      // The contracts package is authored in TypeScript but deliberately emits
      // CommonJS for the Node gateway. Resolve the web bundle to that emitted
      // entrypoint so Turbopack does not interpret ESM source through the
      // package's CommonJS boundary.
      "@image-everything/contracts":
        "../packages/image-contracts/dist/index.js",
    },
  },
  serverExternalPackages: ["sharp", "heic-decode"],
  experimental: {
    optimizePackageImports: ["@/hooks", "@/utils", "lucide-react"],
  },
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleAnalyzer(nextConfig)
