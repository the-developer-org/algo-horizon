const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Skips ESLint errors in production
  },
}

module.exports = nextConfig;
