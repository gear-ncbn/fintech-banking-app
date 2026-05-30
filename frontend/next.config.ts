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
  async redirects() {
    return [
      // Resolve /profile at the routing layer so the authenticated layout
      // never renders a blank frame before the client-side redirect runs.
      // Note: this matches /profile exactly and leaves /profile/[id] intact.
      {
        source: '/profile',
        destination: '/settings',
        permanent: true,
      },
    ];
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
