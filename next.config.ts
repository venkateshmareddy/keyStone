import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by @netlify/plugin-nextjs v5 (expects `.next/standalone` after build)
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Standalone must ship Prisma engines anywhere the client runs (API + not only /api).
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
};

export default nextConfig;
