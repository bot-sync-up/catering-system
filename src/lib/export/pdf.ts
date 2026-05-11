import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export interface PdfTable {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Generate a basic PDF report (RTL Hebrew) and return the buffer.
 * Uses pdfkit. For Hebrew text in production, register a Hebrew font (e.g. NotoSansHebrew).
 */
export function buildPdf(opts: {
  title: string;
  subtitle?: string;
  tables: PdfTable[];
  font?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.pipe(stream);

    if (opts.font) doc.font(opts.font);

    // Header
    doc.fontSize(20).text(opts.title, { align: 'right', features: ['rtla'] as any });
    if (opts.subtitle) {
      doc.moveDown(0.3).fontSize(12).fillColor('#666')
        .text(opts.subtitle, { align: 'right' });
    }
    doc.moveDown(1).fillColor('#000');

    for (const table of opts.tables) {
      doc.fontSize(14).text(table.title, { align: 'right' });
      doc.moveDown(0.5);

      const colWidth = (doc.page.width - 80) / table.headers.length;
      const startY = doc.y;
      doc.fontSize(10).fillColor('#333');

      // Headers
      table.headers.forEach((h, i) => {
        doc.rect(40 + i * colWidth, startY, colWidth, 20)
          .fillAndStroke('#E0E7FF', '#999');
        doc.fillColor('#000').text(h, 40 + i * colWidth + 4, startY + 6, {
          width: colWidth - 8, align: 'right',
        });
      });
      let y = startY + 22;

      // Rows
      for (const row of table.rows) {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 40;
        }
        row.forEach((cell, i) => {
          doc.rect(40 + i * colWidth, y, colWidth, 18).stroke('#CCC');
          doc.fillColor('#000').fontSize(9).text(String(cell), 40 + i * colWidth + 4, y + 4, {
            width: colWidth - 8, align: 'right',
          });
        });
        y += 20;
      }
      doc.y = y + 10;
      doc.moveDown(1);
    }

    doc.end();
  });
}
