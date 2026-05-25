/**
 * טופס 856 חלק ב' - דיווח שנתי על ספקים (סך תשלום + מע"מ תשומות).
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType } from '../types';

export class Form856PartBGenerator extends BaseGenerator {
  readonly formType: ReportFormType = 'FORM856_PART_B';
  readonly fileExtension = 'xml';

  protected async render(ctx: GeneratorContext): Promise<string> {
    return this.renderPublic(ctx);
  }

  async renderPublic(ctx: GeneratorContext): Promise<string> {
    const suppliers = ctx.data.suppliers ?? [];
    const total = suppliers.reduce((s, c) => s + c.totalAmount, 0);
    const totalVat = suppliers.reduce((s, c) => s + c.totalVat, 0);

    const rows = suppliers
      .map(
        (c, i) =>
          `      <Supplier seq="${i + 1}">
        <TaxId>${c.taxId}</TaxId>
        <Name>${escapeXml(c.name)}</Name>
        <TotalAmount>${c.totalAmount.toFixed(2)}</TotalAmount>
        <TotalVat>${c.totalVat.toFixed(2)}</TotalVat>
      </Supplier>`,
      )
      .join('\n');

    return `
    <Suppliers count="${suppliers.length}">
${rows}
    </Suppliers>
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
