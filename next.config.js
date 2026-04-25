/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  swcMinify: true,
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;
