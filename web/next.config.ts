import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable smaller runtime image via .next/standalone output
  output: 'standalone',

  // Bundle optimization
  experimental: {
    // Automatically optimize imports from these packages for better tree-shaking
    optimizePackageImports: ['@/hooks', '@/utils'],
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
