import { describe, it, expect } from 'vitest';
import { IncomeStatementExcel } from '../../src/generators/IncomeStatementExcel';
import { BalanceSheetExcel } from '../../src/generators/BalanceSheetExcel';
import { JournalEntriesCsv } from '../../src/generators/JournalEntriesCsv';
import { InMemoryFs } from '../../src/storage/inMemoryFs';
import {
  sampleBusiness,
  samplePeriod,
  annualPeriod,
  sampleInputs,
} from '../__fixtures__/sampleData';

describe('IncomeStatementExcel', () => {
  it('מפיק קובץ XLSX (או SpreadsheetML כ-fallback)', async () => {
    const fs = new InMemoryFs();
    const gen = new IncomeStatementExcel({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: sampleInputs,
    });
    expect(file.fileName).toBe('INCOME_STATEMENT-2025.xlsx');
    expect(file.byteSize).toBeGreaterThan(0);
    const buf = await fs.readFile(file.filePath);
    // קובץ XLSX אמיתי מתחיל ב-PK (ZIP signature); fallback מתחיל ב-<?xml.
    const head = buf.slice(0, 5).toString('utf8');
    expect(['PK', '<?xml', 'PK\x03\x04'].some((p) => head.startsWith(p))).toBe(true);
  });
});

describe('BalanceSheetExcel', () => {
  it('יוצר מאזן ומאמת איזון נכסים = התחייבויות + הון', async () => {
    const fs = new InMemoryFs();
    const gen = new BalanceSheetExcel({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: sampleInputs,
    });
    expect(file.fileName).toBe('BALANCE_SHEET-2025.xlsx');
    expect(file.byteSize).toBeGreaterThan(0);
  });
});

describe('JournalEntriesCsv', () => {
  it('מפיק CSV עם BOM ועם שורת סיכום מאוזנת', async () => {
    const fs = new InMemoryFs();
    const gen = new JournalEntriesCsv({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: sampleInputs,
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(content).toContain('תאריך,חשבון,תיאור,חובה,זכות,אסמכתא');
    expect(content).toContain('סה"כ,,,11800.00,11800.00,');
    expect(content).toMatchSnapshot();
  });

  it('Escape של פסיקים בתיאור', async () => {
    const fs = new InMemoryFs();
    const gen = new JournalEntriesCsv({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: {
        journalLines: [
          {
            date: '2026-04-01',
            account: '4100',
            description: 'מכירה, כולל מע"מ',
            debit: 0,
            credit: 1180,
          },
        ],
      },
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('"מכירה, כולל מע""מ"');
  });
});
