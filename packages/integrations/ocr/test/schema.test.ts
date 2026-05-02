import { describe, it, expect } from 'vitest';
import { InvoiceSchema } from '../src/vision/schema.js';

describe('InvoiceSchema', () => {
  it('accepts a minimal valid invoice', () => {
    const r = InvoiceSchema.safeParse({
      supplier: { name: 'אקמה בע"מ', taxId: '514324128' },
      date: '2026-04-30',
      invoiceNum: 'A-100',
      currency: 'ILS',
      items: [{ desc: 'מסך 24"', qty: 2, price: 800, vat: 0.17 }],
      total: 1872,
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid taxId', () => {
    const r = InvoiceSchema.safeParse({
      supplier: { name: 'X', taxId: '12' },
      date: '2026-04-30',
      invoiceNum: 'A',
      currency: 'ILS',
      items: [{ desc: 'a', qty: 1, price: 1, vat: 0.17 }],
      total: 1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects bad date format', () => {
    const r = InvoiceSchema.safeParse({
      supplier: { name: 'X', taxId: '514324128' },
      date: '30/04/2026',
      invoiceNum: 'A',
      currency: 'ILS',
      items: [{ desc: 'a', qty: 1, price: 1, vat: 0.17 }],
      total: 1,
    });
    expect(r.success).toBe(false);
  });
});
