/**
 * AbmExcelParser — פירוק קבצי ייצוא של ABM (אבן מורן) בפורמט Excel.
 *
 * ABM מייצאת לרוב בפורמט XLS/XLSX עם מבנה ברור: גיליון לכל סוג נתון.
 */

import ExcelJS from 'exceljs';

export interface AbmExportData {
  customers: AbmCustomer[];
  invoices: AbmInvoice[];
  receipts: AbmReceipt[];
  items: AbmItem[];
}

export interface AbmCustomer {
  code: string;
  name: string;
  businessId?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface AbmInvoice {
  number: string;
  date: Date;
  customerCode: string;
  total: number;
  vat: number;
  status: 'paid' | 'open' | 'cancelled';
}

export interface AbmReceipt {
  number: string;
  date: Date;
  customerCode: string;
  amount: number;
  paymentMethod: string;
}

export interface AbmItem {
  sku: string;
  name: string;
  price: number;
  unit?: string;
}

const SHEET_NAMES_HE: Record<keyof AbmExportData, string[]> = {
  customers: ['לקוחות', 'Customers'],
  invoices: ['חשבוניות', 'Invoices'],
  receipts: ['קבלות', 'Receipts'],
  items: ['פריטים', 'Items'],
};

export class AbmExcelParser {
  async parse(filePath: string): Promise<AbmExportData> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    return {
      customers: this.parseCustomers(this.findSheet(wb, SHEET_NAMES_HE.customers)),
      invoices: this.parseInvoices(this.findSheet(wb, SHEET_NAMES_HE.invoices)),
      receipts: this.parseReceipts(this.findSheet(wb, SHEET_NAMES_HE.receipts)),
      items: this.parseItems(this.findSheet(wb, SHEET_NAMES_HE.items)),
    };
  }

  private findSheet(wb: ExcelJS.Workbook, names: string[]): ExcelJS.Worksheet | null {
    for (const n of names) {
      const s = wb.getWorksheet(n);
      if (s) return s;
    }
    return null;
  }

  private parseCustomers(sheet: ExcelJS.Worksheet | null): AbmCustomer[] {
    if (!sheet) return [];
    const out: AbmCustomer[] = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // header
      out.push({
        code: this.str(row.getCell(1).value),
        name: this.str(row.getCell(2).value),
        businessId: this.optStr(row.getCell(3).value),
        phone: this.optStr(row.getCell(4).value),
        email: this.optStr(row.getCell(5).value),
        address: this.optStr(row.getCell(6).value),
      });
    });
    return out;
  }

  private parseInvoices(sheet: ExcelJS.Worksheet | null): AbmInvoice[] {
    if (!sheet) return [];
    const out: AbmInvoice[] = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      out.push({
        number: this.str(row.getCell(1).value),
        date: this.date(row.getCell(2).value),
        customerCode: this.str(row.getCell(3).value),
        total: this.num(row.getCell(4).value),
        vat: this.num(row.getCell(5).value),
        status: this.mapStatus(this.str(row.getCell(6).value)),
      });
    });
    return out;
  }

  private parseReceipts(sheet: ExcelJS.Worksheet | null): AbmReceipt[] {
    if (!sheet) return [];
    const out: AbmReceipt[] = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      out.push({
        number: this.str(row.getCell(1).value),
        date: this.date(row.getCell(2).value),
        customerCode: this.str(row.getCell(3).value),
        amount: this.num(row.getCell(4).value),
        paymentMethod: this.str(row.getCell(5).value),
      });
    });
    return out;
  }

  private parseItems(sheet: ExcelJS.Worksheet | null): AbmItem[] {
    if (!sheet) return [];
    const out: AbmItem[] = [];
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      out.push({
        sku: this.str(row.getCell(1).value),
        name: this.str(row.getCell(2).value),
        price: this.num(row.getCell(3).value),
        unit: this.optStr(row.getCell(4).value),
      });
    });
    return out;
  }

  private str(v: ExcelJS.CellValue): string {
    return v == null ? '' : String(v).trim();
  }
  private optStr(v: ExcelJS.CellValue): string | undefined {
    const s = this.str(v);
    return s || undefined;
  }
  private num(v: ExcelJS.CellValue): number {
    if (typeof v === 'number') return v;
    const n = parseFloat(this.str(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  private date(v: ExcelJS.CellValue): Date {
    if (v instanceof Date) return v;
    const d = new Date(this.str(v));
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  private mapStatus(s: string): 'paid' | 'open' | 'cancelled' {
    const norm = s.toLowerCase();
    if (norm.includes('שולם') || norm.includes('paid')) return 'paid';
    if (norm.includes('בטל') || norm.includes('cancel')) return 'cancelled';
    return 'open';
  }
}
