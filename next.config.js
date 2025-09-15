/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // IMPORTANT: no host-canonical redirects here
    return [];
  },
};

module.exports = nextConfig;
