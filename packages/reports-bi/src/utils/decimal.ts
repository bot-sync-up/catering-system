/**
 * עזרי Decimal — נורמליזציה של Prisma.Decimal / number / string
 */
import { Decimal } from "decimal.js";

export type DecimalLike = Decimal | number | string | { toString(): string } | null | undefined;

export function toDecimal(v: DecimalLike): Decimal {
  if (v === null || v === undefined) return new Decimal(0);
  if (v instanceof Decimal) return v;
  if (typeof v === "number") return new Decimal(v);
  if (typeof v === "string") return new Decimal(v);
  return new Decimal(v.toString());
}

export function sumDecimals(values: DecimalLike[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0));
}

/** מחזיר 0..100; אם b===0 מחזיר 0 (אין חלוקה ב-0) */
export function pct(a: DecimalLike, b: DecimalLike): number {
  const bd = toDecimal(b);
  if (bd.isZero()) return 0;
  return toDecimal(a).div(bd).mul(100).toNumber();
}

export function round2(d: Decimal): Decimal {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function formatIls(d: DecimalLike): string {
  const v = toDecimal(d);
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(v.toNumber());
}
