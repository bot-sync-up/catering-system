import {
  BusinessIdentity,
  GeneratorDataInputs,
  ReportPeriod,
} from '../../src/types';

export const sampleBusiness: BusinessIdentity = {
  taxId: '514321987',
  vatNumber: '514321987',
  legalName: 'קייטרינג בדיקות בע"מ',
  reportingYear: 2026,
  reportingMonth: 4,
};

export const samplePeriod: ReportPeriod = {
  period: '2026-04',
  year: 2026,
  month: 4,
};

export const annualPeriod: ReportPeriod = {
  period: '2025',
  year: 2025,
};

export const sampleInputs: GeneratorDataInputs = {
  vatTransactions: [
    {
      date: '2026-04-03',
      documentType: 'invoice',
      documentNumber: 'INV-1001',
      counterpartyTaxId: '511111119',
      amountExVat: 10000,
      vatAmount: 1800,
    },
    {
      date: '2026-04-15',
      documentType: 'invoice',
      documentNumber: 'INV-1002',
      counterpartyTaxId: '512222227',
      amountExVat: 5500.5,
      vatAmount: 990.09,
    },
    {
      date: '2026-04-20',
      documentType: 'receipt',
      documentNumber: 'RCP-7001',
      counterpartyTaxId: '513333335',
      amountExVat: 2200,
      vatAmount: 396,
    },
  ],
  customers: [
    { taxId: '511111119', name: 'אולם אירועים שלום', totalAmount: 120000, totalVat: 21600 },
    { taxId: '512222227', name: 'חברת ההסעדה הגדולה', totalAmount: 85000, totalVat: 15300 },
  ],
  suppliers: [
    { taxId: '513333335', name: 'ספק ירקות צפוני', totalAmount: 45000, totalVat: 8100 },
  ],
  employees: [
    {
      employeeId: '305112233',
      fullName: 'משה כהן',
      grossSalary: 12000,
      incomeTax: 1800,
      socialSecurity: 500,
      healthTax: 320,
    },
    {
      employeeId: '306223344',
      fullName: 'שרה לוי',
      grossSalary: 9500,
      incomeTax: 950,
      socialSecurity: 380,
      healthTax: 250,
    },
  ],
  journalLines: [
    { date: '2026-04-03', account: '4100', description: 'מכירה ללקוח שלום', debit: 0, credit: 11800 },
    { date: '2026-04-03', account: '1000', description: 'מכירה ללקוח שלום', debit: 11800, credit: 0 },
  ],
  balanceSheet: [
    { account: 'מזומנים ושווי מזומנים', category: 'asset', amount: 250000 },
    { account: 'לקוחות', category: 'asset', amount: 80000 },
    { account: 'ספקים', category: 'liability', amount: 60000 },
    { account: 'הון מניות', category: 'equity', amount: 270000 },
  ],
  incomeStatement: [
    { account: 'מכירות אירועים', category: 'revenue', amount: 500000 },
    { account: 'עלות מזון', category: 'cogs', amount: 180000 },
    { account: 'שכר עובדים', category: 'operating-expense', amount: 120000 },
    { account: 'שכירות', category: 'operating-expense', amount: 36000 },
  ],
};
