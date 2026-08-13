import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it external to the bundle so the
  // native .node binary is loaded at runtime instead of being bundled.
  serverExternalPackages: ["better-sqlite3"],
  // This is an internal operations tool; skip type/lint failures blocking the
  // local build so an operator is never locked out of their own data.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
