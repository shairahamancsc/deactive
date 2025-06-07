
import type {NextConfig} from 'next';

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
  // staticPageGenerationTimeout: 120, // Increased timeout (default is 60s) - Vercel might override this
};

export default nextConfig;
