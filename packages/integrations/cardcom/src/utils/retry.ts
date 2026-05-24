export interface RetryOpts {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  isRetryable?: (err: unknown) => boolean;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOpts = {}
): Promise<T> {
  const max = opts.maxAttempts ?? 4;
  const base = opts.baseDelayMs ?? 500;
  const cap = opts.maxDelayMs ?? 15_000;
  const jitter = opts.jitter ?? true;
  const retryable = opts.isRetryable ?? (() => true);

  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === max || !retryable(err)) throw err;
      const exp = Math.min(cap, base * 2 ** (attempt - 1));
      const delay = jitter ? Math.floor(Math.random() * exp) : exp;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
