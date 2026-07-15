import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint is run explicitly in CI via `npm run lint`; do not fail the
    // production build on lint so deploys stay unblocked.
    ignoreDuringBuilds: false,
  },
  images: {
    // Uploaded media is served through our own signed-URL route handlers,
    // never optimized by Next's loader, so remote patterns stay closed.
    remotePatterns: [],
  },
};

export default nextConfig;

// Enable Cloudflare bindings (D1, R2, KV) during `next dev` via OpenNext.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
