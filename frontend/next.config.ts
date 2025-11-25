import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use basePath in production (Vercel), not in local dev
  basePath: process.env.NODE_ENV === 'production' ? '/app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/app' : '',
};

export default nextConfig;
