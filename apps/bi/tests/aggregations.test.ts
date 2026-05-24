/**
 * Smoke tests for the math used inside aggregations
 * (no DB — extracted helpers).
 */

function linearForecast(history: number[], horizon: number): number[] {
  const xs = history.map((_, i) => i);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = history.reduce((s, x) => s + x, 0) / history.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (history[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return Array.from({ length: horizon }, (_, i) => Math.max(0, intercept + slope * (history.length + i)));
}

describe('linear forecast', () => {
  test('flat history -> flat forecast', () => {
    const f = linearForecast([100, 100, 100, 100], 6);
    expect(f.every(v => Math.abs(v - 100) < 0.001)).toBe(true);
  });
  test('rising history -> rising forecast', () => {
    const f = linearForecast([10, 20, 30, 40], 3);
    expect(f[0]).toBeGreaterThan(40);
    expect(f[2]).toBeGreaterThan(f[0]);
  });
  test('forecast values are non-negative', () => {
    const f = linearForecast([100, 50, 25, 12], 12);
    expect(f.every(v => v >= 0)).toBe(true);
  });
});
