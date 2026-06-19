import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile react-pdf for ESM compatibility in Next.js 15/16
  transpilePackages: ["react-pdf"],
  
  // @ts-ignore - allowedDevOrigins is a top-level configuration key in Next.js 15+ dev server
  allowedDevOrigins: ["*.trycloudflare.com", "localhost:3000"],

  // Hide the Next.js development server N logo
  devIndicators: {
    appIsrStatus: false,
    buildActivityPosition: 'bottom-right',
    buildActivity: false,
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
      bodySizeLimit: "20mb",
    },
    proxyClientMaxBodySize: "20mb",
    // Safe optimizations to keep the dev server stable and fast
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@tiptap/react",
      "date-fns",
      "swr",
      "zod",
      "react-pdf",
      "pdfjs-dist",
    ],
  },
  // High-performance external packages (bcrypt is natively compiled)
  serverExternalPackages: ["bcrypt"],
  // Essential webpack configuration for pdfjs-dist and ESM libraries
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
  // Enable Turbopack support while keeping webpack for compatibility
  turbopack: {},
  // Memory optimization for dev server
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
