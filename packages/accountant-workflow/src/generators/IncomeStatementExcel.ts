/**
 * דוח רווח והפסד - Excel.
 * משתמש ב-exceljs בקובץ "אמיתי"; ב-fallback כאן מייצר קובץ XLSX-תואם בסיסי (XML-spreadsheet).
 * הזרקת exceljs בפועל מתבצעת בקובץ ההפעלה (אופציונלי) כדי לאפשר טעינה עצלה.
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType, IncomeStatementRow } from '../types';

export class IncomeStatementExcel extends BaseGenerator {
  readonly formType: ReportFormType = 'INCOME_STATEMENT';
  readonly fileExtension = 'xlsx';

  protected async render(ctx: GeneratorContext): Promise<Buffer> {
    // ניסיון לטעון exceljs בריצה - אם לא מותקן, נופלים ל-XML spreadsheet 2003.
    try {
      // טעינה דינמית כדי שלא נחייב dependency קשיחה בבדיקות
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
    const rows = ctx.data.incomeStatement ?? [];
    const wb = new ExcelJS.Workbook();
    wb.creator = '@syncup/accountant-workflow';
    wb.created = new Date();
    const ws = wb.addWorksheet('רווח והפסד', { views: [{ rightToLeft: true }] });

    ws.columns = [
      { header: 'חשבון', key: 'account', width: 40 },
      { header: 'קטגוריה', key: 'category', width: 20 },
      { header: 'סכום', key: 'amount', width: 18, style: { numFmt: '#,##0.00' } },
    ];

    const grouped = this.groupByCategory(rows);
    let runningTotal = 0;
    for (const [cat, items] of grouped) {
      ws.addRow({ account: this.translateCategory(cat), category: '', amount: '' }).font = { bold: true };
      let groupTotal = 0;
      for (const r of items) {
        ws.addRow({ account: r.account, category: r.category, amount: r.amount });
        groupTotal += r.amount;
      }
      ws.addRow({ account: `סה"כ ${this.translateCategory(cat)}`, category: '', amount: groupTotal }).font = {
        bold: true,
      };
      runningTotal += cat === 'revenue' ? groupTotal : -groupTotal;
    }
    const totalRow = ws.addRow({ account: 'רווח נקי לפני מס', category: '', amount: runningTotal });
    totalRow.font = { bold: true, color: { argb: 'FF008000' } };

    const ab = await wb.xlsx.writeBuffer();
    return Buffer.from(ab as ArrayBuffer);
  }

  /** Fallback - SpreadsheetML 2003 (XML פתוח אותו אקסל פותח). */
  private renderAsSpreadsheetMl(ctx: GeneratorContext): string {
    const rows = ctx.data.incomeStatement ?? [];
    const cells = rows
      .map(
        (r) =>
          `   <Row><Cell><Data ss:Type="String">${escapeXml(r.account)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(r.category)}</Data></Cell><Cell><Data ss:Type="Number">${r.amount.toFixed(2)}</Data></Cell></Row>`,
      )
      .join('\n');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="רווח והפסד">
    <Table>
      <Row><Cell><Data ss:Type="String">חשבון</Data></Cell><Cell><Data ss:Type="String">קטגוריה</Data></Cell><Cell><Data ss:Type="String">סכום</Data></Cell></Row>
${cells}
    </Table>
  </Worksheet>
</Workbook>`;
  }

  private groupByCategory(rows: IncomeStatementRow[]): Map<string, IncomeStatementRow[]> {
    const map = new Map<string, IncomeStatementRow[]>();
    for (const r of rows) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }

  private translateCategory(c: string): string {
    return {
      revenue: 'הכנסות',
      cogs: 'עלות המכר',
      'operating-expense': 'הוצאות תפעוליות',
      tax: 'מסים',
      other: 'אחר',
    }[c] ?? c;
  }
}

function escapeXml(s: string): string {
  return String(s).replace(/[&<>'"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c] ?? c,
  );
}
