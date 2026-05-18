/**
 * פונקציות נירמול עזר — מומרות שדות לפורמטים האחידים של הסכמה החדשה.
 *
 * כללים עיקריים (מתוך MIGRATION-FROM-MODULES.md):
 * - מפתחות ראשיים: UUID במקום cuid.
 * - סכומים: Decimal(12,2) (Decimal(14,2) במרחב על־ערך).
 * - מטבע ברירת מחדל: ILS.
 * - מע"מ ברירת מחדל: 18 (החל מ־01/2025; הסכמה הישנה השתמשה ב־0.17/17).
 * - timestamps: createdAt / updatedAt (Date).
 */

import { Decimal } from "decimal.js";
import { v5 as uuidv5 } from "uuid";

/**
 * Namespace UUID יציב לייצור UUIDים דטרמיניסטיים מ־cuids ישנים.
 * שימוש: מקור זהה → UUID זהה → ניתן להריץ migrate שוב ושוב (idempotent).
 */
const STABLE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // RFC 4122 URL namespace

/** מייצר UUID דטרמיניסטי מ־(sourceModule, originalId). */
export function deterministicUuid(sourceModule: string, originalId: string): string {
  return uuidv5(`${sourceModule}::${originalId}`, STABLE_NAMESPACE);
}

/** ממיר ערך כלשהו ל־Decimal עם 2 ספרות אחרי הנקודה. ערכי `null`/`undefined`/ריק חוזרים כ־null. */
export function toMoneyDecimal(
  value: number | string | Decimal | null | undefined,
): Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Decimal(value);
  if (!d.isFinite()) return null;
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Float Prisma הישן → Decimal. אם null/undefined → 0. */
export function floatToDecimal(value: number | null | undefined): Decimal {
  if (value === null || value === undefined || !Number.isFinite(value)) return new Decimal(0);
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** מנרמל שיעור מע"מ: 0.17 → 17, 0.18 → 18, 18 → 18. ברירת מחדל: 18. */
export function normalizeVatRate(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(18);
  const d = new Decimal(value);
  if (!d.isFinite()) return new Decimal(18);
  if (d.lessThan(1)) return d.times(100).toDecimalPlaces(2);
  return d.toDecimalPlaces(2);
}

/** ברירת מחדל למטבע. */
export function normalizeCurrency(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "ILS";
  return value.trim().toUpperCase();
}

/** מנרמל מספר טלפון ישראלי: מסיר רווחים/מקפים, מוסיף +972 לחיוג בינלאומי. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let p = value.replace(/[\s\-().]/g, "");
  if (p === "") return null;
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("0")) p = `+972${p.slice(1)}`;
  else if (!p.startsWith("+")) p = `+972${p}`;
  return p;
}

/** מנרמל אימייל ל־lowercase + trim. */
export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const e = value.trim().toLowerCase();
  if (!e || !e.includes("@")) return null;
  return e;
}

/** מנרמל ת.ז./ח.פ. — רק ספרות, padding ל־9. */
export function normalizeNationalId(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits === "") return null;
  return digits.padStart(9, "0");
}

/** מנרמל ש"ם פרטי+משפחה מתוך displayName אם השדות נפרדים חסרים. */
export function splitName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

/** ממיר תאריך/string/null ל־Date או null. */
export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ממיר משך זמן מ־"שניות" / "דקות" / מספר ל־דקות אחידות. */
export function toMinutes(
  value: number | string | null | undefined,
  unit: "seconds" | "minutes" | "hours" = "minutes",
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  switch (unit) {
    case "seconds":
      return Math.round(n / 60);
    case "hours":
      return Math.round(n * 60);
    default:
      return Math.round(n);
  }
}

/** ממיר boolean ישן `רשמי` → enum `FinancialCategory`. */
export function toFinancialCategory(
  official: boolean | null | undefined | "OFFICIAL" | "UNOFFICIAL",
): "OFFICIAL" | "UNOFFICIAL" {
  if (official === false) return "UNOFFICIAL";
  if (official === "UNOFFICIAL") return "UNOFFICIAL";
  return "OFFICIAL";
}
