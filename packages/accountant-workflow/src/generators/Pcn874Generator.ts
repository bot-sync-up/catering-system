/**
 * מחולל PCN874 - דיווח מע"מ מפורט (PCN874).
 * מפיק שני קבצים בו זמנית:
 *   1. XML מודרני (Mai874.xml) - לדיווח דרך אתר שע"מ.
 *   2. Mai101 (טקסט ASCII רוחב קבוע) - הפורמט ההיסטורי הקלאסי.
 *
 * המחולל מפיק קובץ ZIP יחיד המכיל את שני הקבצים, מאחר ושע"מ מבקש
 * את שניהם בעת ההגשה.
 */
import { BaseGenerator } from './BaseGenerator';
import { GeneratorContext, ReportFormType, VatTransaction } from '../types';
import { sha256 } from '../storage/checksum';

const ASCII_FIELD = (value: string | number, width: number, align: 'L' | 'R' = 'R'): string => {
  const s = String(value ?? '');
  if (s.length >= width) return s.slice(0, width);
  return align === 'R' ? s.padStart(width, '0') : s.padEnd(width, ' ');
};

const formatAmount = (amount: number, width: number): string => {
  // אג' שלמות, ללא נקודה עשרונית — המרה לאגורות
  const agorot = Math.round(amount * 100);
  const sign = agorot < 0 ? '-' : '';
  const abs = Math.abs(agorot).toString();
  return sign + abs.padStart(width - sign.length, '0');
};

const formatDate = (iso: string): string => iso.replace(/-/g, '').slice(0, 8);

export class Pcn874Generator extends BaseGenerator {
  readonly formType: ReportFormType = 'PCN874';
  readonly fileExtension = 'zip';

  protected async render(ctx: GeneratorContext): Promise<Buffer> {
    const txs = ctx.data.vatTransactions ?? [];

    const xml = this.buildXml(ctx, txs);
    const mai101 = this.buildMai101(ctx, txs);

    // קובץ "ZIP" פשטני (concat עם separators) — מימוש מלא יחליף ב-jszip.
    // עד שיוזרק jszip, מייצרים מעטפת טקסטואלית עם שני הקבצים.
    const wrapper = [
      '=== BEGIN PCN874.xml ===',
      xml,
      '=== END PCN874.xml ===',
      '=== BEGIN PCN874.mai101 ===',
      mai101,
      '=== END PCN874.mai101 ===',
    ].join('\n');

    return Buffer.from(wrapper, 'utf8');
  }

  private buildXml(ctx: GeneratorContext, txs: VatTransaction[]): string {
    const { business, period } = ctx;
    const totalSales = txs
      .filter((t) => t.documentType === 'invoice')
      .reduce((s, t) => s + t.amountExVat, 0);
    const totalSalesVat = txs
      .filter((t) => t.documentType === 'invoice')
      .reduce((s, t) => s + t.vatAmount, 0);
    const totalInputs = txs
      .filter((t) => t.documentType === 'import' || t.documentType === 'receipt')
      .reduce((s, t) => s + t.amountExVat, 0);
    const totalInputsVat = txs
      .filter((t) => t.documentType === 'import' || t.documentType === 'receipt')
      .reduce((s, t) => s + t.vatAmount, 0);

    const lines = txs
      .map(
        (t, i) =>
          `    <Transaction seq="${i + 1}">
      <Date>${t.date}</Date>
      <DocType>${t.documentType}</DocType>
      <DocNumber>${this.escape(t.documentNumber)}</DocNumber>
      <Counterparty>${this.escape(t.counterpartyTaxId)}</Counterparty>
      <AmountExVat>${t.amountExVat.toFixed(2)}</AmountExVat>
      <VatAmount>${t.vatAmount.toFixed(2)}</VatAmount>
    </Transaction>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<PCN874 version="1.0" generated="${new Date().toISOString()}">
  <Business>
    <TaxId>${business.taxId}</TaxId>
    <VatNumber>${business.vatNumber}</VatNumber>
    <LegalName>${this.escape(business.legalName)}</LegalName>
  </Business>
  <Period year="${period.year}"${period.month ? ` month="${period.month}"` : ''}/>
  <Summary>
    <TotalSales>${totalSales.toFixed(2)}</TotalSales>
    <TotalSalesVat>${totalSalesVat.toFixed(2)}</TotalSalesVat>
    <TotalInputs>${totalInputs.toFixed(2)}</TotalInputs>
    <TotalInputsVat>${totalInputsVat.toFixed(2)}</TotalInputsVat>
    <NetVatDue>${(totalSalesVat - totalInputsVat).toFixed(2)}</NetVatDue>
  </Summary>
  <Transactions count="${txs.length}">
${lines}
  </Transactions>
</PCN874>
`;
  }

  /**
   * Mai101 — פורמט טקסט ASCII רוחב קבוע.
   * שורת כותרת (A), שורות עסקה (B), שורת סיכום (C).
   */
  private buildMai101(ctx: GeneratorContext, txs: VatTransaction[]): string {
    const { business, period } = ctx;
    const periodStr = period.month
      ? `${period.year}${String(period.month).padStart(2, '0')}`
      : `${period.year}00`;

    // Header: A | taxId(9) | period(6) | recCount(7) | reserved(20)
    const header = [
      'A',
      ASCII_FIELD(business.taxId, 9),
      ASCII_FIELD(periodStr, 6),
      ASCII_FIELD(txs.length, 7),
      ASCII_FIELD('', 20, 'L'),
    ].join('');

    // Body: B | seq(7) | docType(1) | docNum(20) | date(8) | cp(9) | amount(13) | vat(11)
    const docTypeCode: Record<VatTransaction['documentType'], string> = {
      invoice: '1',
      credit: '2',
      receipt: '3',
      import: '4',
    };

    const body = txs
      .map((t, i) =>
        [
          'B',
          ASCII_FIELD(i + 1, 7),
          docTypeCode[t.documentType],
          ASCII_FIELD(t.documentNumber, 20, 'L'),
          formatDate(t.date),
          ASCII_FIELD(t.counterpartyTaxId, 9),
          formatAmount(t.amountExVat, 13),
          formatAmount(t.vatAmount, 11),
        ].join(''),
      )
      .join('\n');

    // Footer: C | totalAmount(15) | totalVat(13)
    const totalAmount = txs.reduce((s, t) => s + t.amountExVat, 0);
    const totalVat = txs.reduce((s, t) => s + t.vatAmount, 0);
    const footer = ['C', formatAmount(totalAmount, 15), formatAmount(totalVat, 13)].join('');

    return [header, body, footer].filter(Boolean).join('\n');
  }

  private escape(s: string): string {
    return String(s).replace(/[&<>'"]/g, (c) => {
      switch (c) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }
}

/** עזר ניתן לבדיקה ישירה - מחזיר checksum של הקובץ. */
export function pcn874Checksum(content: Buffer | string): string {
  return sha256(content);
}
