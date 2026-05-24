/**
 * ניהול שיעור מע"מ ישראלי
 *
 * רשות המסים העלתה את שיעור המע"מ מ-17% ל-18% החל מ-1.1.2025.
 * שיעורים היסטוריים נשמרים לצורך חישוב חשבוניות עבר.
 */
import { z } from 'zod';

export const VatRateSchema = z.object({
  rate: z.number().min(0).max(1),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullable(),
  source: z.string(),
});

export type VatRate = z.infer<typeof VatRateSchema>;

/**
 * טבלה היסטורית של שיעורי מע"מ בישראל.
 * חובה לשמור היסטוריה לחישוב מסמכים רטרואקטיביים.
 */
export const VAT_RATE_HISTORY: ReadonlyArray<VatRate> = [
  {
    rate: 0.17,
    effectiveFrom: new Date('2015-10-01'),
    effectiveTo: new Date('2024-12-31'),
    source: 'רשות המסים - הודעה 2015',
  },
  {
    rate: 0.18,
    effectiveFrom: new Date('2025-01-01'),
    effectiveTo: null,
    source: 'רשות המסים - תיקון 2024',
  },
];

/**
 * שיעור ברירת המחדל לקריאה מ-env (לשעת חירום / שינוי דחוף).
 */
function envOverride(): number | null {
  const raw = process.env.VAT_RATE_OVERRIDE;
  if (!raw) return null;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`VAT_RATE_OVERRIDE לא חוקי: ${raw}`);
  }
  return parsed;
}

/**
 * מחזיר את שיעור המע"מ התקף לתאריך נתון.
 * @param at תאריך החיוב (ברירת מחדל: עכשיו)
 */
export function getVatRate(at: Date = new Date()): number {
  const override = envOverride();
  if (override !== null) return override;

  for (const entry of VAT_RATE_HISTORY) {
    const startsOk = at >= entry.effectiveFrom;
    const endsOk = entry.effectiveTo === null || at <= entry.effectiveTo;
    if (startsOk && endsOk) return entry.rate;
  }
  throw new Error(`לא נמצא שיעור מע"מ לתאריך ${at.toISOString()}`);
}

/**
 * חישוב סכום מע"מ על בסיס מחיר ללא מע"מ.
 */
export function calcVat(amountExclVat: number, at: Date = new Date()): number {
  return Math.round(amountExclVat * getVatRate(at) * 100) / 100;
}

/**
 * חישוב מחיר כולל מע"מ.
 */
export function withVat(amountExclVat: number, at: Date = new Date()): number {
  return Math.round((amountExclVat + calcVat(amountExclVat, at)) * 100) / 100;
}

/**
 * חילוץ הסכום ללא מע"מ ממחיר שכולל מע"מ.
 */
export function stripVat(amountInclVat: number, at: Date = new Date()): number {
  const rate = getVatRate(at);
  return Math.round((amountInclVat / (1 + rate)) * 100) / 100;
}
