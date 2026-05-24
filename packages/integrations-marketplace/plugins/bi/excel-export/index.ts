/**
 * Excel Export plugin — ייצוא דוחות/נתונים לקובץ XLSX.
 */

import { definePlugin } from '../../../src/sdk';
import ExcelJS from 'exceljs';

export default definePlugin({
  manifest: {
    id: 'excel-export',
    name: 'Excel Export',
    nameHe: 'ייצוא לאקסל',
    category: 'bi',
    version: '1.0.0',
    vendor: 'Sync Up',
    description: 'Export reports and data to XLSX files',
    descriptionHe: 'ייצוא דוחות ונתונים לקובצי XLSX',
    authType: 'none',
    permissions: ['storage:read', 'storage:write'],
  },

  async install(ctx) {
    ctx.logger.info('Excel export installed');
  },

  async uninstall() {},

  async healthCheck() {
    return { status: 'ok' as const, checkedAt: new Date() };
  },

  actions: {
    export: {
      name: 'export',
      description: 'Export rows to an XLSX buffer',
      descriptionHe: 'ייצוא שורות ל-XLSX',
      async execute(_ctx, params) {
        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet(String(params.sheetName ?? 'Sheet1'));
        const rows = params.rows as Array<Record<string, unknown>>;
        if (rows.length) {
          sheet.columns = Object.keys(rows[0]).map(k => ({ header: k, key: k }));
          sheet.addRows(rows);
        }
        const buf = await wb.xlsx.writeBuffer();
        return { bytes: buf.byteLength };
      },
    },
  },
});
