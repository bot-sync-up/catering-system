# חוקי CDN

נכון ל-Cloudflare/Vercel/Fastly - העקרונות זהים, ההגדרות משתנות.

## קטגוריות נכסים

| סוג | Cache-Control | Browser | Edge |
|-----|---------------|---------|------|
| `/_next/static/*` | `public, max-age=31536000, immutable` | שנה | שנה |
| תמונות עם hash | `public, max-age=31536000, immutable` | שנה | שנה |
| fonts (woff2) | `public, max-age=31536000, immutable` | שנה | שנה |
| `/api/*` | `no-store` | לא | לא |
| HTML דינמי (SSR) | `private, no-cache` | revalidate | לא |
| HTML עם ISR | `public, s-maxage=60, stale-while-revalidate=600` | revalidate | 60s+ |
| SVG/לוגו ציבורי | `public, max-age=86400, stale-while-revalidate=604800` | יום | יום |
| sitemap.xml/robots | `public, max-age=3600` | שעה | שעה |
| favicon | `public, max-age=86400` | יום | יום |

## Cloudflare - Page Rules

```
Rule 1: *.syncup.co.il/_next/static/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year

Rule 2: *.syncup.co.il/api/*
  - Cache Level: Bypass

Rule 3: *.syncup.co.il/*.{jpg,jpeg,png,webp,avif,svg,woff2}
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Polish: Lossless (image optimization)

Rule 4: *.syncup.co.il/products/*
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 hour
  - Origin Cache Control: On (כיבוד CC headers מ-Next)
```

## Cache Keys - מה לא לכלול

ברירת מחדל של Cloudflare כוללת query strings - זה גורם לפיצול cache. הסר כל query לא משמעותי:

```
Cache Key Rules:
  - Ignore query strings: utm_*, fbclid, gclid, ref, _ga
  - Include in key: page, q, limit, offset, sort, locale
  - Cookies to include in cache key: locale-cookie (אם תוכן מתורגם)
```

## Stale-While-Revalidate ב-Edge

Cloudflare Workers / Vercel Edge תומכים ב-`stale-while-revalidate`:

```ts
// Next route handler
export const revalidate = 60;       // ISR בכל 60s

export async function GET(req: Request) {
  const data = await fetchData();
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
    },
  });
}
```

תוצאה: ב-60 שניות הראשונות מוגש מ-edge cache fresh. בין 60-660s מוגש stale ו-edge מרענן ברקע.

## Purge selective

```bash
# Cloudflare - purge by URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://syncup.co.il/products/BAKE-001"]}'

# Purge by tag (דורש Cache-Tag header במקור)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -d '{"tags":["product:BAKE-001"]}'
```

הגדר ב-Next:
```ts
headers: {
  'Cache-Tag': `product:${sku},category:${category}`,
}
```

## הגנות מפני poisoning

- **Vary header** - חייב להכיל `Accept-Encoding`, `Accept-Language` אם תוכן משתנה.
- **NEVER cache POST/PATCH/DELETE** - אפילו עם CC headers, חלק מה-CDNs מתעלמים.
- **403/500 גם נכנסים ל-cache** אם אין `no-store` - הוסף explicit לכל endpoint דינמי.
- **חיתוך path traversal** ברמת ה-CDN לפני שמגיע למקור.

## אימות שה-CDN עובד

```bash
# בדוק header X-Cache או Cf-Cache-Status
curl -sI https://syncup.co.il/products/BAKE-001 | grep -i cache

# Cloudflare:
# Cf-Cache-Status: HIT | MISS | EXPIRED | REVALIDATED | UPDATING (=SWR)

# Vercel:
# X-Vercel-Cache: HIT | MISS | STALE
```

מטריקה: יעד **edge hit ratio > 90%** לתעבורת HTML/static, > 99% ל-`_next/static/*`.
