import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { AuditQueryResult } from '../api/auditQuery';

/**
 * Streams the audit query result as a PDF.
 *
 * Hebrew rendering note: PDFKit's default fonts cannot render Hebrew. For
 * production, ship a Hebrew-capable TTF (e.g. Noto Sans Hebrew) under
 * `assets/fonts/` and register it with `doc.registerFont`. The path is
 * configurable via the AUDIT_PDF_FONT env var.
 */
export function streamAuditPdf(res: Response, data: AuditQueryResult, filename = 'audit-log.pdf'): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 36, layout: 'landscape' });
  const fontPath = process.env.AUDIT_PDF_FONT;
  if (fontPath) {
    try {
      doc.registerFont('hebrew', fontPath);
      doc.font('hebrew');
    } catch {
      // fall back to default if the font path is bad
    }
  }
  doc.pipe(res);

  doc.fontSize(16).text('Audit Log Export', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(
    `Exported: ${new Date().toISOString()}   Rows: ${data.rows.length} / ${data.total}`,
    { align: 'center' },
  );
  doc.moveDown(1);

  for (const r of data.rows) {
    doc
      .fontSize(9)
      .text(
        `[${r.timestamp.toISOString()}] ${r.action} ${r.entityType}${
          r.entityId ? `#${r.entityId}` : ''
        } user=${r.userId ?? '-'} ip=${r.ip ?? '-'}`,
      );
    if (r.oldValues || r.newValues) {
      doc
        .fontSize(8)
        .fillColor('#444')
        .text(
          `   old=${JSON.stringify(r.oldValues ?? {})}  new=${JSON.stringify(r.newValues ?? {})}`,
        )
        .fillColor('black');
    }
    doc.moveDown(0.25);
  }
  doc.end();
}
