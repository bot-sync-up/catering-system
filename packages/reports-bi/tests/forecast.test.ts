import { describe, it, expect } from "vitest";
import { linearRegression } from "../src/forecast/linear-regression.js";
import { applySeasonalFactor, computeSeasonalIndex } from "../src/forecast/seasonal.js";

describe("linearRegression", () => {
  it("מתאים שיפוע ונקודת חיתוך לקו ידוע y=2x+3", () => {
    const r = linearRegression([
      { x: 0, y: 3 },
      { x: 1, y: 5 },
      { x: 2, y: 7 },
      { x: 3, y: 9 },
    ]);
    expect(r.slope).toBeCloseTo(2, 6);
    expect(r.intercept).toBeCloseTo(3, 6);
    expect(r.r2).toBeCloseTo(1, 6);
    expect(r.predict(10)).toBeCloseTo(23, 6);
  });

  it("מתמודד עם 0 נקודות", () => {
    const r = linearRegression([]);
    expect(r.slope).toBe(0);
    expect(r.predict(100)).toBe(0);
  });

  it("מתמודד עם נקודה יחידה", () => {
    const r = linearRegression([{ x: 5, y: 42 }]);
    expect(r.predict(0)).toBe(42);
    expect(r.predict(100)).toBe(42);
  });

  it("R² נמוך עבור נתונים רועשים", () => {
    const r = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 10 },
      { x: 2, y: 2 },
      { x: 3, y: 9 },
    ]);
    expect(r.r2).toBeLessThan(0.5);
  });
});

describe("seasonal index", () => {
  it("מקדם > 1 בקיץ ו-< 1 בחורף כאשר הכנסות גבוהות בקיץ", () => {
    const points = Array.from({ length: 24 }, (_, i) => {
      const date = new Date(Date.UTC(2024, i % 12, 1));
      // קיץ (יוני-אוגוסט: חודשים 5-7) — ערכים גבוהים
      const month = i % 12;
      const value = month >= 5 && month <= 7 ? 200 : 100;
      return { date, value };
    });
    const idx = computeSeasonalIndex(points);
    expect(idx.factors[6]).toBeGreaterThan(1);
    expect(idx.factors[0]).toBeLessThan(1);
  });

  it("applySeasonalFactor מכפיל באינדקס", () => {
    const idx = { factors: new Array(12).fill(1).map((_, i) => (i === 6 ? 2 : 1)), baseAverage: 100 };
    expect(applySeasonalFactor(idx, new Date(Date.UTC(2026, 6, 1)), 100)).toBe(200);
    expect(applySeasonalFactor(idx, new Date(Date.UTC(2026, 0, 1)), 100)).toBe(100);
  });
});
