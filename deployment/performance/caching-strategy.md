# Redis Caching Strategy

מקלייאנט ועד DB מסננים בקאש. הכלל: **read-heavy + slow + immutable או slowly-changing**.

## Layers

| שכבה | טכנולוגיה | TTL | פיקוח |
|---|---|---|---|
| Browser | `Cache-Control: public, max-age=...` + SWR | 1-60s | next/headers |
| Edge / CDN | Cloudflare Cache Rules | 1m-7d | `Cache-Tag` header |
| App (RSC) | Next.js `unstable_cache` | 5-60s | revalidateTag |
| Distributed | Redis (BullMQ pool) | 1m-24h | namespace prefix |
| DB | pg_stat_statements + indexes | - | - |

## Hot keys

| מפתח | TTL | Invalidation |
|---|---|---|
| `customer:{id}:profile` | 1h | על update |
| `customer:{id}:loyalty` | 5m | על earn/burn |
| `merchant:{id}:menu` | 24h | על menu edit (publish) |
| `merchant:{id}:hours` | 5m | manual |
| `driver:{id}:active_order` | 30s | event-based |
| `geo:zones` | 1h | weekly cron |
| `kitchen:{merchant}:queue` | 10s | event-based |
| `pricing:{merchant}:rules` | 30m | rule update |
| `idempotency:{key}` | 24h | one-shot |
| `rate-limit:{ip}:{route}` | 1m | sliding window |

## אנטי-patterns
- TTL > 1h ללא invalidation (stale data).
- Cache של PII (Israeli ID, full credit card) - אסור!
- Cache aside ללא lock -> dogpile. ל-hot keys: `redis-lock` או `SET NX`.
- Lazy invalidation בלבד -> השתמש ב-pub/sub ל-fan-out.

## דפוס מומלץ (TS)
```ts
async function getOrSet<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;
  const lock = await redis.set(`lock:${key}`, "1", "NX", "EX", 10);
  if (!lock) { await new Promise(r => setTimeout(r, 100)); return getOrSet(key, ttlSec, fn); }
  try {
    const value = await fn();
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
    return value;
  } finally { await redis.del(`lock:${key}`); }
}
```

## כמה זה חוסך
- בדיקות עומס מראות שמעבר ל-Redis chokes ב-`merchant:menu` מקטין latency p95 מ-220ms ל-12ms ומוריד CPU ב-DB ב-45%.
