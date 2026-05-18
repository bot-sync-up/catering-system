/**
 * tests/pcn874.test.ts
 * בדיקות מחולל PCN874
 */

import { describe, it, expect } from 'vitest';
import { PCN874Generator, PCN874ValidationError } from '../src/reports/pcn874Generator';
import { PCN874Period } from '../src/types';

const samplePeriod: PCN874Period = {
  year: 2025,
  month: 6,
  records: [
    {
      type: 'A',
      doc_type: 'tax_invoice',
      doc_num: '1001',
      doc_date: '2025-06-01',
      vat_id: '123456789',
      amount_no_vat: 1000,
      vat: 170,
      total: 1170,
      allocation_num: 'A-001',
    },
    {
      type: 'A',
      doc_type: 'tax_invoice',
      doc_num: '1002',
      doc_date: '2025-06-15',
      vat_id: '987654321',
      amount_no_vat: 2000,
      vat: 340,
      total: 2340,
    },
    {
      type: 'B',
      doc_type: 'tax_invoice',
      doc_num: 'P-500',
      doc_date: '2025-06-05',
      vat_id: '555555555',
      amount_no_vat: 800,
      vat: 136,
      total: 936,
    },
  ],
};

describe('PCN874Generator', () => {
  const gen = new PCN874Generator();

  it('מייצר XML תקין', () => {
    const xml = gen.generateXml(samplePeriod);
    expect(xml).toContain('<PCN874');
    expect(xml).toContain('software="1346"');
    expect(xml).toContain('<Sales>');
    expect(xml).toContain('<Purchases>');
    expect(xml).toContain('<Summary>');
    expect(xml).toContain('123456789');
  });

  it('מייצר טקסט קבוע-רוחב', () => {
    const text = gen.generateText(samplePeriod);
    const lines = text.split('\r\n');
    expect(lines[0]).toMatch(/^O202506/);          // header
    expect(lines.some(l => l.startsWith('A'))).toBe(true);
    expect(lines.some(l => l.startsWith('B'))).toBe(true);
    expect(lines[lines.length - 1]).toMatch(/^Z/); // summary
  });

  it('סיכום חישובי נכון', () => {
    const text = gen.generateText(samplePeriod);
    const summaryLine = text.split('\r\n').find(l => l.startsWith('Z'))!;
    // sales no-vat = 3000 = 300000 agorot
    expect(summaryLine).toContain('0000000300000');
  });

  it('זורק שגיאת validation על חודש לא חוקי', () => {
    expect(() =>
      gen.validatePeriod({ ...samplePeriod, month: 13 }),
    ).toThrow(PCN874ValidationError);
  });

  it('זורק שגיאת validation על שנה לא חוקית', () => {
    expect(() =>
      gen.validatePeriod({ ...samplePeriod, year: 1800 }),
    ).toThrow(PCN874ValidationError);
  });

  it('זורק שגיאת validation על רשומה ללא doc_num', () => {
    expect(() =>
      gen.validatePeriod({
        ...samplePeriod,
        records: [{ ...samplePeriod.records[0], doc_num: '' }],
      }),
    ).toThrow(PCN874ValidationError);
  });

  it('בשנת 2027+ חשבונית מעל 5000 חייבת allocation', () => {
    expect(() =>
      gen.validatePeriod({
        year: 2027,
        month: 3,
        records: [
          {
            type: 'A',
            doc_type: 'tax_invoice',
            doc_num: '5001',
            doc_date: '2027-03-01',
            vat_id: '123456789',
            amount_no_vat: 10000,
            vat: 1700,
            total: 11700,
            // missing allocation_num
          },
        ],
      }),
    ).toThrow(PCN874ValidationError);
  });
});
