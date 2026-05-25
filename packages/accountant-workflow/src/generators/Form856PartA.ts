/**
 * טופס 856 חלק א' - דיווח שנתי על לקוחות (סך מחזור + מע"מ).
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType } from '../types';

export class Form856PartAGenerator extends BaseGenerator {
  readonly formType: ReportFormType = 'FORM856_PART_A';
  readonly fileExtension = 'xml';

  protected async render(ctx: GeneratorContext): Promise<string> {
    return this.renderPublic(ctx);
  }

  async renderPublic(ctx: GeneratorContext): Promise<string> {
    const customers = ctx.data.customers ?? [];
    const total = customers.reduce((s, c) => s + c.totalAmount, 0);
    const totalVat = customers.reduce((s, c) => s + c.totalVat, 0);

    const rows = customers
      .map(
        (c, i) =>
          `      <Customer seq="${i + 1}">
        <TaxId>${c.taxId}</TaxId>
        <Name>${escapeXml(c.name)}</Name>
        <TotalAmount>${c.totalAmount.toFixed(2)}</TotalAmount>
        <TotalVat>${c.totalVat.toFixed(2)}</TotalVat>
      </Customer>`,
      )
      .join('\n');

    return `
    <Customers count="${customers.length}">
${rows}
    </Customers>
    <Totals>
      <Amount>${total.toFixed(2)}</Amount>
      <Vat>${totalVat.toFixed(2)}</Vat>
    </Totals>`;
  }
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
