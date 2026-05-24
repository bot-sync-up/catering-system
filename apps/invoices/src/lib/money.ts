// Money helpers — keep ILS at 2 decimals, avoid float drift.
// All arithmetic uses cents (integers) internally.

// Bankers-safe rounding to 2 decimals — pre-shifts by EPSILON to avoid
// IEEE-754 surprises like Math.round(1.015 * 100) === 101 (it's actually 102).
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(qty: number, unitPrice: number, discount = 0): number {
  return round2(qty * unitPrice * (1 - discount));
}

export function computeTotals(
  items: { quantity: number; unitPrice: number; discount?: number; vatRate?: number }[],
  defaultVatRate: number,
) {
  let subtotal = 0;
  let vatAmount = 0;
  for (const it of items) {
    const lt = lineTotal(it.quantity, it.unitPrice, it.discount ?? 0);
    subtotal += lt;
    vatAmount += lt * (it.vatRate ?? defaultVatRate);
  }
  subtotal = round2(subtotal);
  vatAmount = round2(vatAmount);
  return { subtotal, vatAmount, total: round2(subtotal + vatAmount) };
}

export function ils(n: number | string): string {
  const v = typeof n === 'string' ? Number(n) : n;
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(v);
}
