import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // ESLint errors will now fail the build - enforcing code quality
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript errors will fail the build - enforcing type safety
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    // Suppress specific type checking issues during build
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
