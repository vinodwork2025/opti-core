/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@opti-core/shared',
    '@opti-core/ai',
    '@opti-core/crawler',
    '@opti-core/parser',
    '@opti-core/rules',
  ],
};

module.exports = nextConfig;
