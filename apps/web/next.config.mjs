/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@repo/ui', 'lucide-react'],
  },
  transpilePackages: ['@repo/ui', '@repo/api', '@repo/auth', '@repo/db', '@repo/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
