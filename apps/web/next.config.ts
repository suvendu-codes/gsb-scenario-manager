import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["shared-types"],
};

export default nextConfig;
