import { describe, it, expect } from 'vitest';
import { Form102Generator } from '../../src/generators/Form102Generator';
import { Form126Generator } from '../../src/generators/Form126Generator';
import { InMemoryFs } from '../../src/storage/inMemoryFs';
import {
  sampleBusiness,
  samplePeriod,
  annualPeriod,
  sampleInputs,
} from '../__fixtures__/sampleData';

describe('Form102Generator (ניכויי שכר חודשי)', () => {
  it('מסכם נכון ניכויים של כל העובדים', async () => {
    const fs = new InMemoryFs();
    const gen = new Form102Generator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: samplePeriod,
      fs,
      data: sampleInputs,
    });

    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<GrossSalary>21500.00</GrossSalary>');
    expect(content).toContain('<IncomeTax>2750.00</IncomeTax>');
    expect(content).toContain('<SocialSecurity>880.00</SocialSecurity>');
    expect(content).toContain('<HealthTax>570.00</HealthTax>');
    expect(content).toContain('<TotalDeductions>4200.00</TotalDeductions>');
    expect(content).toMatchSnapshot();
  });
});

describe('Form126Generator (שנתי שכר)', () => {
  it('מפיק רשומה לכל עובד עבור שנת מס', async () => {
    const fs = new InMemoryFs();
    const gen = new Form126Generator({ basePath: '/var/files' });
    const file = await gen.generate({
      business: sampleBusiness,
      period: annualPeriod,
      fs,
      data: sampleInputs,
    });
    const content = (await fs.readFile(file.filePath)).toString('utf8');
    expect(content).toContain('<TaxYear>2025</TaxYear>');
    expect(content).toContain('<Employees count="2">');
    expect(content).toContain('משה כהן');
    expect(content).toContain('שרה לוי');
  });
});
