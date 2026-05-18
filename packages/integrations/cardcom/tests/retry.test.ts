import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/utils/retry';

describe('withRetry', () => {
  it('retries and eventually succeeds', async () => {
    let n = 0;
    const r = await withRetry(async () => {
      n++;
      if (n < 3) throw new Error('boom');
      return 'ok';
    }, { baseDelayMs: 1, maxAttempts: 5 });
    expect(r).toBe('ok');
    expect(n).toBe(3);
  });

  it('respects isRetryable=false', async () => {
    let n = 0;
    await expect(
      withRetry(async () => {
        n++;
        throw new Error('nope');
      }, { isRetryable: () => false, maxAttempts: 5, baseDelayMs: 1 })
    ).rejects.toThrow();
    expect(n).toBe(1);
  });

  it('gives up after maxAttempts', async () => {
    let n = 0;
    await expect(
      withRetry(async () => {
        n++;
        throw new Error('keep failing');
      }, { maxAttempts: 3, baseDelayMs: 1 })
    ).rejects.toThrow();
    expect(n).toBe(3);
  });
});
