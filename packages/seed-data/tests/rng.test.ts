/**
 * בדיקות RNG — דטרמיניזם, טווחים, pick/pickMany.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setRngSeed, rand, randInt, pick, pickMany, chance, randDecimal } from "../src/utils/rng.js";

describe("RNG דטרמיניסטי", () => {
  beforeEach(() => setRngSeed("test-seed"));

  it("seed זהה מחזיר רצף זהה", () => {
    const a = Array.from({ length: 5 }, () => rand());
    setRngSeed("test-seed");
    const b = Array.from({ length: 5 }, () => rand());
    expect(a).toEqual(b);
  });

  it("randInt בטווח כולל קצוות", () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("pick מחזיר תמיד פריט מהמערך", () => {
    const arr = ["א", "ב", "ג"];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it("pickMany לא מחזיר כפילויות וגדל לכל היותר למידת המקור", () => {
    const arr = [1, 2, 3, 4, 5];
    const picked = pickMany(arr, 100);
    expect(picked.length).toBe(arr.length);
    expect(new Set(picked).size).toBe(arr.length);
  });

  it("chance(0) תמיד false, chance(1) תמיד true", () => {
    expect(chance(0)).toBe(false);
    expect(chance(1)).toBe(true);
  });

  it("randDecimal עם 2 ספרות אחרי הנקודה", () => {
    for (let i = 0; i < 20; i++) {
      const v = randDecimal(10, 100, 2);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(100);
      // לכל היותר 2 ספרות אחרי הנקודה
      const decimals = (v.toString().split(".")[1] ?? "").length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});
