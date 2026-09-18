import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["shared-types"],
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons","radix-ui"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
