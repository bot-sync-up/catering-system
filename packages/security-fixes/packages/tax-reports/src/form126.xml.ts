/**
 * טופס 126 — דין וחשבון שנתי על ניכויים ממשכורת.
 * מוגש פעמיים בשנה: ב-30.4 (חצי שנה ראשונה) וב-30.9 (חצי שנה שניה),
 * ולפעמים כדיווח שנתי שלם בסיום שנה.
 * המבנה התומך הוא קובץ "Mai101" של רשות המסים — בנייה לפי מבנה רשומות אחיד.
 */
import { z } from 'zod';
import { xmlEscape, formatNis, formatPeriod } from './xmlEscape';

export const Form126EmployeeSchema = z.object({
  idNumber: z.string().regex(/^\d{9}$/),
  fullName: z.string().min(1),
  startMonth: z.number().int().min(1).max(12),
  endMonth: z.number().int().min(1).max(12),
  grossSalary: z.number().nonnegative(),
  taxWithheld: z.number().nonnegative(),
  nationalInsurance: z.number().nonnegative(),
  healthInsurance: z.number().nonnegative(),
});

export const Form126Schema = z.object({
  employerId: z.string().regex(/^\d{9}$/),
  employerName: z.string().min(1),
  taxYear: z.number().int().min(2000).max(2100),
  reportingPeriod: z.enum(['H1', 'H2', 'FULL']),
  fileFormat: z.literal('Mai101').default('Mai101'),
  employees: z.array(Form126EmployeeSchema).min(1),
});

export type Form126 = z.infer<typeof Form126Schema>;

export function renderForm126(input: Form126): string {
  const data = Form126Schema.parse(input);
  const totalGross = data.employees.reduce((s, e) => s + e.grossSalary, 0);
  const totalTax = data.employees.reduce((s, e) => s + e.taxWithheld, 0);
  const totalNI = data.employees.reduce((s, e) => s + e.nationalInsurance, 0);

  const employeeRecords = data.employees.map((e) => [
    `  <Employee>`,
    `    <IdNumber>${xmlEscape(e.idNumber)}</IdNumber>`,
    `    <FullName>${xmlEscape(e.fullName)}</FullName>`,
    `    <EmploymentPeriod from="${formatPeriod(data.taxYear, e.startMonth)}" to="${formatPeriod(data.taxYear, e.endMonth)}"/>`,
    `    <GrossSalary>${formatNis(e.grossSalary)}</GrossSalary>`,
    `    <TaxWithheld>${formatNis(e.taxWithheld)}</TaxWithheld>`,
    `    <NationalInsurance>${formatNis(e.nationalInsurance)}</NationalInsurance>`,
    `    <HealthInsurance>${formatNis(e.healthInsurance)}</HealthInsurance>`,
    `  </Employee>`,
  ].join('\n')).join('\n');

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Form126 taxYear="${data.taxYear}" period="${data.reportingPeriod}" format="${data.fileFormat}" xmlns="https://taxes.gov.il/forms/126">`,
    `  <Employer>`,
    `    <Id>${xmlEscape(data.employerId)}</Id>`,
    `    <Name>${xmlEscape(data.employerName)}</Name>`,
    `  </Employer>`,
    `  <Summary currency="ILS">`,
    `    <EmployeeCount>${data.employees.length}</EmployeeCount>`,
    `    <TotalGrossSalary>${formatNis(totalGross)}</TotalGrossSalary>`,
    `    <TotalTaxWithheld>${formatNis(totalTax)}</TotalTaxWithheld>`,
    `    <TotalNationalInsurance>${formatNis(totalNI)}</TotalNationalInsurance>`,
    `  </Summary>`,
    `  <Employees>`,
    employeeRecords,
    `  </Employees>`,
    `</Form126>`,
  ].join('\n');
}
