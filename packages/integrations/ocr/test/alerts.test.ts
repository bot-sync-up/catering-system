import { describe, it, expect } from 'vitest';
import { buildAlerts } from '../src/notifications/alerts.js';
import type { Invoice } from '../src/vision/schema.js';

const baseInvoice: Invoice = {
  supplier: { name: 'אקמה', taxId: '514324128' },
  date: '2026-04-30',
  invoiceNum: 'A-1',
  currency: 'ILS',
  items: [{ desc: 'מסך', qty: 1, price: 1000, vat: 0.17 }],
  total: 1170,
};

describe('buildAlerts', () => {
  it('flags duplicate', () => {
    const a = buildAlerts({
      invoice: baseInvoice,
      isDuplicate: true,
      itemMatches: [],
      poMatch: { po: null, totalDelta: NaN, lines: [], reason: 'no-po-ref' },
      supplierKnown: true,
    });
    expect(a.find((x) => x.kind === 'duplicate')).toBeTruthy();
  });

  it('flags price spike beyond 30%', () => {
    const a = buildAlerts({
      invoice: baseInvoice,
      isDuplicate: false,
      itemMatches: [
        {
          invoiceItem: baseInvoice.items[0],
          match: { sku: 'X', supplierId: 's1', desc: 'מסך', lastPrice: 700 },
          confidence: 1,
          priceDelta: (1000 - 700) / 700,
        },
      ],
      poMatch: { po: null, totalDelta: NaN, lines: [], reason: 'no-po-ref' },
      supplierKnown: true,
    });
    expect(a.find((x) => x.kind === 'price-spike' && x.severity === 'critical')).toBeTruthy();
  });

  it('flags new supplier', () => {
    const a = buildAlerts({
      invoice: baseInvoice,
      isDuplicate: false,
      itemMatches: [],
      poMatch: { po: null, totalDelta: NaN, lines: [], reason: 'no-po-ref' },
      supplierKnown: false,
    });
    expect(a.find((x) => x.kind === 'unknown-supplier')).toBeTruthy();
  });
});
