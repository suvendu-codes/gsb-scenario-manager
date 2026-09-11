import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["shared-types"],
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
