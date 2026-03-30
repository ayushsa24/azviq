import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.CLOUDFLARE_TUNNEL_URL || "localhost:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
