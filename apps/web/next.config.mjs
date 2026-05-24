/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: [
    "@aneh/ui",
    "@aneh/api",
    "@aneh/db",
    "@aneh/auth",
    "@aneh/utils",
  ],
  i18n: undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
