const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

module.exports = nextConfig;
