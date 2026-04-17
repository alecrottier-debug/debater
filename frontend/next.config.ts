import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake lucide-react per-icon so we don't ship the whole pack.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
