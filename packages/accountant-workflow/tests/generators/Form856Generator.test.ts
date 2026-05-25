import { describe, it, expect } from 'vitest';
import { Form856Generator } from '../../src/generators/Form856Generator';
import { Form856PartAGenerator } from '../../src/generators/Form856PartA';
import { Form856PartBGenerator } from '../../src/generators/Form856PartB';
import { InMemoryFs } from '../../src/storage/inMemoryFs';
import { sampleBusiness, annualPeriod, sampleInputs } from '../__fixtures__/sampleData';

describe('Form856Generator', () => {
  it('יוצר טופס 856 מאוחד עם חלק א + חלק ב', async () => {
    const fs = new InMemoryFs();
    const gen = new Form856Generator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: sampleInputs,
    });

    expect(file.formType).toBe('FORM856');
    expect(file.fileName).toBe('FORM856-2025.xml');
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<PartA>');
    expect(content).toContain('<PartB>');
    expect(content).toContain('<Customer seq="1">');
    expect(content).toContain('אולם אירועים שלום');
    expect(content).toContain('<Supplier seq="1">');
    expect(content).toMatchSnapshot();
  });

  it('PartA לבד מפיק את חלק הלקוחות בלבד', async () => {
    const fs = new InMemoryFs();
    const gen = new Form856PartAGenerator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: { customers: sampleInputs.customers },
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<Customers count="2">');
    expect(content).not.toContain('<Suppliers');
  });

  it('PartB לבד מפיק את חלק הספקים בלבד', async () => {
    const fs = new InMemoryFs();
    const gen = new Form856PartBGenerator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: { suppliers: sampleInputs.suppliers },
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<Suppliers count="1">');
  });
});
