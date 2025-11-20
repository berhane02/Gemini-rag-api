import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow cross-origin requests from 127.0.0.1 in development
  allowedDevOrigins: ['http://127.0.0.1:3000'],
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {},
  // Rewrite /auth/* to /api/auth/* for Auth0 client SDK compatibility
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
