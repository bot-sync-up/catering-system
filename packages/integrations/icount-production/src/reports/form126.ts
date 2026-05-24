/**
 * form126.ts — טופס 126 שנתי
 *
 * טופס 126 הוא דוח שנתי על תשלומי שכר ותלושי משכורת
 * שמעביד מגיש לרשות המסים.
 *
 * הטופס כולל פירוט לכל עובד:
 *   - ת.ז.
 *   - שם מלא
 *   - סך שכר ברוטו
 *   - מס הכנסה שנוכה
 *   - ביטוח לאומי
 *   - מס בריאות
 *
 * הטופס מוגש כקובץ טקסט קבוע-רוחב בפורמט של רשות המסים.
 */

import { Form126Entry } from '../types';
import { APPROVED_SOFTWARE_NUMBER } from '../compliance/software1346';

export interface Form126Report {
  year: number;
  employer_vat_id: string;
  employer_name: string;
  deduction_file_num?: string;   // תיק ניכויים
  entries: Form126Entry[];
}

export class Form126Generator {
  /**
   * מייצר את הטופס כקובץ טקסט קבוע-רוחב
   */
  generateText(report: Form126Report): string {
    this.validate(report);
    const lines: string[] = [];

    // Header
    lines.push(this.headerLine(report));

    // Per-employee lines
    for (const e of report.entries) {
      lines.push(this.employeeLine(e));
    }

    // Summary
    lines.push(this.summaryLine(report));

    return lines.join('\r\n');
  }

  /**
   * מייצר ב-JSON לבדיקה ידנית
   */
  generateJson(report: Form126Report): object {
    this.validate(report);
    const summary = this.summarize(report.entries);
    return {
      form: '126',
      software: APPROVED_SOFTWARE_NUMBER,
      year: report.year,
      employer: {
        vat_id: report.employer_vat_id,
        name: report.employer_name,
        deduction_file_num: report.deduction_file_num,
      },
      employees_count: report.entries.length,
      entries: report.entries,
      summary,
    };
  }

  private headerLine(r: Form126Report): string {
    // H | year(4) | employer_id(9) | software(8)
    const yr = String(r.year);
    const vat = (r.employer_vat_id || '').padStart(9, '0');
    const sw = APPROVED_SOFTWARE_NUMBER.padStart(8, '0');
    return `H${yr}${vat}${sw}`;
  }

  private employeeLine(e: Form126Entry): string {
    // E | id(9) | name(50) | salary(13) | tax(13) | ni(13) | health(13)
    const id = (e.employee_id || '').padStart(9, '0');
    const name = e.full_name.padEnd(50, ' ').substring(0, 50);
    const salary = String(Math.round(e.total_salary * 100)).padStart(13, '0');
    const tax = String(Math.round(e.total_tax * 100)).padStart(13, '0');
    const ni = String(Math.round(e.total_ni * 100)).padStart(13, '0');
    const health = String(Math.round(e.total_health * 100)).padStart(13, '0');
    return `E${id}${name}${salary}${tax}${ni}${health}`;
  }

  private summaryLine(r: Form126Report): string {
    const s = this.summarize(r.entries);
    const count = String(r.entries.length).padStart(6, '0');
    const totSal = String(Math.round(s.totalSalary * 100)).padStart(15, '0');
    const totTax = String(Math.round(s.totalTax * 100)).padStart(15, '0');
    const totNi = String(Math.round(s.totalNi * 100)).padStart(15, '0');
    const totHealth = String(Math.round(s.totalHealth * 100)).padStart(15, '0');
    return `S${count}${totSal}${totTax}${totNi}${totHealth}`;
  }

  private summarize(entries: Form126Entry[]) {
    return entries.reduce(
      (acc, e) => ({
        totalSalary: acc.totalSalary + e.total_salary,
        totalTax: acc.totalTax + e.total_tax,
        totalNi: acc.totalNi + e.total_ni,
        totalHealth: acc.totalHealth + e.total_health,
      }),
      { totalSalary: 0, totalTax: 0, totalNi: 0, totalHealth: 0 },
    );
  }

  validate(report: Form126Report): void {
    if (!report.year) throw new Error('Form126: year required');
    if (!report.employer_vat_id) throw new Error('Form126: employer_vat_id required');
    if (!report.employer_name) throw new Error('Form126: employer_name required');
    if (!Array.isArray(report.entries)) throw new Error('Form126: entries must be array');
    for (let i = 0; i < report.entries.length; i++) {
      const e = report.entries[i];
      if (!e.employee_id || !/^\d{5,9}$/.test(e.employee_id)) {
        throw new Error(`Form126: entry ${i}: invalid employee_id (ת.ז.)`);
      }
      if (!e.full_name) throw new Error(`Form126: entry ${i}: full_name required`);
      if (typeof e.total_salary !== 'number') throw new Error(`Form126: entry ${i}: total_salary`);
    }
  }
}
