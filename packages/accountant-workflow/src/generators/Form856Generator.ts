/**
 * טופס 856 - דיווח שנתי לרשות המסים על לקוחות וספקים.
 * זהו טופס "מעטפת" - מאחד את שני החלקים (PartA = לקוחות, PartB = ספקים).
 */
import { BaseGenerator } from './BaseGenerator';
import { Form856PartAGenerator } from './Form856PartA';
import { Form856PartBGenerator } from './Form856PartB';
import { GeneratorContext, ReportFormType } from '../types';

export class Form856Generator extends BaseGenerator {
  readonly formType: ReportFormType = 'FORM856';
  readonly fileExtension = 'xml';

  private readonly partA: Form856PartAGenerator;
  private readonly partB: Form856PartBGenerator;

  constructor(opts: { basePath: string }) {
    super(opts);
    this.partA = new Form856PartAGenerator(opts);
    this.partB = new Form856PartBGenerator(opts);
  }

  protected async render(ctx: GeneratorContext): Promise<string> {
    const partAXml = await this.partA.renderPublic(ctx);
    const partBXml = await this.partB.renderPublic(ctx);
    const { business, period } = ctx;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Form856 version="1.0">
  <Business>
    <TaxId>${business.taxId}</TaxId>
    <LegalName>${escapeXml(business.legalName)}</LegalName>
  </Business>
  <Period year="${period.year}"/>
  <PartA>${partAXml}</PartA>
  <PartB>${partBXml}</PartB>
</Form856>
`;
  }
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
