import { describe, it, expect } from 'vitest';
import { InvoiceSchema } from '../src/entities/Invoice.js';
import { newId } from '../src/common/id.js';
import { money } from '../src/common/money.js';

const now = new Date().toISOString();

const baseInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: newId(),
  docType: 'TAX_INVOICE',
  docTag: 'OFFICIAL',
  docNumber: '2026-001',
  customerId: newId(),
  issueDate: now,
  status: 'ISSUED',
  items: [
    {
      id: newId(),
      description: 'הזמנה',
      quantity: '1',
      unitPrice: money('100'),
      discountPct: 0,
      taxRate: 0.18,
      lineTotal: money('100'),
    },
  ],
  subtotal: money('100'),
  vatAmount: money('18'),
  vatRate: 0.18,
  discountTotal: money('0'),
  grandTotal: money('118'),
  amountPaid: money('0'),
  amountDue: money('118'),
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('Invoice', () => {
  it('accepts an OFFICIAL TAX_INVOICE', () => {
    const r = InvoiceSchema.safeParse(baseInvoice());
    expect(r.success).toBe(true);
  });

  it('requires docNumber on issued invoice', () => {
    const r = InvoiceSchema.safeParse(baseInvoice({ docNumber: undefined }));
    expect(r.success).toBe(false);
  });

  it('CREDIT_NOTE must reference original', () => {
    const r = InvoiceSchema.safeParse(
      baseInvoice({ docType: 'CREDIT_NOTE', relatedInvoiceId: undefined }),
    );
    expect(r.success).toBe(false);
  });

  it('accepts UNOFFICIAL doc tag', () => {
    const r = InvoiceSchema.safeParse(baseInvoice({ docTag: 'UNOFFICIAL' }));
    expect(r.success).toBe(true);
  });
});
