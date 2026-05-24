/**
 * בדיקות migrationHelper - חישוב מחדש של חשבוניות פתוחות בעקבות שינוי VAT.
 */
import { describe, it, expect } from 'vitest';
import { recomputeInvoiceTotals, recomputeBatch, type InvoiceLike } from '../migrationHelper';

function makeInvoice(overrides: Partial<InvoiceLike> = {}): InvoiceLike {
  return {
    id: 'INV-1',
    invoiceDate: new Date('2025-01-15'),
    status: 'open',
    lines: [
      { id: 1, netAmount: 1000, vatAmount: 170, grossAmount: 1170, vatRate: 0.17 },
    ],
    ...overrides,
  };
}

describe('recomputeInvoiceTotals - preserveNet (default)', () => {
  it('מעדכן חשבונית פתוחה מ-17% ל-18% בשמירה על ה-net', () => {
    const { invoice, report } = recomputeInvoiceTotals(makeInvoice());
    expect(report.changed).toBe(true);
    expect(report.newRate).toBe(0.18);
    expect(invoice.lines[0].netAmount).toBe(1000);
    expect(invoice.lines[0].vatAmount).toBe(180);
    expect(invoice.lines[0].grossAmount).toBe(1180);
    expect(invoice.lines[0].vatRate).toBe(0.18);
  });

  it('מדווח על הפרשי סכומים נכונים', () => {
    const { report } = recomputeInvoiceTotals(makeInvoice());
    expect(report.oldTotals.vat).toBe(170);
    expect(report.newTotals.vat).toBe(180);
    expect(report.oldTotals.gross).toBe(1170);
    expect(report.newTotals.gross).toBe(1180);
  });

  it('מטפל בחשבונית רב-שורות', () => {
    const inv = makeInvoice({
      lines: [
        { id: 1, netAmount: 1000, vatAmount: 170, grossAmount: 1170, vatRate: 0.17 },
        { id: 2, netAmount: 500, vatAmount: 85, grossAmount: 585, vatRate: 0.17 },
      ],
    });
    const { invoice, report } = recomputeInvoiceTotals(inv);
    expect(invoice.lines[0].vatAmount).toBe(180);
    expect(invoice.lines[1].vatAmount).toBe(90);
    expect(report.newTotals.vat).toBe(270);
    expect(report.newTotals.gross).toBe(1770);
  });
});

describe('recomputeInvoiceTotals - preserveGross', () => {
  it('שומר על הברוטו ומקטין את ה-net', () => {
    const { invoice } = recomputeInvoiceTotals(makeInvoice(), { strategy: 'preserveGross' });
    // 1170 / 1.18 ≈ 991.53
    expect(invoice.lines[0].grossAmount).toBe(1170);
    expect(invoice.lines[0].netAmount).toBe(991.53);
    expect(invoice.lines[0].vatAmount).toBe(178.47);
  });
});

describe('recomputeInvoiceTotals - בדיקות מנע', () => {
  it('לא מעדכן חשבונית סגורה', () => {
    const { report } = recomputeInvoiceTotals(makeInvoice({ status: 'closed' }));
    expect(report.changed).toBe(false);
    expect(report.skipReason).toContain('closed');
  });

  it('לא מעדכן חשבונית ששולמה', () => {
    const { report } = recomputeInvoiceTotals(makeInvoice({ status: 'paid' }));
    expect(report.changed).toBe(false);
  });

  it('includeClosed=true כופה עדכון', () => {
    const { report } = recomputeInvoiceTotals(
      makeInvoice({ status: 'closed' }),
      { includeClosed: true }
    );
    expect(report.changed).toBe(true);
  });

  it('דילוג כשהשיעור כבר נכון', () => {
    const inv = makeInvoice({
      lines: [{ id: 1, netAmount: 1000, vatAmount: 180, grossAmount: 1180, vatRate: 0.18 }],
    });
    const { report } = recomputeInvoiceTotals(inv);
    expect(report.changed).toBe(false);
    expect(report.skipReason).toContain('זהים');
  });
});

describe('recomputeBatch', () => {
  it('מסכם הפרשי מע"מ לכמה חשבוניות', () => {
    const invoices = [
      makeInvoice({ id: 'A' }),
      makeInvoice({ id: 'B', lines: [{ netAmount: 2000, vatAmount: 340, grossAmount: 2340, vatRate: 0.17 }] }),
      makeInvoice({ id: 'C', status: 'closed' }),
    ];
    const { summary, reports } = recomputeBatch(invoices);
    expect(summary.total).toBe(3);
    expect(summary.changed).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.vatDelta).toBe(30); // (180-170) + (360-340)
    expect(reports.length).toBe(3);
  });
});
