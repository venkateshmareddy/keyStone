import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { randomUUID } from "node:crypto";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NETLIFY_COMMIT_REF ??
  process.env.GITHUB_SHA ??
  randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

// Netlify’s Next adapter expects `output: "standalone"`. Vercel uses its own bundling.
const isNetlifyBuild = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  ...(isNetlifyBuild ? { output: "standalone" as const } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
};

export default withSerwist(nextConfig);
