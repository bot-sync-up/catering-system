/**
 * יומן הנהלת חשבונות - CSV.
 * פורמט תואם לייבוא לתוכנות הח"ש הנפוצות בארץ (חשבשבת, ריבוע כחול וכו').
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType } from '../types';

export class JournalEntriesCsv extends BaseGenerator {
  readonly formType: ReportFormType = 'JOURNAL_ENTRIES';
  readonly fileExtension = 'csv';

  protected async render(ctx: GeneratorContext): Promise<string> {
    const lines = ctx.data.journalLines ?? [];
    const header = ['תאריך', 'חשבון', 'תיאור', 'חובה', 'זכות', 'אסמכתא'].join(',');
    const body = lines
      .map((l) =>
        [
          l.date,
          this.csvEscape(l.account),
          this.csvEscape(l.description),
          l.debit.toFixed(2),
          l.credit.toFixed(2),
          this.csvEscape(l.reference ?? ''),
        ].join(','),
      )
      .join('\n');

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const footer = `סה"כ,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)},`;

    // BOM כדי לתמוך בעברית באקסל
    return '﻿' + [header, body, footer].filter(Boolean).join('\n');
  }

  private csvEscape(value: string): string {
    if (/[",\n]/.test(value)) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
}
