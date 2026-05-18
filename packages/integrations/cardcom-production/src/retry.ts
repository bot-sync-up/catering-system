/**
 * Exponential backoff with full jitter.
 */
import { isRetryable, CardcomError } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** seed for deterministic jitter in tests; default Math.random */
  random?: () => number;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

const DEFAULTS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 4,
  baseDelayMs: 200,
  maxDelayMs: 8_000,
  random: Math.random,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function computeDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number,
): number {
  // 2^attempt scaled, then full jitter in [0, capped]
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(random() * exp);
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const cfg = { ...DEFAULTS, ...opts };
  let lastErr: unknown;

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;

      const cardcomErr = err instanceof CardcomError ? err : null;
      const retryable =
        cardcomErr?.retryable ??
        isRetryable({
          responseCode: cardcomErr?.responseCode,
          httpStatus: cardcomErr?.httpStatus,
        });

      const isLast = attempt === cfg.maxAttempts - 1;
      if (!retryable || isLast) {
        throw err;
      }

      const delay = computeDelay(attempt, cfg.baseDelayMs, cfg.maxDelayMs, cfg.random);
      opts.onRetry?.(attempt, err, delay);
      await sleep(delay);
    }
  }

  throw lastErr;
}
