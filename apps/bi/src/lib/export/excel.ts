import ExcelJS from 'exceljs';

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number; numFmt?: string }[];
  rows: Record<string, any>[];
}

/**
 * Build an Excel workbook with one or more sheets and return as Buffer.
 * RTL is enabled on all sheets (Hebrew).
 */
export async function buildWorkbook(sheets: SheetSpec[], title = 'דוח'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BI Reports';
  wb.created = new Date();
  wb.title = title;

  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name, {
      views: [{ rightToLeft: true }],
    });
    ws.columns = spec.columns.map(c => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 18,
      style: c.numFmt ? { numFmt: c.numFmt } : undefined,
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' },
    };
    for (const row of spec.rows) ws.addRow(row);
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: spec.columns.length },
    };
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
