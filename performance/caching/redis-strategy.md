# אסטרטגיית Cache עם Redis

שלושה דפוסים יחד: **cache-aside** + **SWR** (Stale-While-Revalidate) + **single-flight**.

## דפוס 1 - Cache-aside בסיסי

```ts
// lib/cache.ts
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL!);

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const fresh = await loader();
  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
  return fresh;
}
```

הבעיה - **thundering herd**: כש-key פג, 100 בקשות בו-זמנית פוגעות ב-DB.

## דפוס 2 - Single-flight (de-dup of concurrent loaders)

```ts
const inflight = new Map<string, Promise<any>>();

export async function cachedSingleFlight<T>(
  key: string,
  ttl: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  if (inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const p = (async () => {
    try {
      const fresh = await loader();
      await redis.set(key, JSON.stringify(fresh), 'EX', ttl);
      return fresh;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
```

ב-cluster של Node, כל process יש לו `inflight` משלו. ל-distributed single-flight השתמש ב-Redis lock.

## דפוס 3 - SWR (Stale-While-Revalidate)

שני TTL: **fresh window** (משרת מ-cache בלי לבדוק) ו-**stale window** (משרת מ-cache אבל מרענן ברקע).

```ts
type Entry<T> = { value: T; freshUntil: number; staleUntil: number };

export async function swr<T>(
  key: string,
  freshSec: number,
  staleSec: number,
  loader: () => Promise<T>
): Promise<T> {
  const raw = await redis.get(key);
  const now = Date.now();

  if (raw) {
    const entry: Entry<T> = JSON.parse(raw);
    if (now < entry.freshUntil) return entry.value;
    if (now < entry.staleUntil) {
      // עדיין שמיש - רענן ברקע
      refreshInBackground(key, freshSec, staleSec, loader);
      return entry.value;
    }
  }

  // pity load - חייב לחכות
  return refreshNow(key, freshSec, staleSec, loader);
}

async function refreshNow<T>(key, fresh, stale, loader) {
  const value = await loader();
  const now = Date.now();
  const entry = {
    value,
    freshUntil: now + fresh * 1000,
    staleUntil: now + (fresh + stale) * 1000,
  };
  await redis.set(key, JSON.stringify(entry), 'EX', fresh + stale);
  return value;
}

function refreshInBackground(key, fresh, stale, loader) {
  // single-flight - אל תרענן שוב אם כבר רץ
  redis.set(`lock:${key}`, '1', 'EX', 30, 'NX').then((ok) => {
    if (!ok) return;
    refreshNow(key, fresh, stale, loader)
      .finally(() => redis.del(`lock:${key}`));
  });
}
```

## ספי TTL מומלצים

| תוכן | Fresh | Stale | Invalidation |
|-----|-------|-------|--------------|
| קטלוג מוצרים | 5min | 30min | event-based on update |
| פרופיל משתמש | 60s | 5min | מחיקת key on update |
| הזמנות פעילות | 30s | 2min | event-based |
| תוצאות חיפוש | 60s | 10min | TTL only |
| Feature flags | 30s | 5min | webhook from LD/Unleash |
| Static config | 1h | 24h | manual flush |
| Session data | 0 | 0 | אל תקצה - redis ישיר |

## Cache keys - convention

```
{app}:{entity}:{id}:{variant}
syncup:product:BAKE-001:he
syncup:user:1234:profile
syncup:event:8888:guests:page:1
syncup:search:q="חלה":page:1:limit:20
```

חוקים:
- אל תכלול PII בקיים (לא אימייל, לא טלפון).
- variant מבדיל גרסאות של אותו entity (locale, role).
- אורך מקסימלי 250 chars, hash אם ארוך.

## פיוצים נפוצים

```ts
// טען מוצר עם SWR
const product = await swr(
  `syncup:product:${sku}:he`,
  300,         // 5 דקות fresh
  1800,        // עוד 30 דקות stale
  () => db.product.findUnique({ where: { sku } })
);

// פסל cache בעדכון מוצר
async function updateProduct(sku, patch) {
  const updated = await db.product.update({ where: { sku }, data: patch });
  await redis.del(`syncup:product:${sku}:he`);
  await redis.del(`syncup:product:${sku}:en`);
  return updated;
}

// invalidation לפי tag (multi-key)
async function invalidateCategoryProducts(category) {
  const keys = await redis.smembers(`tag:category:${category}`);
  if (keys.length > 0) {
    await redis.del(...keys, `tag:category:${category}`);
  }
}
```

## הגנות

1. **NEVER cache ב-key שמכיל input משתמש בלי נורמליזציה** - LRU spamming attack.
2. **TTL jitter** - הוסף ±20% רנדומלי כדי שלא ייפוג הכל ביחד.
3. **Negative caching** - cache גם תוצאות לא-נמצא (404) ל-30s, אחרת תוקפים יציפו את ה-DB.
4. **Bound memory** - הגדר `maxmemory` + `maxmemory-policy allkeys-lru`.

## מטריקות

```ts
import { Counter, Histogram } from 'prom-client';
const hits = new Counter({ name: 'cache_hits_total', labelNames: ['key_prefix'] });
const misses = new Counter({ name: 'cache_misses_total', labelNames: ['key_prefix'] });
const latency = new Histogram({ name: 'cache_lookup_ms', labelNames: ['op'] });
```

יעד: hit ratio > 85% ב-keys שמיועדים ל-cache (לא session/lock).
