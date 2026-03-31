import type { NextConfig } from "next";

// Netlify’s Next adapter expects `output: "standalone"`. Vercel uses its own bundling;
// forcing standalone there is unnecessary and can cause subtle issues, so only enable on Netlify CI.
const isNetlifyBuild = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  ...(isNetlifyBuild ? { output: "standalone" as const } : {}),
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
