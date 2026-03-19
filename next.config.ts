import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "ccxt"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
