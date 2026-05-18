import { ReportType, ReportFormat } from '@prisma/client';
import { ReportFilter } from './filters';
import {
  pnlByPeriod, cashflow, vatReport, form106ForYear,
  inventoryRevaluation, cogsPerEvent,
  byAgent, byCustomer, byCategory,
  cohortRetention, simpleRetention,
} from './aggregations';
import { buildWorkbook, SheetSpec } from './export/excel';
import { buildPdf, PdfTable } from './export/pdf';

export interface RunReportInput {
  type: ReportType;
  format: ReportFormat;
  filter: ReportFilter;
  year?: number; // for FORM_106
}

export interface RunReportOutput {
  filename: string;
  contentType: string;
  buffer: Buffer;
  data: any;
}

/**
 * Runs a report end-to-end: aggregation -> serialization (XLSX / PDF / JSON).
 */
export async function runReport(input: RunReportInput): Promise<RunReportOutput> {
  const { data, sheets, pdfTables, title } = await aggregate(input);

  if (input.format === 'JSON') {
    return {
      filename: `${input.type.toLowerCase()}.json`,
      contentType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data, null, 2), 'utf8'),
      data,
    };
  }

  if (input.format === 'XLSX') {
    const buf = await buildWorkbook(sheets, title);
    return {
      filename: `${input.type.toLowerCase()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buf,
      data,
    };
  }

  // PDF
  const buf = await buildPdf({ title, tables: pdfTables });
  return {
    filename: `${input.type.toLowerCase()}.pdf`,
    contentType: 'application/pdf',
    buffer: buf,
    data,
  };
}

async function aggregate(input: RunReportInput): Promise<{
  data: any;
  sheets: SheetSpec[];
  pdfTables: PdfTable[];
  title: string;
}> {
  const { type, filter } = input;
  switch (type) {
    case 'PNL': {
      const rows = await pnlByPeriod(filter);
      return {
        title: `דוח רווח והפסד ${filter.from.toISOString().slice(0, 10)}–${filter.to.toISOString().slice(0, 10)}`,
        data: rows,
        sheets: [{
          name: 'רווח והפסד',
          columns: [
            { header: 'תקופה', key: 'period' },
            { header: 'הכנסות', key: 'revenue', numFmt: '#,##0.00' },
            { header: 'עלות מכירה', key: 'cogs', numFmt: '#,##0.00' },
            { header: 'רווח גולמי', key: 'grossProfit', numFmt: '#,##0.00' },
            { header: 'הוצאות תפעול', key: 'opex', numFmt: '#,##0.00' },
            { header: 'רווח נקי', key: 'netIncome', numFmt: '#,##0.00' },
            { header: 'מרווח', key: 'margin', numFmt: '0.00%' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'רווח והפסד',
          headers: ['תקופה', 'הכנסות', 'עלות', 'רווח גולמי', 'תפעול', 'רווח נקי', 'מרווח'],
          rows: rows.map(r => [r.period, r.revenue, r.cogs, r.grossProfit, r.opex, r.netIncome, `${(r.margin * 100).toFixed(1)}%`]),
        }],
      };
    }
    case 'CASHFLOW': {
      const rows = await cashflow(filter);
      return {
        title: 'תזרים מזומנים ותחזית',
        data: rows,
        sheets: [{
          name: 'תזרים',
          columns: [
            { header: 'תקופה', key: 'period' },
            { header: 'תקבולים', key: 'inflow', numFmt: '#,##0.00' },
            { header: 'תשלומים', key: 'outflow', numFmt: '#,##0.00' },
            { header: 'נטו', key: 'net', numFmt: '#,##0.00' },
            { header: 'מצטבר', key: 'cumulative', numFmt: '#,##0.00' },
            { header: 'תחזית?', key: 'isForecast' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'תזרים מזומנים',
          headers: ['תקופה', 'תקבולים', 'תשלומים', 'נטו', 'מצטבר', 'תחזית'],
          rows: rows.map(r => [r.period, r.inflow, r.outflow, r.net, r.cumulative, r.isForecast ? 'כן' : 'לא']),
        }],
      };
    }
    case 'VAT': {
      const rows = await vatReport({ ...filter, officialOnly: true });
      return {
        title: 'דוח מע"מ',
        data: rows,
        sheets: [{
          name: 'מע"מ',
          columns: [
            { header: 'תקופה', key: 'period' },
            { header: 'בסיס מכירות', key: 'salesBase', numFmt: '#,##0.00' },
            { header: 'מע"מ עסקאות', key: 'outputVat', numFmt: '#,##0.00' },
            { header: 'בסיס רכש', key: 'purchasesBase', numFmt: '#,##0.00' },
            { header: 'מע"מ תשומות', key: 'inputVat', numFmt: '#,##0.00' },
            { header: 'מע"מ לתשלום', key: 'payable', numFmt: '#,##0.00' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'דוח מע"מ',
          headers: ['תקופה', 'בסיס מכירות', 'מע"מ עסקאות', 'בסיס רכש', 'מע"מ תשומות', 'לתשלום'],
          rows: rows.map(r => [r.period, r.salesBase, r.outputVat, r.purchasesBase, r.inputVat, r.payable]),
        }],
      };
    }
    case 'FORM_106': {
      const year = input.year ?? new Date().getFullYear() - 1;
      const rows = await form106ForYear(year);
      return {
        title: `טופס 106 — ${year}`,
        data: rows,
        sheets: [{
          name: 'טופס 106',
          columns: [
            { header: 'תעודת זהות', key: 'taxId' },
            { header: 'שם', key: 'name' },
            { header: 'שכר ברוטו', key: 'totalGross', numFmt: '#,##0.00' },
            { header: 'מס הכנסה', key: 'totalTax', numFmt: '#,##0.00' },
            { header: 'ביטוח לאומי', key: 'totalSocialSecurity', numFmt: '#,##0.00' },
            { header: 'מס בריאות', key: 'totalHealthInsurance', numFmt: '#,##0.00' },
            { header: 'פנסיה', key: 'totalPension', numFmt: '#,##0.00' },
            { header: 'נטו', key: 'netPaid', numFmt: '#,##0.00' },
          ],
          rows,
        }],
        pdfTables: [{
          title: `טופס 106 — ${year}`,
          headers: ['ת"ז', 'שם', 'ברוטו', 'מס', 'ב"ל', 'בריאות', 'פנסיה', 'נטו'],
          rows: rows.map(r => [r.taxId, r.name, r.totalGross, r.totalTax, r.totalSocialSecurity, r.totalHealthInsurance, r.totalPension, r.netPaid]),
        }],
      };
    }
    case 'INVENTORY_REVAL': {
      const rows = await inventoryRevaluation(filter.to);
      return {
        title: 'שערוך מלאי',
        data: rows,
        sheets: [{
          name: 'שערוך מלאי',
          columns: [
            { header: 'מק"ט', key: 'sku' },
            { header: 'פריט', key: 'name' },
            { header: 'יתרה', key: 'qtyOnHand', numFmt: '#,##0.00' },
            { header: 'שווי ספרים', key: 'bookCost', numFmt: '#,##0.00' },
            { header: 'שווי FIFO', key: 'fifoCost', numFmt: '#,##0.00' },
            { header: 'הפרשי שערוך', key: 'revaluation', numFmt: '#,##0.00' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'שערוך מלאי',
          headers: ['מק"ט', 'פריט', 'יתרה', 'ספרים', 'FIFO', 'הפרש'],
          rows: rows.map(r => [r.sku, r.name, r.qtyOnHand, r.bookCost, r.fifoCost, r.revaluation]),
        }],
      };
    }
    case 'COGS_EVENT': {
      const rows = await cogsPerEvent({ from: filter.from, to: filter.to });
      return {
        title: 'רווחיות לאירוע (COGS)',
        data: rows,
        sheets: [{
          name: 'אירועים',
          columns: [
            { header: 'אירוע', key: 'eventName' },
            { header: 'לקוח', key: 'customer' },
            { header: 'הכנסות', key: 'revenue', numFmt: '#,##0.00' },
            { header: 'חומרי גלם', key: 'ingredients', numFmt: '#,##0.00' },
            { header: 'עבודה', key: 'labor', numFmt: '#,##0.00' },
            { header: 'תקורה', key: 'overhead', numFmt: '#,##0.00' },
            { header: 'סה"כ עלות', key: 'totalCogs', numFmt: '#,##0.00' },
            { header: 'רווח גולמי', key: 'grossProfit', numFmt: '#,##0.00' },
            { header: 'מרווח', key: 'margin', numFmt: '0.00%' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'רווחיות לאירוע',
          headers: ['אירוע', 'הכנסות', 'חומ"ג', 'עבודה', 'תקורה', 'עלות', 'רווח גולמי', 'מרווח'],
          rows: rows.map(r => [r.eventName, r.revenue, r.ingredients, r.labor, r.overhead, r.totalCogs, r.grossProfit, `${(r.margin * 100).toFixed(1)}%`]),
        }],
      };
    }
    case 'BY_AGENT': {
      const rows = await byAgent(filter);
      return tableReport('פירוט לפי סוכן', 'סוכן', rows);
    }
    case 'BY_CUSTOMER': {
      const rows = await byCustomer(filter);
      return tableReport('פירוט לפי לקוח', 'לקוח', rows);
    }
    case 'BY_CATEGORY': {
      const rows = await byCategory(filter);
      return tableReport('פירוט לפי קטגוריה', 'קטגוריה', rows);
    }
    case 'RETENTION': {
      const data = await simpleRetention({ from: filter.from, to: filter.to });
      const rows = [data];
      return {
        title: 'שימור לקוחות',
        data,
        sheets: [{
          name: 'שימור',
          columns: [
            { header: 'לקוחות חוזרים', key: 'returning' },
            { header: 'סה"כ לקוחות תקופה קודמת', key: 'total' },
            { header: 'אחוז שימור', key: 'rate', numFmt: '0.00%' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'שימור לקוחות',
          headers: ['חוזרים', 'בסיס', 'אחוז'],
          rows: [[data.returning, data.total, `${(data.rate * 100).toFixed(1)}%`]],
        }],
      };
    }
    case 'COHORT': {
      const rows = await cohortRetention({ from: filter.from, to: filter.to });
      const maxLen = rows.reduce((m, r) => Math.max(m, r.retention.length), 0);
      const cols = [
        { header: 'מחזור', key: 'cohort' },
        { header: 'גודל', key: 'cohortSize' },
        ...Array.from({ length: maxLen }, (_, i) => ({
          header: `M${i}`, key: `m${i}`, numFmt: '0.00%',
        })),
      ];
      const flat = rows.map(r => {
        const o: any = { cohort: r.cohort, cohortSize: r.cohortSize };
        r.retention.forEach((v, i) => { o[`m${i}`] = v; });
        return o;
      });
      return {
        title: 'ניתוח קוהורט',
        data: rows,
        sheets: [{ name: 'קוהורט', columns: cols, rows: flat }],
        pdfTables: [{
          title: 'קוהורט שימור',
          headers: ['מחזור', 'גודל', ...Array.from({ length: maxLen }, (_, i) => `M${i}`)],
          rows: rows.map(r => [r.cohort, r.cohortSize, ...r.retention.map(v => `${(v * 100).toFixed(0)}%`)]),
        }],
      };
    }
    case 'FORECAST': {
      const rows = await cashflow(filter, 6);
      return {
        title: 'תחזית 6 חודשים',
        data: rows,
        sheets: [{
          name: 'תחזית',
          columns: [
            { header: 'תקופה', key: 'period' },
            { header: 'תקבולים', key: 'inflow', numFmt: '#,##0.00' },
            { header: 'תשלומים', key: 'outflow', numFmt: '#,##0.00' },
            { header: 'נטו', key: 'net', numFmt: '#,##0.00' },
            { header: 'תחזית?', key: 'isForecast' },
          ],
          rows,
        }],
        pdfTables: [{
          title: 'תחזית',
          headers: ['תקופה', 'תקבולים', 'תשלומים', 'נטו', 'תחזית'],
          rows: rows.map(r => [r.period, r.inflow, r.outflow, r.net, r.isForecast ? 'כן' : 'לא']),
        }],
      };
    }
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

function tableReport(title: string, labelHeader: string, rows: any[]) {
  return {
    title,
    data: rows,
    sheets: [{
      name: title,
      columns: [
        { header: labelHeader, key: 'label' },
        { header: 'הכנסות', key: 'revenue', numFmt: '#,##0.00' },
        { header: 'מס׳ חשבוניות', key: 'invoiceCount' },
      ],
      rows,
    }],
    pdfTables: [{
      title,
      headers: [labelHeader, 'הכנסות', 'מס׳ חשבוניות'],
      rows: rows.map((r: any) => [r.label, r.revenue, r.invoiceCount]),
    }],
  };
}
