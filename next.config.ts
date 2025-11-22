import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disable dev indicators
  devIndicators: false,
  // Allow cross-origin requests from localhost and 127.0.0.1 in development only
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  }),
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {},
  // Suppress console warnings in production builds
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Remove console.log/warn in production client bundle
        config.optimization = {
          ...config.optimization,
          minimize: true,
        };
      }
      return config;
    },
  }),
};

export default nextConfig;
