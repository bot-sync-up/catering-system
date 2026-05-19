/**
 * חישובי כסף ומע"מ — Israeli VAT 18%.
 */
import { Prisma } from "@prisma/client";

export const VAT_RATE = 18;

export function vatAmount(net: number, rate = VAT_RATE): number {
  return round2(net * (rate / 100));
}

export function withVat(net: number, rate = VAT_RATE): number {
  return round2(net * (1 + rate / 100));
}

export function netFromGross(gross: number, rate = VAT_RATE): number {
  return round2(gross / (1 + rate / 100));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

/** מעצב מספר הקצאה לחשבונית ישראלית: 2026-000001 */
export function invoiceNumber(year: number, seq: number): string {
  return `${year}-${seq.toString().padStart(6, "0")}`;
}

/** מספר קבלה: R-2026-000001 */
export function receiptNumber(year: number, seq: number): string {
  return `R-${year}-${seq.toString().padStart(6, "0")}`;
}

/** מספר הזמנת רכש: PO-2026-0001 */
export function poNumber(year: number, seq: number): string {
  return `PO-${year}-${seq.toString().padStart(4, "0")}`;
}
