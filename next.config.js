const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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
}

module.exports = nextConfig;
