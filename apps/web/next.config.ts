import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const helpersDir = path.dirname(
  require.resolve("@swc/helpers/package.json", {
    paths: [path.dirname(require.resolve("next/package.json"))],
  }),
);

// Next 16 imports `@swc/helpers/_/*`. Those exports use a `module-sync` condition
// that Turbopack does not resolve. The plain `cjs/*` files are exported without conditions.
const swcAlias: Record<string, string> = {};
for (const file of readdirSync(path.join(helpersDir, "cjs"))) {
  if (!file.endsWith(".cjs")) continue;
  swcAlias[`@swc/helpers/_/${file.slice(0, -4)}`] = `@swc/helpers/cjs/${file}`;
}

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["shared-types"],
  turbopack: {
    resolveAlias: swcAlias,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons","radix-ui"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
