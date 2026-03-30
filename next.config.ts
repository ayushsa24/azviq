import type { NextConfig } from "next";

const tunnelDomain = process.env.CLOUDFLARE_TUNNEL_URL
  ? process.env.CLOUDFLARE_TUNNEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")
  : null;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: Array.from(new Set([tunnelDomain, "localhost:3000"].filter(Boolean) as string[])),
    },
  },
};

export default nextConfig;
