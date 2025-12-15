const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  // eslint config moved - use .eslintrc or next lint CLI options
  // Turbopack is now default in Next.js 16
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname),
    },
  },
  // Keep webpack config for backward compatibility when using --webpack flag
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  // Force fresh build
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  // Explicitly set the workspace root to resolve lockfile warning
  outputFileTracingRoot: path.resolve(__dirname),
}

module.exports = nextConfig;
