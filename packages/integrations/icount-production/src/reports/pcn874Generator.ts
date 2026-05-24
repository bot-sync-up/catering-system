/**
 * pcn874Generator — מחולל דוח PCN874 (Mai101)
 *
 * הדוח כולל:
 *   - רשומה A — מכירות (חשבוניות מס שיצאו)
 *   - רשומה B — קניות (חשבוניות מס שהתקבלו)
 *   - רשומה Z — סיכום חודשי
 *
 * הדוח מוגש חודשית/דו-חודשית למע"מ כקובץ טקסט.
 * הפורמט הוא קבוע-רוחב, ASCII (CP-862 בעבר, UTF-8 היום).
 */

import { create } from 'xmlbuilder2';
import {
  PCN874Period,
  PCN874Record,
} from '../types';
import { APPROVED_SOFTWARE_NUMBER } from '../compliance/software1346';

export class PCN874ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'PCN874ValidationError';
  }
}

export class PCN874Generator {
  /**
   * מייצר את הדוח כ-XML (לחתימה דיגיטלית עתידית)
   */
  generateXml(period: PCN874Period): string {
    this.validatePeriod(period);

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('PCN874', {
        version: '1.0',
        software: APPROVED_SOFTWARE_NUMBER,
      })
      .ele('Header')
        .ele('Year').txt(String(period.year)).up()
        .ele('Month').txt(String(period.month).padStart(2, '0')).up()
        .ele('GeneratedAt').txt(new Date().toISOString()).up()
      .up();

    const sales = period.records.filter(r => r.type === 'A');
    const purchases = period.records.filter(r => r.type === 'B');

    const salesEle = root.ele('Sales');
    for (const r of sales) {
      this.appendRecord(salesEle, r);
    }

    const purchasesEle = root.ele('Purchases');
    for (const r of purchases) {
      this.appendRecord(purchasesEle, r);
    }

    // Z = סיכום
    const summary = this.summarize(period.records);
    root.ele('Summary')
      .ele('TotalSalesNoVat').txt(summary.salesNoVat.toFixed(2)).up()
      .ele('TotalSalesVat').txt(summary.salesVat.toFixed(2)).up()
      .ele('TotalPurchasesNoVat').txt(summary.purchasesNoVat.toFixed(2)).up()
      .ele('TotalPurchasesVat').txt(summary.purchasesVat.toFixed(2)).up()
      .ele('VatDue').txt(summary.vatDue.toFixed(2)).up();

    return root.end({ prettyPrint: true });
  }

  /**
   * מייצר את הדוח כטקסט קבוע-רוחב — הפורמט המקורי של רשות המסים
   */
  generateText(period: PCN874Period): string {
    this.validatePeriod(period);
    const lines: string[] = [];

    // Header line — type O
    lines.push(this.headerLine(period));

    // Sales (type A)
    for (const r of period.records.filter(x => x.type === 'A')) {
      lines.push(this.recordLine('A', r));
    }
    // Purchases (type B)
    for (const r of period.records.filter(x => x.type === 'B')) {
      lines.push(this.recordLine('B', r));
    }

    // Summary line — type Z
    lines.push(this.summaryLine(period));

    return lines.join('\r\n');
  }

  private headerLine(period: PCN874Period): string {
    // O | year | month | software
    const yyyymm = `${period.year}${String(period.month).padStart(2, '0')}`;
    return `O${yyyymm}${APPROVED_SOFTWARE_NUMBER.padStart(8, '0')}`;
  }

  private recordLine(type: 'A' | 'B', r: PCN874Record): string {
    // Simplified fixed-width:
    // [type:1][docDate:8][docNum:9][vatId:9][amount:11][vat:11][allocation:20]
    const docDate = r.doc_date.replace(/-/g, '').padEnd(8, ' ');
    const docNum = r.doc_num.padStart(9, '0');
    const vatId = (r.vat_id || '000000000').padStart(9, '0');
    const amountNoVat = String(Math.round(r.amount_no_vat * 100)).padStart(11, '0');
    const vat = String(Math.round(r.vat * 100)).padStart(11, '0');
    const allocation = (r.allocation_num ?? '').padEnd(20, ' ');
    return `${type}${docDate}${docNum}${vatId}${amountNoVat}${vat}${allocation}`;
  }

