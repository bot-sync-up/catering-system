/**
 * בדיקות תאריכים — אין NaN/Invalid, אזור זמן ישראל.
 */
import { describe, it, expect } from "vitest";
import { now, daysAgo, daysFromNow, atTime, addHours, startOfMonth, endOfMonth } from "../src/utils/dates.js";

describe("dates", () => {
  it("now() תמיד מחזירה תאריך תקף", () => {
    const d = now();
    expect(d.toString()).not.toContain("Invalid");
    expect(d.getTime()).not.toBeNaN();
  });

  it("daysAgo / daysFromNow סימטריים", () => {
    const past = daysAgo(7);
    const future = daysFromNow(7);
    const today = now();
    expect(past.getTime()).toBeLessThan(today.getTime());
    expect(future.getTime()).toBeGreaterThan(today.getTime());
  });

  it("atTime — קביעת שעה", () => {
    const base = daysFromNow(1);
    const at = atTime(base, 18, 30);
    expect(at.getHours()).toBe(18);
    expect(at.getMinutes()).toBe(30);
  });

  it("startOfMonth / endOfMonth — בכל חודש מקבלים יום 1 / יום אחרון", () => {
    const ref = new Date("2026-05-19T10:00:00");
    expect(startOfMonth(ref).getDate()).toBe(1);
    const end = endOfMonth(ref);
    expect(end.getDate()).toBe(31);
  });

  it("addHours לא יוצר Invalid Date", () => {
    const d = addHours(now(), 24);
    expect(d.toString()).not.toContain("Invalid");
  });
});
