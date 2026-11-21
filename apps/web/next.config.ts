import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Share the monorepo root `.env` without overriding apps/web/.env* or process env.
const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: [
    "@moonwitness/addon-runtime",
    "@moonwitness/addons",
    "@moonwitness/canon",
    "@moonwitness/contracts",
    "@moonwitness/ui",
    "@moonwitness/core",
    "@moonwitness/orm",
    "@moonwitness/assets",
    "@moonwitness/avatars",
    "@tanstack/react-query",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 960, 1440, 1920],
    imageSizes: [240, 480],
    minimumCacheTTL: 31_536_000,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://id.moonwitness.biz.id https://moonwitness.biz.id https://api.moonwitness.biz.id https://codex.a-l-l-a-h.com https://community.moonwitness.biz.id https://moonwitness-radio.bjo163.workers.dev https://igate.moonwitness.biz.id https://cloudflareinsights.com",
              "worker-src 'self' blob:",
              "base-uri 'self'",
              "form-action 'self' https://id.moonwitness.biz.id",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
