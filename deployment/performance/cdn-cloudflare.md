# Cloudflare CDN + R2

## DNS
- A `@` -> nginx LB.
- CNAME `*` -> proxied.
- CNAME `cdn` -> R2 bucket (custom domain).

## Cache Rules (Cloudflare Dashboard / Terraform)

| Rule | Match | Action |
|---|---|---|
| Static assets | `_next/static/*`, `*.{js,css,woff2,ttf,svg,png,jpg,webp}` | Cache eligible: yes; Edge TTL: 30d; Browser: 7d |
| API health | `/api/health` | Bypass cache |
| API mutate | `*` + method POST/PUT/DELETE | Bypass |
| API read | `/api/*`, method GET, no auth header | TTL 30s, SWR 60s |
| HTML (RSC) | `/`, content-type text/html | TTL 0, respect origin |

## Workers
- `rate-limit.js` - global IP rate limit לפני origin.
- `redirect-legacy.js` - 301 ל-URLs ישנים.

## R2 bucket
- `app-prod-assets` - תמונות חתומות שמועלות ב-direct upload.
- Lifecycle: ימחק uncommitted multipart uploads אחרי 1d.
- Public access דרך custom domain בלבד.

## Cache purging
```
# על deploy חדש
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/purge_cache" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prefixes":["www.example.com/_next/static"]}'
```

## Optimizations
- Brotli enabled (CF default).
- HTTP/3 + 0-RTT on.
- Polish: Lossy. WebP: On. Mirage: On (mobile).
- Argo Smart Routing: On (אופציונלי, ~$5/m).
