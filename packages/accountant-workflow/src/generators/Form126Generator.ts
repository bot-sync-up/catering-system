/**
 * טופס 126 - דיווח שנתי על שכר עובדים וניכויים.
 * מוגש לרשות המסים אחת לשנה (סוף מרץ).
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType } from '../types';

export class Form126Generator extends BaseGenerator {
  readonly formType: ReportFormType = 'FORM126';
  readonly fileExtension = 'xml';

  protected async render(ctx: GeneratorContext): Promise<string> {
    const { business, period } = ctx;
    const employees = ctx.data.employees ?? [];

    const rows = employees
      .map(
        (e) =>
          `    <Employee id="${e.employeeId}">
      <Name>${escapeXml(e.fullName)}</Name>
      <AnnualGross>${e.grossSalary.toFixed(2)}</AnnualGross>
      <AnnualIncomeTax>${e.incomeTax.toFixed(2)}</AnnualIncomeTax>
      <AnnualSocialSecurity>${e.socialSecurity.toFixed(2)}</AnnualSocialSecurity>
      <AnnualHealthTax>${e.healthTax.toFixed(2)}</AnnualHealthTax>
    </Employee>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Form126 version="1.0">
  <Business>
    <TaxId>${business.taxId}</TaxId>
    <LegalName>${escapeXml(business.legalName)}</LegalName>
  </Business>
  <TaxYear>${period.year}</TaxYear>
  <Employees count="${employees.length}">
${rows}
  </Employees>
</Form126>
`;
  }
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
