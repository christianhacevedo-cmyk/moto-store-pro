/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: false,
  productionBrowserSourceMaps: false,
  // Disable build traces which is causing stack overflow
  experimental: {
    optimizePackageImports: ['lodash'],
  },
};

module.exports = nextConfig;
