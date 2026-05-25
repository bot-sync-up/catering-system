/**
 * דוח מאזן - Excel.
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType, BalanceSheetRow } from '../types';

export class BalanceSheetExcel extends BaseGenerator {
  readonly formType: ReportFormType = 'BALANCE_SHEET';
  readonly fileExtension = 'xlsx';

  protected async render(ctx: GeneratorContext): Promise<Buffer> {
    try {
      const ExcelJSModule = (await import('exceljs')) as any;
      const ExcelJS = (ExcelJSModule.default ?? ExcelJSModule) as typeof import('exceljs');
      return this.renderWithExcelJs(ctx, ExcelJS);
    } catch {
      return Buffer.from(this.renderAsSpreadsheetMl(ctx), 'utf8');
    }
  }

  private async renderWithExcelJs(
    ctx: GeneratorContext,
    ExcelJS: typeof import('exceljs'),
  ): Promise<Buffer> {
    const rows = ctx.data.balanceSheet ?? [];
    const wb = new ExcelJS.Workbook();
    wb.creator = '@syncup/accountant-workflow';
    wb.created = new Date();
    const ws = wb.addWorksheet('מאזן', { views: [{ rightToLeft: true }] });

    ws.columns = [
      { header: 'חשבון', key: 'account', width: 40 },
      { header: 'קטגוריה', key: 'category', width: 20 },
      { header: 'יתרה', key: 'amount', width: 18, style: { numFmt: '#,##0.00' } },
    ];

    const sumBy = (cat: BalanceSheetRow['category']) =>
      rows.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0);

    const assetTotal = sumBy('asset');
    const liabilityTotal = sumBy('liability');
    const equityTotal = sumBy('equity');

    for (const cat of ['asset', 'liability', 'equity'] as const) {
      ws.addRow({ account: translate(cat), category: '', amount: '' }).font = { bold: true };
      for (const r of rows.filter((x) => x.category === cat)) {
        ws.addRow({ account: r.account, category: r.category, amount: r.amount });
      }
    }

    ws.addRow({});
    ws.addRow({ account: 'סה"כ נכסים', category: '', amount: assetTotal }).font = { bold: true };
    ws.addRow({ account: 'סה"כ התחייבויות', category: '', amount: liabilityTotal }).font = {
      bold: true,
    };
    ws.addRow({ account: 'סה"כ הון עצמי', category: '', amount: equityTotal }).font = { bold: true };

    const checkRow = ws.addRow({
      account: 'בדיקת איזון (נכסים - (התחייבויות+הון))',
      category: '',
      amount: assetTotal - liabilityTotal - equityTotal,
    });
    checkRow.font = {
      bold: true,
      color: { argb: Math.abs(assetTotal - liabilityTotal - equityTotal) < 0.01 ? 'FF008000' : 'FFB00000' },
    };

    const ab = await wb.xlsx.writeBuffer();
    return Buffer.from(ab as ArrayBuffer);
  }

  private renderAsSpreadsheetMl(ctx: GeneratorContext): string {
    const rows = ctx.data.balanceSheet ?? [];
    const cells = rows
      .map(
        (r) =>
          `   <Row><Cell><Data ss:Type="String">${escapeXml(r.account)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(r.category)}</Data></Cell><Cell><Data ss:Type="Number">${r.amount.toFixed(2)}</Data></Cell></Row>`,
      )
      .join('\n');
    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="מאזן">
    <Table>
      <Row><Cell><Data ss:Type="String">חשבון</Data></Cell><Cell><Data ss:Type="String">קטגוריה</Data></Cell><Cell><Data ss:Type="String">יתרה</Data></Cell></Row>
${cells}
    </Table>
  </Worksheet>
</Workbook>`;
  }
}

function translate(c: BalanceSheetRow['category']): string {
  return ({ asset: 'נכסים', liability: 'התחייבויות', equity: 'הון עצמי' } as const)[c];
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
