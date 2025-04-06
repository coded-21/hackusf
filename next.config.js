/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure server-only runtime for specific API routes
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
    skipNodeVersionCheck: true,
    missingSuspenseWithCSRBailout: false,
  },
  // Increase API body size limit for file uploads (default is 4mb)
  api: {
    responseLimit: '16mb',
    bodyParser: {
      sizeLimit: '16mb',
    },
  },
};

module.exports = nextConfig; 