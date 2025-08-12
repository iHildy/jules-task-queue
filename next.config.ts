import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino"],
  // Allow for build and dev to be in different directories
  distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next/build",

  // Enable standalone output for Docker deployments
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // Allow for local development on ngrok
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],

  // Configure images
  images: {
    remotePatterns: [new URL("https://vercel.com/*")],
  },

  // Configure headers for security and CORS
  async headers() {
    return [];
  },
};

export default nextConfig;
