/**
 * form856.ts — טופס 856 שנתי — לקוחות וספקים
 *
 * טופס 856 הוא דוח שנתי על תנועות עם לקוחות וספקים
 * (חשבוניות שיצאו ושנכנסו) — נדרש מעוסקים מורשים.
 *
 * הדוח כולל לכל לקוח/ספק:
 *   - ע.מ. / ח.פ.
 *   - שם
 *   - מספר תנועות בשנה
 *   - סה"כ סכום ללא מע"מ
 *   - סה"כ מע"מ
 *   - סוג הצד (לקוח/ספק)
 */

import { Form856Entry } from '../types';
import { APPROVED_SOFTWARE_NUMBER } from '../compliance/software1346';

export interface Form856Report {
  year: number;
  reporter_vat_id: string;
  reporter_name: string;
  customers: Form856Entry[];
  suppliers: Form856Entry[];
}

export class Form856Generator {
  generateText(report: Form856Report): string {
    this.validate(report);
    const lines: string[] = [];

    lines.push(this.headerLine(report));

    // Customers (type C)
    for (const c of report.customers) {
      lines.push(this.partyLine('C', c));
    }
    // Suppliers (type S)
    for (const s of report.suppliers) {
      lines.push(this.partyLine('S', s));
    }

    lines.push(this.summaryLine(report));
    return lines.join('\r\n');
  }

  generateJson(report: Form856Report): object {
    this.validate(report);
    return {
      form: '856',
      software: APPROVED_SOFTWARE_NUMBER,
      year: report.year,
      reporter: {
        vat_id: report.reporter_vat_id,
        name: report.reporter_name,
      },
      customers: report.customers,
      suppliers: report.suppliers,
      summary: this.summarize(report),
    };
  }

  private headerLine(r: Form856Report): string {
    const yr = String(r.year);
    const vat = r.reporter_vat_id.padStart(9, '0');
    const sw = APPROVED_SOFTWARE_NUMBER.padStart(8, '0');
    return `H${yr}${vat}${sw}`;
  }

  private partyLine(type: 'C' | 'S', e: Form856Entry): string {
    // type | vat(9) | name(50) | trans_count(6) | amount(13) | vat(13)
    const vat = e.party_vat_id.padStart(9, '0');
    const name = e.party_name.padEnd(50, ' ').substring(0, 50);
    const count = String(e.total_transactions).padStart(6, '0');
    const amount = String(Math.round(e.total_amount_no_vat * 100)).padStart(13, '0');
    const vatAmt = String(Math.round(e.total_vat * 100)).padStart(13, '0');
    return `${type}${vat}${name}${count}${amount}${vatAmt}`;
  }

  private summaryLine(r: Form856Report): string {
    const s = this.summarize(r);
    const cust = String(r.customers.length).padStart(6, '0');
    const sup = String(r.suppliers.length).padStart(6, '0');
    const totCust = String(Math.round(s.totalCustomersAmount * 100)).padStart(15, '0');
    const totSup = String(Math.round(s.totalSuppliersAmount * 100)).padStart(15, '0');
    return `Z${cust}${sup}${totCust}${totSup}`;
  }

  private summarize(r: Form856Report) {
    const sum = (arr: Form856Entry[]) =>
      arr.reduce(
        (acc, e) => ({
          amount: acc.amount + e.total_amount_no_vat,
          vat: acc.vat + e.total_vat,
        }),
        { amount: 0, vat: 0 },
      );
    const c = sum(r.customers);
    const s = sum(r.suppliers);
    return {
      totalCustomersAmount: c.amount,
      totalCustomersVat: c.vat,
      totalSuppliersAmount: s.amount,
      totalSuppliersVat: s.vat,
    };
  }

  validate(report: Form856Report): void {
    if (!report.year) throw new Error('Form856: year required');
    if (!report.reporter_vat_id || !/^\d{9}$/.test(report.reporter_vat_id)) {
      throw new Error('Form856: invalid reporter_vat_id');
    }
    const check = (arr: Form856Entry[], kind: string) => {
      for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!e.party_vat_id || !/^\d{9}$/.test(e.party_vat_id)) {
          throw new Error(`Form856 ${kind} ${i}: invalid party_vat_id`);
        }
        if (!e.party_name) throw new Error(`Form856 ${kind} ${i}: party_name required`);
      }
    };
    check(report.customers, 'customer');
    check(report.suppliers, 'supplier');
  }
}
