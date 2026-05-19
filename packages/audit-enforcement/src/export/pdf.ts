/**
 * exportAuditLogsPdf — ייצוא PDF עם RTL ופונט Heebo.
 *
 * שימוש ב-pdfkit (Node) — לקבל Buffer של PDF. הצרכן אחראי לטעון
 * את הפונט Heebo-Regular.ttf (חופשי, Google Fonts) ולספק path אליו.
 */
import PDFDocument from 'pdfkit';
import type { PrismaClient } from '@prisma/client';
import { searchAuditLogs, type AuditSearchQuery } from '../search/query';

export interface PdfExportOptions {
  /** path מוחלט ל-Heebo-Regular.ttf */
  hebrewFontPath: string;
  /** מקסימום שורות (ברירת מחדל: 5000) */
  maxRows?: number;
  /** כותרת הדוח */
  title?: string;
}

interface AuditLogRow {
  id: string;
  createdAt: Date;
  model: string;
  action: string;
  recordId: string | null;
  userId: string | null;
  role: string | null;
  tenantId: string | null;
  ip: string | null;
  channel: string;
  oldValues: unknown;
  newValues: unknown;
  hash: string;
}

export async function exportAuditLogsPdf(
  prisma: PrismaClient,
  query: AuditSearchQuery,
  options: PdfExportOptions,
): Promise<Buffer> {
  const maxRows = options.maxRows ?? 5000;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: options.title ?? 'דוח ביקורת',
      Author: 'audit-enforcement',
    },
  });

  // טעינת פונט עברי + הפעלת RTL
  doc.registerFont('Heebo', options.hebrewFontPath);
  doc.font('Heebo');

  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // כותרת ראשית
  doc.fontSize(18).text(options.title ?? 'דוח ביקורת', { align: 'right', features: ['rtla'] });
  doc.moveDown(0.5);
  doc.fontSize(10).text(
    `הופק בתאריך: ${new Date().toLocaleString('he-IL')}`,
    { align: 'right', features: ['rtla'] },
  );
  doc.moveDown(1);

  // כותרות עמודה
  const headers = ['תאריך', 'משתמש', 'מודל', 'פעולה', 'מזהה'];
  doc.fontSize(11).text(headers.join('   |   '), { align: 'right', features: ['rtla'] });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // שורות
  const pageSize = 500;
  let page = 1;
  let collected = 0;

  while (collected < maxRows) {
    const result = await searchAuditLogs<AuditLogRow>(prisma, {
      ...query,
      page,
      pageSize,
    });
    if (result.items.length === 0) break;
    for (const row of result.items) {
      const line =
        `${formatDate(row.createdAt)} | ${row.userId ?? '-'} | ${row.model} | ${row.action} | ${row.recordId ?? '-'}`;
      doc.fontSize(9).text(line, { align: 'right', features: ['rtla'] });
      collected++;
      if (collected >= maxRows) break;
      if (doc.y > 770) {
        doc.addPage();
      }
    }
    if (result.items.length < pageSize) break;
    page++;
  }

  doc.moveDown(1);
  doc.fontSize(9).text(`סה"כ שורות: ${collected}`, { align: 'right', features: ['rtla'] });

  doc.end();
  return done;
}

function formatDate(d: Date): string {
  return d.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
