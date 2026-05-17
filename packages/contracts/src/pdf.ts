import PDFDocument from 'pdfkit';
import type { Contract } from './types.js';
import { getTemplate, renderTemplate } from './templates.js';

export interface BuildPdfOptions {
  contract: Contract;
  /** Optional override of body (e.g. when client edited). */
  bodyOverride?: string;
  /** Optional Hebrew font path (TTF). Falls back to Helvetica which lacks Hebrew. */
  fontPath?: string;
}

/**
 * Build a contract PDF buffer. RTL Hebrew layout.
 * Note: Hebrew rendering requires a Hebrew font file (e.g., Heebo.ttf).
 * In production, ship the font with the lambda/server.
 */
export async function buildContractPdf(opts: BuildPdfOptions): Promise<Buffer> {
  const { contract, bodyOverride, fontPath } = opts;
  const tpl = getTemplate(contract.templateId);
  if (!tpl) throw new Error(`Template not found: ${contract.templateId}`);

  const body = bodyOverride ?? renderTemplate(tpl.body, contract);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: contract.title,
        Author: contract.provider.name,
        Subject: tpl.title,
        Keywords: 'contract,חוזה',
        CreationDate: new Date(contract.createdAt),
      },
    });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (fontPath) {
      try {
        doc.font(fontPath);
      } catch {
        // ignore — Hebrew chars will likely not render
      }
    }

    // Title
    doc.fontSize(20).text(contract.title, { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(
      `מספר חוזה: ${contract.id} | תאריך: ${new Date(contract.createdAt).toLocaleDateString('he-IL')}`,
      { align: 'right' },
    );
    doc.moveDown(1);

    // Parties block
    doc.fillColor('#000').fontSize(12);
    doc.text('הצדדים:', { align: 'right', underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`ספק: ${contract.provider.name} | ${contract.provider.email} | ${contract.provider.phone}`, { align: 'right' });
    doc.text(`לקוח: ${contract.client.name} | ${contract.client.email} | ${contract.client.phone}`, { align: 'right' });
    doc.moveDown(1);

    // Body
    doc.fontSize(11).text(body, { align: 'right', lineGap: 4 });
    doc.moveDown(1.5);

    // Financial summary
    doc.fontSize(11).text(`סה"כ: ${contract.totalAmount.toLocaleString('he-IL')} ${contract.currency}`, { align: 'right' });
    doc.moveDown(0.5);
    if (contract.effectiveFrom) doc.text(`מתאריך: ${new Date(contract.effectiveFrom).toLocaleDateString('he-IL')}`, { align: 'right' });
    if (contract.effectiveTo) doc.text(`עד תאריך: ${new Date(contract.effectiveTo).toLocaleDateString('he-IL')}`, { align: 'right' });
    doc.moveDown(2);

    // Signature
    if (contract.signedAt && contract.signatureDataUrl?.startsWith('data:image/')) {
      try {
        const base64 = contract.signatureDataUrl.split(',')[1];
        const sigBuf = Buffer.from(base64, 'base64');
        doc.image(sigBuf, doc.page.width - 220, doc.y, { width: 160 });
        doc.moveDown(7);
      } catch {
        // ignore signature failure
      }
      doc.fontSize(9).fillColor('#555').text(
        `נחתם דיגיטלית ב-${new Date(contract.signedAt).toLocaleString('he-IL')}${contract.signedIp ? ` מ-${contract.signedIp}` : ''}`,
        { align: 'right' },
      );
    } else {
      doc.fontSize(10).fillColor('#999').text('______________________   חתימת הלקוח', { align: 'right' });
    }

    doc.end();
  });
}
