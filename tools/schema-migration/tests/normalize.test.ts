import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import {
  deterministicUuid,
  toMoneyDecimal,
  floatToDecimal,
  normalizeVatRate,
  normalizeCurrency,
  normalizePhone,
  normalizeEmail,
  normalizeNationalId,
  splitName,
  toDate,
  toMinutes,
  toFinancialCategory,
} from "../src/util/normalize.js";

describe("normalize", () => {
  it("deterministicUuid יציב — מקור זהה מחזיר אותו UUID", () => {
    const a = deterministicUuid("crm", "abc123");
    const b = deterministicUuid("crm", "abc123");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("deterministicUuid שונה למקורות שונים", () => {
    expect(deterministicUuid("crm", "abc")).not.toBe(deterministicUuid("orders", "abc"));
  });

  it("toMoneyDecimal מעגל ל־2 ספרות", () => {
    expect(toMoneyDecimal("123.456")?.toString()).toBe("123.46");
    expect(toMoneyDecimal(null)).toBeNull();
    expect(toMoneyDecimal("")).toBeNull();
  });

  it("floatToDecimal מטפל בערכים לא תקינים", () => {
    expect(floatToDecimal(null).toString()).toBe("0");
    expect(floatToDecimal(NaN).toString()).toBe("0");
    expect(floatToDecimal(12.345).toString()).toBe("12.35");
  });

  it("normalizeVatRate ממיר 0.17 → 17 ושומר 18", () => {
    expect(normalizeVatRate(0.17).toString()).toBe("17");
    expect(normalizeVatRate(18).toString()).toBe("18");
    expect(normalizeVatRate(null).toString()).toBe("18");
  });

  it("normalizeCurrency ברירת מחדל ILS", () => {
    expect(normalizeCurrency(null)).toBe("ILS");
    expect(normalizeCurrency("usd")).toBe("USD");
  });

  it("normalizePhone מנרמל מספרים ישראליים", () => {
    expect(normalizePhone("050-1234567")).toBe("+972501234567");
    expect(normalizePhone("0501234567")).toBe("+972501234567");
    expect(normalizePhone("+972501234567")).toBe("+972501234567");
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("normalizeEmail מנרמל ל־lowercase", () => {
    expect(normalizeEmail("John@Example.COM")).toBe("john@example.com");
    expect(normalizeEmail("invalid")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it("normalizeNationalId משלים אפסים", () => {
    expect(normalizeNationalId("12345")).toBe("000012345");
    expect(normalizeNationalId("123-45-6789")).toBe("123456789");
    expect(normalizeNationalId(null)).toBeNull();
  });

  it("splitName מפצל שם מלא", () => {
    expect(splitName("ישראל ישראלי")).toEqual({ firstName: "ישראל", lastName: "ישראלי" });
    expect(splitName("ישראל בן דוד הכהן")).toEqual({ firstName: "ישראל", lastName: "בן דוד הכהן" });
    expect(splitName("יחיד")).toEqual({ firstName: "יחיד", lastName: "" });
    expect(splitName(null)).toEqual({ firstName: "", lastName: "" });
  });

  it("toDate מחזיר null לתאריך לא תקין", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate("invalid")).toBeNull();
    expect(toDate(new Date("2026-01-01"))?.toISOString()).toContain("2026-01-01");
  });

  it("toMinutes ממיר יחידות זמן", () => {
    expect(toMinutes(120, "seconds")).toBe(2);
    expect(toMinutes(2, "hours")).toBe(120);
    expect(toMinutes(5, "minutes")).toBe(5);
    expect(toMinutes(null)).toBeNull();
  });

  it("toFinancialCategory ממיר boolean→enum", () => {
    expect(toFinancialCategory(true)).toBe("OFFICIAL");
    expect(toFinancialCategory(false)).toBe("UNOFFICIAL");
    expect(toFinancialCategory(null)).toBe("OFFICIAL");
  });

  it("Decimal משמר דיוק כספי", () => {
    const d = toMoneyDecimal("999999999999.99");
    expect(d?.toString()).toBe("999999999999.99");
    expect(d?.toFixed(2)).toBe("999999999999.99");
    expect(d).toBeInstanceOf(Decimal);
  });
});
