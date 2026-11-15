import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@image-everything/contracts"],
  turbopack: {
    resolveAlias: {
      "@image-everything/contracts":
        "../packages/image-contracts/dist/index.js",
    },
  },
  serverExternalPackages: ["sharp", "heic-decode"],
  experimental: {
    agentUpgrade: "security",
    optimizePackageImports: ["@/hooks", "@/utils", "lucide-react"],
  },
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleAnalyzer(nextConfig)
