// Pure-bucketing test for aging logic — no DB.
// Re-implements the bucket switch the way the service does it.
import { describe, it, expect } from 'vitest';

function bucket(daysOverdue: number) {
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

describe('aging buckets', () => {
  it.each([
    [0, '0-30'],
    [30, '0-30'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
    [365, '90+'],
  ])('day %i -> %s', (d, b) => {
    expect(bucket(d)).toBe(b);
  });
});
