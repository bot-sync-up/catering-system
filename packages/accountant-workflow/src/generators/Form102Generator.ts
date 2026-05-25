/**
 * טופס 102 - דיווח חודשי על ניכויים משכר עובדים (מס הכנסה + בטל"א).
 * דיווח חודשי לרשות המסים, מועד הגשה: ה-15 לחודש הבא.
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType } from '../types';

export class Form102Generator extends BaseGenerator {
  readonly formType: ReportFormType = 'FORM102';
  readonly fileExtension = 'xml';

  protected async render(ctx: GeneratorContext): Promise<string> {
    const { business, period } = ctx;
    const employees = ctx.data.employees ?? [];

    const totalGross = employees.reduce((s, e) => s + e.grossSalary, 0);
    const totalIncomeTax = employees.reduce((s, e) => s + e.incomeTax, 0);
    const totalBituachLeumi = employees.reduce((s, e) => s + e.socialSecurity, 0);
    const totalHealthTax = employees.reduce((s, e) => s + e.healthTax, 0);

    const rows = employees
      .map(
        (e) =>
          `    <Employee id="${e.employeeId}">
      <Name>${escapeXml(e.fullName)}</Name>
      <GrossSalary>${e.grossSalary.toFixed(2)}</GrossSalary>
      <IncomeTax>${e.incomeTax.toFixed(2)}</IncomeTax>
      <SocialSecurity>${e.socialSecurity.toFixed(2)}</SocialSecurity>
      <HealthTax>${e.healthTax.toFixed(2)}</HealthTax>
    </Employee>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Form102 version="1.0">
  <Business>
    <TaxId>${business.taxId}</TaxId>
    <LegalName>${escapeXml(business.legalName)}</LegalName>
  </Business>
  <Period year="${period.year}" month="${period.month ?? ''}"/>
  <Totals>
    <GrossSalary>${totalGross.toFixed(2)}</GrossSalary>
    <IncomeTax>${totalIncomeTax.toFixed(2)}</IncomeTax>
    <SocialSecurity>${totalBituachLeumi.toFixed(2)}</SocialSecurity>
    <HealthTax>${totalHealthTax.toFixed(2)}</HealthTax>
    <TotalDeductions>${(totalIncomeTax + totalBituachLeumi + totalHealthTax).toFixed(2)}</TotalDeductions>
  </Totals>
  <Employees count="${employees.length}">
${rows}
  </Employees>
</Form102>
`;
  }
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
