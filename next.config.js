/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure server-only runtime for specific API routes
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  // Add the API configuration as middleware
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        // Apply custom config to API routes
        has: [
          {
            type: 'header',
            key: 'x-allow-large-payload',
            value: 'true',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 