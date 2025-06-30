import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow for build and dev to be in different directories
  distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next/build",

  // Enable standalone output for Docker deployments
  output: "standalone",
  // Configure headers for security and CORS
  async headers() {
    return [
      {
        source: "/api/webhooks/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, X-GitHub-Delivery, X-GitHub-Event, X-GitHub-Signature-256",
          },
        ],
      },
    ];
  },

  // Webpack configuration for better builds
  webpack: (config) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");
    return config;
  },

  // Enable source maps in production for better debugging
  productionBrowserSourceMaps: true,

  // Optimize images
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
};

export default nextConfig;
