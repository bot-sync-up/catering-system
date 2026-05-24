# CDN Configuration (Cloudflare / Fastly)

## Caching rules (Cloudflare "Cache Rules")

| Pattern | Cache | Edge TTL | Browser TTL |
|---|---|---|---|
| `/_next/static/*` | Cache everything | 1y | 1y, immutable |
| `/_next/image*` | Cache everything | 30d | 7d |
| `/images/*`, `/fonts/*`, `/static/*` | Cache everything | 30d | 7d |
| `/api/public/*` (GET only) | Standard | 1m | 0 |
| `/api/*` (POST/PUT/DELETE) | Bypass | 0 | 0 |
| `/api/auth/*`, `/api/admin/*` | Bypass + no-store | 0 | 0 |
| `/` (homepage, anonymous) | Cache by cookie absence | 1m | 0 |

## Cache key normalization
- Strip marketing query params: `utm_*`, `gclid`, `fbclid`, `ref`.
- Sort remaining query params.
- Include `Accept-Encoding` in cache key (so brotli/gzip variants don't collide).
- Vary on `Cookie` only when an auth cookie is present (use a Worker to extract the bit you care about).

## Origin shielding
- Enable Cloudflare **Argo Smart Routing** or Fastly **Shielding**.
- Pick a shield POP geographically close to the origin (Frankfurt or Amsterdam for IL traffic).

## Page Rules / Workers
- Force HTTPS, HSTS preload (matches nginx settings).
- Strip `Server` header.
- WAF: enable OWASP managed rules at **medium** sensitivity.
- Bot Fight Mode: on. Whitelist Googlebot, Bingbot, and your monitoring IPs.

## Purge on deploy
After a successful prod deploy:
```bash
curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": true}'
```
The deploy-prod workflow can call this in its final step.

## Image optimization
- Prefer **Cloudflare Images** or **Fastly Image Optimizer** over `next/image` for very high traffic.
  - Off-load resize/format negotiation from origin.
  - Polyfill via `next.config.js`:
    ```js
    images: { loader: 'custom', loaderFile: './lib/cdn-image-loader.ts' }
    ```

## Bandwidth limits to monitor
- Set a Cloudflare **Notification** when egress > 80% of plan.
- Daily report: top 50 largest URLs (find that one PDF someone shipped uncompressed).