  private summaryLine(period: PCN874Period): string {
    const s = this.summarize(period.records);
    const salesNoVat = String(Math.round(s.salesNoVat * 100)).padStart(13, '0');
    const salesVat = String(Math.round(s.salesVat * 100)).padStart(13, '0');
    const purchNoVat = String(Math.round(s.purchasesNoVat * 100)).padStart(13, '0');
    const purchVat = String(Math.round(s.purchasesVat * 100)).padStart(13, '0');
    const due = String(Math.round(s.vatDue * 100)).padStart(13, '0');
    return `Z${salesNoVat}${salesVat}${purchNoVat}${purchVat}${due}`;
  }

  private summarize(records: PCN874Record[]) {
    let salesNoVat = 0;
    let salesVat = 0;
    let purchasesNoVat = 0;
    let purchasesVat = 0;
    for (const r of records) {
      if (r.type === 'A') {
        salesNoVat += r.amount_no_vat;
        salesVat += r.vat;
      } else if (r.type === 'B') {
        purchasesNoVat += r.amount_no_vat;
        purchasesVat += r.vat;
      }
    }
    return {
      salesNoVat,
      salesVat,
      purchasesNoVat,
      purchasesVat,
      vatDue: salesVat - purchasesVat,
    };
  }

  /**
   * Validation
   */
  validatePeriod(period: PCN874Period): void {
    const errs: string[] = [];
    if (!period.year || period.year < 2000 || period.year > 2100) {
      errs.push('Invalid year');
    }
    if (!period.month || period.month < 1 || period.month > 12) {
      errs.push('Invalid month (must be 1-12)');
    }
    if (!Array.isArray(period.records)) {
      errs.push('Records must be an array');
    } else {
      period.records.forEach((r, i) => {
        if (!['A', 'B', 'Z'].includes(r.type)) errs.push(`Record ${i}: invalid type`);
        if (!r.doc_num) errs.push(`Record ${i}: missing doc_num`);
        if (!r.doc_date || !/^\d{4}-\d{2}-\d{2}$/.test(r.doc_date)) {
          errs.push(`Record ${i}: invalid doc_date`);
        }
        if (typeof r.amount_no_vat !== 'number') errs.push(`Record ${i}: amount_no_vat`);
        if (typeof r.vat !== 'number') errs.push(`Record ${i}: vat`);

        // אם זו חשבונית מס מעל הסף — חייב מספר הקצאה
        if (r.type === 'A' && r.total >= 5000 && period.year >= 2027 && !r.allocation_num) {
          errs.push(`Record ${i}: missing allocation_num for high-value invoice (Israel Model)`);
        }
      });
    }

    if (errs.length > 0) {
      throw new PCN874ValidationError('PCN874 validation failed', errs);
    }
  }

  private appendRecord(parent: ReturnType<typeof create>, r: PCN874Record): void {
    const ele = (parent as any).ele('Record', { type: r.type });
    ele.ele('DocType').txt(r.doc_type).up()
       .ele('DocNum').txt(r.doc_num).up()
       .ele('DocDate').txt(r.doc_date).up()
       .ele('VatId').txt(r.vat_id || '').up()
       .ele('AmountNoVat').txt(r.amount_no_vat.toFixed(2)).up()
       .ele('Vat').txt(r.vat.toFixed(2)).up()
       .ele('Total').txt(r.total.toFixed(2)).up();
    if (r.allocation_num) {
      ele.ele('AllocationNum').txt(r.allocation_num).up();
    }
  }
}
