// Unit normalisation. All weights -> kg, volumes -> l, units -> unit.
export type Canon = 'kg' | 'l' | 'unit';

const FACTORS: Record<string, { canon: Canon; factor: number }> = {
  kg:   { canon: 'kg',   factor: 1 },
  g:    { canon: 'kg',   factor: 0.001 },
  mg:   { canon: 'kg',   factor: 0.000001 },
  l:    { canon: 'l',    factor: 1 },
  ml:   { canon: 'l',    factor: 0.001 },
  unit: { canon: 'unit', factor: 1 },
  pcs:  { canon: 'unit', factor: 1 },
  יח:  { canon: 'unit', factor: 1 },
  'יחידה': { canon: 'unit', factor: 1 },
  'ק"ג': { canon: 'kg', factor: 1 },
  'גרם': { canon: 'kg', factor: 0.001 },
  'ליטר': { canon: 'l', factor: 1 },
  'מ"ל': { canon: 'l', factor: 0.001 }
};

export function toCanon(qty: number, unit: string): { qty: number; canon: Canon } {
  const u = unit.trim().toLowerCase();
  const f = FACTORS[u] ?? FACTORS[unit] ?? { canon: 'unit' as Canon, factor: 1 };
  return { qty: qty * f.factor, canon: f.canon };
}

export function convert(qty: number, from: string, to: string): number | null {
  const a = toCanon(qty, from);
  const b = toCanon(1, to);
  if (a.canon !== b.canon) return null;
  return a.qty / b.qty;
}
