
import type { NextConfig } from 'next';
import type { Configuration as WebpackConfiguration } from 'webpack';

const BLOB_HOSTNAME = process.env.BLOB_HOSTNAME || 'blob.vercel-storage.com';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: BLOB_HOSTNAME, 
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (
    config: WebpackConfiguration,
    { isServer }
  ): WebpackConfiguration => {
    if (isServer) {
      // If @opentelemetry/exporter-jaeger is not found, mark it as external.
      // This prevents the build from failing if it's an optional dependency.
      if (!Array.isArray(config.externals)) {
        config.externals = [];
      }
      config.externals.push('@opentelemetry/exporter-jaeger');
    }
    return config;
  },
};

export default nextConfig;
