// Redis cache עבור תשובות LLM יקרות (FAQ, embeddings, תוצאות זהות)
// אופציונלי — אם אין REDIS_URL, נוסיף fallback ל-in-memory LRU

import Redis from "ioredis";
import { createHash } from "node:crypto";

let _redis: Redis | null = null;
const _memCache = new Map<string, { value: string; expiresAt: number }>();
const MEM_MAX = 1000;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  _redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  _redis.on("error", () => {
    // התעלמות שקטה — נופלים ל-memory cache
  });
  return _redis;
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export function cacheKey(namespace: string, ...parts: string[]): string {
  return `aisuite:${namespace}:${hash(parts.join("|"))}`;
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (r) {
    try {
      return await r.get(key);
    } catch {
      /* fallthrough */
    }
  }
  const m = _memCache.get(key);
  if (!m) return null;
  if (m.expiresAt < Date.now()) {
    _memCache.delete(key);
    return null;
  }
  return m.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, value, "EX", ttlSeconds);
      return;
    } catch {
      /* fallthrough */
    }
  }
  if (_memCache.size >= MEM_MAX) {
    const firstKey = _memCache.keys().next().value;
    if (firstKey) _memCache.delete(firstKey);
  }
  _memCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) return JSON.parse(cached) as T;
  const fresh = await factory();
  await cacheSet(key, JSON.stringify(fresh), ttlSeconds);
  return fresh;
}

export function clearMemCache(): void {
  _memCache.clear();
}
