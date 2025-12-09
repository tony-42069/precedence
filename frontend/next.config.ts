import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use basePath in production (Vercel), not in local dev
  basePath: process.env.NODE_ENV === 'production' ? '/app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/app' : '',
  
  // Fix for pino/thread-stream issues with @reown/appkit wallet packages
  // These need to be external to prevent bundling issues
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
  ],
};

export default nextConfig;
