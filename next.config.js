/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
  productionBrowserSourceMaps: false,
  skipTracing: true,
};

module.exports = nextConfig;
