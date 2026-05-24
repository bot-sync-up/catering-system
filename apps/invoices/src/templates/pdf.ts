// PDF template — Hebrew RTL, VAT 17%, all document types.
// Uses pdfkit; relies on a Hebrew TTF (e.g. Open Sans Hebrew) registered as 'he'.
// In dev/test we fall back to Helvetica (Latin only) so output renders.
import PDFDocument from 'pdfkit';
import type { Document, DocumentItem, Installment, Organization, Customer } from '@prisma/client';
import { ils } from '../lib/money.js';

const TITLES: Record<string, string> = {
  QUOTE: 'הצעת מחיר',
  ORDER: 'הזמנת לקוח',
  PO: 'הזמנת רכש',
  PROFORMA: 'חשבונית עסקה',
  TAX_INVOICE: 'חשבונית מס',
  TAX_INVOICE_RECEIPT: 'חשבונית מס + קבלה',
  RECEIPT: 'קבלה',
  CREDIT_NOTE: 'חשבונית זיכוי',
};

export interface RenderInput {
  doc: Document & { items: DocumentItem[]; installments: Installment[] };
  org: Organization;
  customer: Customer;
  hebrewFontPath?: string;
}

export function renderDocumentPdf(input: RenderInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { doc, org, customer } = input;
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: { Title: `${TITLES[doc.type]} ${doc.number}` },
    });
    const buffers: Buffer[] = [];
    pdf.on('data', (b: Buffer) => buffers.push(b));
    pdf.on('end', () => resolve(Buffer.concat(buffers)));
    pdf.on('error', reject);

    if (input.hebrewFontPath) {
      pdf.registerFont('he', input.hebrewFontPath);
      pdf.font('he');
    }

    // Right-aligned header for RTL.
    const right = (text: string, y?: number, options?: any) => {
      const w = pdf.page.width - 80;
      pdf.text(text, 40, y ?? pdf.y, { width: w, align: 'right', ...options });
    };

    right(`${org.name}${org.legalName ? ' | ' + org.legalName : ''}`);
    if (org.taxId) right(`ח.פ ${org.taxId}`);
    if (org.address) right(org.address);
    if (org.phone) right(`טל׳ ${org.phone}`);
    pdf.moveDown(1);

    // Doc title + number + dates
    pdf.fontSize(18);
    right(`${TITLES[doc.type]} #${doc.number}`);
    pdf.fontSize(10);
    right(`תאריך הנפקה: ${doc.issueDate.toLocaleDateString('he-IL')}`);
    if (doc.dueDate) right(`תאריך פירעון: ${doc.dueDate.toLocaleDateString('he-IL')}`);
    if (doc.tag === 'UNOFFICIAL') right('* מסמך לא רשמי *');
    pdf.moveDown(1);

    // Customer block
    pdf.fontSize(12);
    right(`לכבוד: ${customer.name}`);
    if (customer.taxId) right(`ח.פ ${customer.taxId}`);
    if (customer.address) right(customer.address);
    pdf.moveDown(1);

    // Items table
    pdf.fontSize(11);
    right('פירוט:');
    pdf.moveDown(0.3);
    for (const it of doc.items) {
      const line = `${it.description} — ${Number(it.quantity)} × ${ils(Number(it.unitPrice))}` +
        (Number(it.discount) ? ` (הנחה ${(Number(it.discount) * 100).toFixed(0)}%)` : '') +
        ` = ${ils(Number(it.lineTotal))}`;
      right(line);
    }

    pdf.moveDown(1);

    // Totals
    right(`סכום לפני מע״מ: ${ils(Number(doc.subtotal))}`);
    right(`מע״מ ${(Number(doc.vatRate) * 100).toFixed(0)}%: ${ils(Number(doc.vatAmount))}`);
    pdf.fontSize(13);
    right(`סה״כ לתשלום: ${ils(Number(doc.total))}`);
    pdf.fontSize(10);
    right(`שולם: ${ils(Number(doc.paidAmount))}`);
    right(`יתרה: ${ils(Number(doc.balance))}`);

    // Installments (if any)
    if (doc.installments.length) {
      pdf.moveDown(1);
      right('לוח תשלומים:');
      for (const ins of doc.installments) {
        right(
          `${ins.seq}. ${ins.dueDate.toLocaleDateString('he-IL')} — ${ils(Number(ins.amount))}` +
          (ins.paid ? ' (שולם)' : ''),
        );
      }
    }

    if (doc.notes) {
      pdf.moveDown(1);
      right(`הערות: ${doc.notes}`);
    }

    pdf.end();
  });
}
