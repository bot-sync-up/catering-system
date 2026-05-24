# Image Optimization Checklist

- [ ] `next/image` בכל אפליקציה (לא `<img>`).
- [ ] `priority` רק על LCP image.
- [ ] `sizes` תואם לפריסה (לא `100vw` כברירת מחדל).
- [ ] `placeholder="blur"` ל-above-the-fold.
- [ ] format AVIF + WebP fallback ב-`next.config.js`:
  ```js
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  }
  ```
- [ ] User-uploaded images עוברים דרך `/api/images/optimize` שמכווץ ל-AVIF ב-server.
- [ ] Sharp שמוטמע ב-build.
- [ ] CDN cache header `immutable` על versioned URLs.
- [ ] Logo בפורמט SVG (לא PNG).
- [ ] Lighthouse score > 90 על mobile.
