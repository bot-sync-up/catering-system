/**
 * טופס 106 — דין וחשבון שנתי על משכורת שולמה לעובד.
 * מוגש לעובד עד 31 במרץ של השנה שלאחר שנת המס.
 * המבנה כאן הוא תבנית XML בנוסח Mai101 פנימי.
 *
 * הערה: רשות המסים דורשת קובץ uniform 856/126 לדיווחים מקוונים;
 * הקובץ הזה משמש כ-source-of-truth פנימי + לאיגוד פר עובד.
 */
import { z } from 'zod';
import { xmlEscape, formatNis } from './xmlEscape';

export const Form106Schema = z.object({
  employerId: z.string().regex(/^\d{9}$/, 'ח.פ. / ת.ז. 9 ספרות'),
  employerName: z.string().min(1),
  taxYear: z.number().int().min(2000).max(2100),
  employee: z.object({
    idNumber: z.string().regex(/^\d{9}$/),
    fullName: z.string().min(1),
    address: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }),
  totals: z.object({
    grossSalary: z.number().nonnegative(),
    incomeTax: z.number().nonnegative(),
    nationalInsurance: z.number().nonnegative(),
    healthInsurance: z.number().nonnegative(),
    pensionContribution: z.number().nonnegative(),
    educationFund: z.number().nonnegative().default(0),
    netSalary: z.number().nonnegative(),
  }),
});

export type Form106 = z.infer<typeof Form106Schema>;

export function renderForm106(input: Form106): string {
  const data = Form106Schema.parse(input);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Form106 taxYear="${data.taxYear}" xmlns="https://taxes.gov.il/forms/106">`,
    `  <Employer>`,
    `    <Id>${xmlEscape(data.employerId)}</Id>`,
    `    <Name>${xmlEscape(data.employerName)}</Name>`,
    `  </Employer>`,
    `  <Employee>`,
    `    <IdNumber>${xmlEscape(data.employee.idNumber)}</IdNumber>`,
    `    <FullName>${xmlEscape(data.employee.fullName)}</FullName>`,
    data.employee.address ? `    <Address>${xmlEscape(data.employee.address)}</Address>` : '',
    `  </Employee>`,
    `  <Totals currency="ILS">`,
    `    <GrossSalary>${formatNis(data.totals.grossSalary)}</GrossSalary>`,
    `    <IncomeTax>${formatNis(data.totals.incomeTax)}</IncomeTax>`,
    `    <NationalInsurance>${formatNis(data.totals.nationalInsurance)}</NationalInsurance>`,
    `    <HealthInsurance>${formatNis(data.totals.healthInsurance)}</HealthInsurance>`,
    `    <PensionContribution>${formatNis(data.totals.pensionContribution)}</PensionContribution>`,
    `    <EducationFund>${formatNis(data.totals.educationFund)}</EducationFund>`,
    `    <NetSalary>${formatNis(data.totals.netSalary)}</NetSalary>`,
    `  </Totals>`,
    `</Form106>`,
  ].filter(Boolean).join('\n');
}
