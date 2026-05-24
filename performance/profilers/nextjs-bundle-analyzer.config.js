// Next.js bundle analyzer
// שימוש: ANALYZE=true npm run build
// הפלט נפתח אוטומטית כ-HTML treemap לכל target (client/server/edge).

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // הגבלת גודל בנדל - יישבר build אם חוצים
  experimental: {
    largePageDataBytes: 128 * 1024, // 128KB
    optimizePackageImports: [
      'lodash',
      'date-fns',
      'react-icons',
      '@radix-ui/react-icons',
    ],
  },

  // analyze headers בכל route ל-cache audit
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },

  // אופטימיזציות תמונה
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // webpack hooks לחילוץ stats.json
  webpack(config, { isServer, dev }) {
    if (!dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: isServer
            ? '../analyze/server-stats.json'
            : './analyze/client-stats.json',
        })
      );
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);

/*
מה לחפש ב-treemap:

1. moment.js (>200KB) -> החלף ל-date-fns
2. lodash מלא -> השתמש ב-lodash-es עם optimizePackageImports
3. polyfills גדולים -> הגדר browserslist
4. תמונות SVG inline -> העבר ל-<Image/>
5. בנדל client > 200KB gzip -> פצל עם dynamic import
6. בנדל גדול שמופיע בכל route -> העבר ל-_app בקפידה או טען ב-dynamic

ספי אזהרה (זרוק build):
- First Load JS per page > 300KB (gzip): hard fail
- Specific chunk > 250KB: warn
- Total client bundle > 1MB: hard fail
*/
