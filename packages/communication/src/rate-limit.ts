import { Channel } from './types';

/**
 * Per-tenant rate limiting + daily quotas.
 *
 * Uses a token-bucket-ish approach (counter + window) — kept simple
 * because Redis INCR + EXPIRE works for >99% of cases. Tests use the
 * in-memory backend.
 */

export interface RateLimitConfig {
  /** Per-channel daily quota. */
  dailyQuota: Partial<Record<Channel, number>>;
  /** Per-minute burst limit (across channels). */
  perMinute: number;
}

const DEFAULTS: RateLimitConfig = {
  dailyQuota: {
    email: 10_000,
    sms: 5_000,
    whatsapp: 5_000,
    push: 100_000,
  },
  perMinute: 600,
};

const perTenant = new Map<string, RateLimitConfig>();

export function setTenantRateLimit(tenantId: string, cfg: Partial<RateLimitConfig>): void {
  perTenant.set(tenantId, { ...DEFAULTS, ...cfg, dailyQuota: { ...DEFAULTS.dailyQuota, ...cfg.dailyQuota } });
}

export function getTenantRateLimit(tenantId: string): RateLimitConfig {
  return perTenant.get(tenantId) ?? DEFAULTS;
}

export interface RateLimitBackend {
  increment(key: string, ttlSeconds: number): Promise<number>;
}

class InMemoryBackend implements RateLimitBackend {
  private readonly counts = new Map<string, { count: number; expiresAt: number }>();
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const entry = this.counts.get(key);
    if (!entry || entry.expiresAt < now) {
      this.counts.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    entry.count++;
    return entry.count;
  }
}

let backend: RateLimitBackend = new InMemoryBackend();
export function setRateLimitBackend(b: RateLimitBackend) {
  backend = b;
}

export interface RateLimitCheck {
  allowed: boolean;
  remainingDaily: number;
  remainingMinute: number;
}

export async function checkRateLimit(tenantId: string, channel: Channel): Promise<RateLimitCheck> {
  const cfg = getTenantRateLimit(tenantId);
  const day = todayKey();
  const dayKey = `rl:${tenantId}:${channel}:d:${day}`;
  const minuteKey = `rl:${tenantId}:m:${Math.floor(Date.now() / 60_000)}`;

  const dayCount = await backend.increment(dayKey, 86_400);
  const minuteCount = await backend.increment(minuteKey, 60);

  const dailyQuota = cfg.dailyQuota[channel] ?? Infinity;
  const allowed = dayCount <= dailyQuota && minuteCount <= cfg.perMinute;

  return {
    allowed,
    remainingDaily: Math.max(0, dailyQuota - dayCount),
    remainingMinute: Math.max(0, cfg.perMinute - minuteCount),
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
