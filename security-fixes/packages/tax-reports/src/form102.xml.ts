/**
 * טופס 102 — דיווח חודשי לרשות המסים (מקדמות מס הכנסה ומע"מ).
 * מוגש עד ה-15 בכל חודש על החודש הקודם.
 */
import { z } from 'zod';
import { xmlEscape, formatNis, formatPeriod } from './xmlEscape';

export const Form102Schema = z.object({
  taxpayerId: z.string().regex(/^\d{9}$/),
  taxpayerName: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  /** מע"מ עסקאות (מכירות) */
  vatOutput: z.number().nonnegative(),
  /** מע"מ תשומות (קניות) */
  vatInput: z.number().nonnegative(),
  /** הכנסות מעבודה ששולמו (לחישוב ניכויים) */
  salaryPaid: z.number().nonnegative(),
  /** מס הכנסה ניכוי במקור */
  withheldIncomeTax: z.number().nonnegative(),
  /** ניכוי דמי ביטוח לאומי */
  nationalInsuranceWithheld: z.number().nonnegative(),
  /** מקדמות שולמו השנה */
  advancesPaidYTD: z.number().nonnegative().default(0),
});

export type Form102 = z.infer<typeof Form102Schema>;

export function renderForm102(input: Form102): string {
  const data = Form102Schema.parse(input);
  const vatBalance = data.vatOutput - data.vatInput;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Form102 period="${formatPeriod(data.year, data.month)}" xmlns="https://taxes.gov.il/forms/102">`,
    `  <Taxpayer>`,
    `    <Id>${xmlEscape(data.taxpayerId)}</Id>`,
    `    <Name>${xmlEscape(data.taxpayerName)}</Name>`,
    `  </Taxpayer>`,
    `  <Vat currency="ILS">`,
    `    <Output>${formatNis(data.vatOutput)}</Output>`,
    `    <Input>${formatNis(data.vatInput)}</Input>`,
    `    <Balance>${formatNis(vatBalance)}</Balance>`,
    `  </Vat>`,
    `  <IncomeTax currency="ILS">`,
    `    <SalaryPaid>${formatNis(data.salaryPaid)}</SalaryPaid>`,
    `    <WithheldIncomeTax>${formatNis(data.withheldIncomeTax)}</WithheldIncomeTax>`,
    `    <NationalInsuranceWithheld>${formatNis(data.nationalInsuranceWithheld)}</NationalInsuranceWithheld>`,
    `    <AdvancesPaidYTD>${formatNis(data.advancesPaidYTD)}</AdvancesPaidYTD>`,
    `  </IncomeTax>`,
    `</Form102>`,
  ].join('\n');
}
