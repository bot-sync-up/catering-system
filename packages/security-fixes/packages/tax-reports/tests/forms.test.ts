import { describe, it, expect } from 'vitest';
import { renderForm106 } from '../src/form106.xml';
import { renderForm102 } from '../src/form102.xml';
import { renderForm126 } from '../src/form126.xml';
import { xmlEscape } from '../src/xmlEscape';

describe('xmlEscape', () => {
  it('בורח תווי XML', () => {
    expect(xmlEscape('a&b<c>"d\'')).toBe('a&amp;b&lt;c&gt;&quot;d&apos;');
  });
});

describe('Form 106', () => {
  it('מייצר XML תקין', () => {
    const out = renderForm106({
      employerId: '123456789',
      employerName: 'חברת בדיקה בע"מ',
      taxYear: 2025,
      employee: {
        idNumber: '987654321',
        fullName: 'דני כהן',
      },
      totals: {
        grossSalary: 120000,
        incomeTax: 15000,
        nationalInsurance: 8000,
        healthInsurance: 4000,
        pensionContribution: 7000,
        educationFund: 5000,
        netSalary: 81000,
      },
    });
    expect(out).toContain('<Form106 taxYear="2025"');
    expect(out).toContain('123456789');
    expect(out).toContain('&quot;'); // הוברח ה-quote
    expect(out).toContain('<GrossSalary>120000.00</GrossSalary>');
  });
});

describe('Form 102', () => {
  it('מחשב Balance מע"מ', () => {
    const out = renderForm102({
      taxpayerId: '123456789',
      taxpayerName: 'חברה',
      year: 2025,
      month: 3,
      vatOutput: 1800,
      vatInput: 300,
      salaryPaid: 10000,
      withheldIncomeTax: 1500,
      nationalInsuranceWithheld: 700,
    });
    expect(out).toContain('<Balance>1500.00</Balance>');
    expect(out).toContain('period="2025-03"');
  });
});

describe('Form 126', () => {
  it('מסכם נתוני כל העובדים', () => {
    const out = renderForm126({
      employerId: '111222333',
      employerName: 'מעסיק',
      taxYear: 2025,
      reportingPeriod: 'H1',
      fileFormat: 'Mai101',
      employees: [
        { idNumber: '111111118', fullName: 'א', startMonth: 1, endMonth: 6, grossSalary: 60000, taxWithheld: 8000, nationalInsurance: 4000, healthInsurance: 2000 },
        { idNumber: '222222226', fullName: 'ב', startMonth: 1, endMonth: 6, grossSalary: 50000, taxWithheld: 6000, nationalInsurance: 3500, healthInsurance: 1700 },
      ],
    });
    expect(out).toContain('<EmployeeCount>2</EmployeeCount>');
    expect(out).toContain('<TotalGrossSalary>110000.00</TotalGrossSalary>');
    expect(out).toContain('<TotalTaxWithheld>14000.00</TotalTaxWithheld>');
    expect(out).toContain('format="Mai101"');
  });

  it('דוחה ת.ז. לא תקינה', () => {
    expect(() => renderForm126({
      employerId: '111222333',
      employerName: 'X',
      taxYear: 2025,
      reportingPeriod: 'H1',
      fileFormat: 'Mai101',
      employees: [
        { idNumber: 'abc', fullName: 'X', startMonth: 1, endMonth: 6, grossSalary: 0, taxWithheld: 0, nationalInsurance: 0, healthInsurance: 0 },
      ],
    })).toThrow();
  });
});
