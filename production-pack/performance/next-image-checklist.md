# next/image checklist

Every image rendered through `<Image>` should pass this list before merging.

- [ ] `src` is a remote URL on an allowed host (declared in `next.config.images.remotePatterns`).
- [ ] Width and height are **explicit** (or `fill` + parent has `position: relative`).
- [ ] `alt` is meaningful Hebrew text for accessibility — never empty unless decorative.
- [ ] Above-the-fold hero images set `priority`.
- [ ] Long lists / galleries use `loading="lazy"` (default for non-priority).
- [ ] `sizes` attribute is set when the image is responsive (`sizes="(max-width: 768px) 100vw, 50vw"`).
- [ ] Use `quality={75}` (default) unless the asset is a logo where you need 90+.
- [ ] Animated content uses `<video>` not `<Image>` (GIFs are not optimized).
- [ ] No layout shift: verified via Lighthouse CLS < 0.1.
- [ ] `next.config.js` has `images.formats: ['image/avif', 'image/webp']` so modern formats win.
- [ ] CDN cache rule for `/_next/image` matches above (30d edge, 7d browser).
- [ ] On staging, `curl -I /_next/image?url=...` returns `Cache-Control: public, max-age=...`.

## next.config snippet

```js
// next.config.mjs
export default {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-icons'],
  },
};
```
