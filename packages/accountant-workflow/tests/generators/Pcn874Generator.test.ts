import { describe, it, expect } from 'vitest';
import { Pcn874Generator } from '../../src/generators/Pcn874Generator';
import { InMemoryFs } from '../../src/storage/inMemoryFs';
import { sampleBusiness, samplePeriod, sampleInputs } from '../__fixtures__/sampleData';

describe('Pcn874Generator', () => {
  it('יוצר קובץ PCN874 עם XML ו-Mai101 ושומר אותו ב-FS', async () => {
    const fs = new InMemoryFs();
    const gen = new Pcn874Generator({ basePath: '/var/files' });

    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: sampleInputs,
    });

    expect(file.formType).toBe('PCN874');
    expect(file.fileName).toBe('PCN874-2026-04.zip');
    expect(file.byteSize).toBeGreaterThan(0);
    expect(file.status).toBe('pending');
    expect(file.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.files.has(file.filePath)).toBe(true);

    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('=== BEGIN PCN874.xml ===');
    expect(content).toContain('=== BEGIN PCN874.mai101 ===');
    expect(content).toContain('<TaxId>514321987</TaxId>');
    expect(content).toContain('<TotalSales>15500.50</TotalSales>');
  });

  it('snapshot של פורמט Mai101 (קריטי לתאימות שע"מ)', async () => {
    const fs = new InMemoryFs();
    const gen = new Pcn874Generator({ basePath: '/var/files' });

    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: sampleInputs,
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    const mai101 = content
      .split('=== BEGIN PCN874.mai101 ===\n')[1]
      .split('\n=== END')[0];

    // Header: 'A' + taxId(9) + period(6) + count(7) + reserved(20=spaces)
    const header = mai101.split('\n')[0];
    expect(header.startsWith('A514321987')).toBe(true);
    expect(header).toContain('202604'); // YYYYMM
    expect(header).toMatch(/0000003/); // 3 רשומות

    // Footer
    const footer = mai101.split('\n').slice(-1)[0];
    expect(footer.startsWith('C')).toBe(true);

    expect(mai101).toMatchSnapshot();
  });

  it('מטפל בתקופה ריקה (0 עסקאות) ללא קריסה', async () => {
    const fs = new InMemoryFs();
    const gen = new Pcn874Generator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: { vatTransactions: [] },
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<Transactions count="0">');
    expect(content).toContain('<TotalSales>0.00</TotalSales>');
  });
});
