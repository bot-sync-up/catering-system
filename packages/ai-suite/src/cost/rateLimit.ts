// Rate limiting פנימי — token bucket לכל tag
// מונע התקלות במכסת ה-API של Anthropic ושומר על תקציב

interface Bucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillPerSecond: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_CAPACITY = 60; // 60 קריאות
const DEFAULT_REFILL = 1; // 1 קריאה לשנייה => 60 לדקה

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

export function configureRateLimit(
  tag: string,
  config: RateLimitConfig,
): void {
  buckets.set(tag, {
    tokens: config.capacity,
    lastRefill: Date.now(),
    capacity: config.capacity,
    refillPerSecond: config.refillPerSecond,
  });
}

function getBucket(tag: string): Bucket {
  let b = buckets.get(tag);
  if (!b) {
    b = {
      tokens: DEFAULT_CAPACITY,
      lastRefill: Date.now(),
      capacity: DEFAULT_CAPACITY,
      refillPerSecond: DEFAULT_REFILL,
    };
    buckets.set(tag, b);
  }
  return b;
}

function refill(b: Bucket): void {
  const now = Date.now();
  const elapsed = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerSecond);
  b.lastRefill = now;
}

/**
 * רוכש token. אם הדלי ריק — ממתין עד שיתמלא.
 */
export async function acquireToken(tag: string): Promise<void> {
  const b = getBucket(tag);
  refill(b);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return;
  }
  const waitMs = ((1 - b.tokens) / b.refillPerSecond) * 1000;
  await new Promise((r) => setTimeout(r, waitMs));
  b.tokens = 0;
}

export function resetRateLimits(): void {
  buckets.clear();
}
