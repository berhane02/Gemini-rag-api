import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disable dev indicators
  devIndicators: false,
  // Set output file tracing root to fix multiple lockfiles warning
  outputFileTracingRoot: require('path').join(__dirname),
  // Allow cross-origin requests from localhost and 127.0.0.1 in development only
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  }),
  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  turbopack: {},
  // Suppress console logs in production builds
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config, { isServer, webpack }) => {
      if (!isServer) {
        // Remove console statements from client-side code in production
        config.plugins = config.plugins || [];
        config.plugins.push(
          new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
          })
        );
        
        // Configure Terser to remove console statements
        if (config.optimization?.minimizer) {
          config.optimization.minimizer.forEach((minimizer: any) => {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options.terserOptions = {
                ...minimizer.options.terserOptions,
                compress: {
                  ...minimizer.options.terserOptions?.compress,
                  drop_console: true, // Remove all console statements
                },
              };
            }
          });
        }
      } else {
        // Server-side: Ensure Clerk chunks are properly resolved
        config.resolve = config.resolve || {};
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
        };
      }
      return config;
    },
  }),
};

export default nextConfig;
