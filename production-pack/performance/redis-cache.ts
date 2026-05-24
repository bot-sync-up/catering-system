/**
 * Redis caching strategy — type-safe wrapper with cache-aside, stale-while-revalidate,
 * single-flight (dogpile prevention), and per-tag invalidation.
 *
 * Import this once, use everywhere:
 *
 *   const products = await cache.fetch(
 *     `products:list:${page}`,
 *     () => db.product.findMany({ skip: page * 20, take: 20 }),
 *     { ttlSeconds: 60, staleSeconds: 600, tags: ['products'] }
 *   );
 *
 *   // Invalidate everything tagged 'products'
 *   await cache.invalidateTag('products');
 *
 * Hit-rate target: > 90% on read-heavy endpoints. Track with `cache_hits_total` /
 * `cache_misses_total` metrics emitted below.
 */
import type Redis from "ioredis";

export interface CacheOptions {
  ttlSeconds: number;
  /** Serve stale up to this many extra seconds while we refresh in the background. */
  staleSeconds?: number;
  /** Tags for bulk invalidation. */
  tags?: string[];
  /** Skip cache entirely (useful for admin endpoints). */
  bypass?: boolean;
}

interface Envelope<T> { v: T; e: number; }

const SINGLE_FLIGHT = new Map<string, Promise<unknown>>();

export class RedisCache {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = "cache:",
    private readonly metrics?: { hit: () => void; miss: () => void; stale: () => void; error: () => void; },
  ) {}

  private k(key: string) { return this.prefix + key; }

  async fetch<T>(key: string, loader: () => Promise<T>, opts: CacheOptions): Promise<T> {
    if (opts.bypass) return loader();

    const fullKey = this.k(key);
    try {
      const raw = await this.redis.get(fullKey);
      if (raw) {
        const env = JSON.parse(raw) as Envelope<T>;
        const now = Date.now();
        if (env.e > now) {
          this.metrics?.hit();
          return env.v;
        }
        // Stale — serve and refresh in background
        if (opts.staleSeconds && env.e + opts.staleSeconds * 1000 > now) {
          this.metrics?.stale();
          void this.refresh(fullKey, loader, opts).catch(() => this.metrics?.error());
          return env.v;
        }
      }
    } catch {
      this.metrics?.error();
      // Redis hiccup — fall through to loader. Never block on cache.
    }

    this.metrics?.miss();
    return this.refresh(fullKey, loader, opts);
  }

  private async refresh<T>(fullKey: string, loader: () => Promise<T>, opts: CacheOptions): Promise<T> {
    // Single-flight per key, in-process.
    const existing = SINGLE_FLIGHT.get(fullKey);
    if (existing) return existing as Promise<T>;

    const work = (async () => {
      const value = await loader();
      const env: Envelope<T> = { v: value, e: Date.now() + opts.ttlSeconds * 1000 };
      const totalTtl = opts.ttlSeconds + (opts.staleSeconds ?? 0);
      const pipe = this.redis.multi().set(fullKey, JSON.stringify(env), "EX", totalTtl);
      if (opts.tags?.length) {
        for (const tag of opts.tags) {
          pipe.sadd(this.k(`tag:${tag}`), fullKey);
          pipe.expire(this.k(`tag:${tag}`), totalTtl + 86400);
        }
      }
      await pipe.exec();
      return value;
    })().finally(() => SINGLE_FLIGHT.delete(fullKey));

    SINGLE_FLIGHT.set(fullKey, work);
    return work;
  }

  async invalidateTag(tag: string) {
    const tagKey = this.k(`tag:${tag}`);
    const keys = await this.redis.smembers(tagKey);
    if (keys.length === 0) return 0;
    const pipe = this.redis.multi();
    for (const k of keys) pipe.del(k);
    pipe.del(tagKey);
    await pipe.exec();
    return keys.length;
  }

  async invalidate(key: string) {
    return this.redis.del(this.k(key));
  }
}

/* ----------------------------------------------------------------
 *  TTL cheat-sheet (start here, tune from cache_hit_ratio dashboard)
 * ----------------------------------------------------------------
 *  Public, slow-changing  (categories, settings)   24h + sws 24h
 *  Public, daily-changing (homepage, top lists)    5m  + sws 1h
 *  Per-user data          (profile, cart)          30s + sws 5m  + per-user key
 *  Search results                                  60s + sws 5m
 *  Rate-limit counters                             use INCR + EX, no envelope
 *  Session/auth                                    use a separate sessions: prefix; do NOT envelope
 * ----------------------------------------------------------------
 */
