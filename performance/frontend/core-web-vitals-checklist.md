# Core Web Vitals - צ'ק ליסט

יעדים (Good per Google):
- **LCP** (Largest Contentful Paint) < 2.5s
- **INP** (Interaction to Next Paint) < 200ms
- **CLS** (Cumulative Layout Shift) < 0.1
- **TTFB** (Time To First Byte) < 800ms
- **FCP** (First Contentful Paint) < 1.8s

## LCP - הקטנת זמן רינדור התוכן העיקרי

- [ ] `<img priority>` או `fetchpriority="high"` על תמונת ה-hero.
- [ ] `<link rel="preload">` ל-font הראשי + `font-display: swap`.
- [ ] התמונה ה-LCP מוגשת כ-AVIF/WebP עם `<Image>` של Next.
- [ ] תמונת hero ב-dimensions קבועים (width/height props).
- [ ] CSS קריטי inlined, השאר defer.
- [ ] לא להסתיר LCP element ב-CSS-in-JS שטוען late.
- [ ] CDN edge קרוב (Cloudflare/Vercel - אוטומטי).
- [ ] HTML שלם מוחזר מ-server, לא placeholder לרינדור client-side.

## INP - תגובה מהירה לאינטראקציה

- [ ] React 18+ עם concurrent rendering מופעל.
- [ ] חלוקת עבודה כבדה ב-handlers עם `startTransition` או `requestIdleCallback`.
- [ ] אין long tasks > 50ms ב-tick הראשון של click handlers.
- [ ] event handlers debounced ל-input/search (250ms).
- [ ] mutation על קבוצות גדולות -> `useDeferredValue` או virtualize.
- [ ] קוד 3rd-party (אנליטיקס, chat) טעון `defer` או lazy.
- [ ] אין `document.body.scrollHeight` בלולאה (forces reflow).

## CLS - מניעת קפיצות layout

- [ ] לכל `<img>`, `<video>`, `<iframe>` יש `width` ו-`height`.
- [ ] גופנים: `font-display: swap` + `size-adjust` או `next/font`.
- [ ] בנרים/ads: מקום שמור עם `min-height` קבוע.
- [ ] modal/toast לא מזיזים תוכן - מקובעים מעל.
- [ ] dynamic content נטען לתוך `<div>` עם `min-height` או skeleton.
- [ ] אין הכנסת תוכן מעל ה-fold אחרי 500ms מ-load.

## TTFB - מהירות תגובה מהשרת

- [ ] SSR ב-Edge runtime במקום Node serverless (קר start חיסכון).
- [ ] DB queries < 50ms במצטבר ל-page load.
- [ ] Redis cache ל-data שצריך פר-request.
- [ ] Streaming SSR עם `Suspense` כך ש-HTML מגיע בחלקים.
- [ ] HTTP/2 או HTTP/3 בכל ה-stack.
- [ ] gzip/brotli enabled (Vercel/Cloudflare - אוטומטי).
- [ ] DNS prefetch + preconnect ל-origins חיצוניים.

## FCP - הופעת התוכן הראשון

- [ ] HTML < 50KB מעל ה-wire.
- [ ] CSS קריטי inlined, השאר עם `media="print"` swap.
- [ ] אין `@import` ב-CSS (חוסם).
- [ ] JS חוסם מינימלי - שאר ה-bundles `async` או `defer`.
- [ ] אין render-blocking analytics (Google Analytics dataLayer בלבד).

## כלי מדידה

| כלי | מתי |
|----|------|
| PageSpeed Insights | בדיקה ספציפית פר-URL, lab+field |
| Web Vitals extension | פיתוח לוקאלי, פר-load |
| `web-vitals` npm library | RUM בייצור, שולח ל-analytics |
| Lighthouse CI | CI/CD על PR |
| Chrome DevTools Performance panel | profiling עמוק של long tasks |
| `next-bundle-analyzer` | מציאת bundles גדולים |

## הקמת RUM ב-Next

```ts
// app/web-vitals.ts (client)
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((m) => {
    navigator.sendBeacon('/api/rum', JSON.stringify({
      name: m.name,
      value: m.value,
      rating: m.rating,
      delta: m.delta,
      id: m.id,
      url: location.href,
    }));
  });
  return null;
}
```

## ספי כשלון ב-CI (Lighthouse)

```json
{
  "assertions": {
    "categories:performance": ["error", { "minScore": 0.9 }],
    "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
    "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
    "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
    "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }]
  }
}
```
