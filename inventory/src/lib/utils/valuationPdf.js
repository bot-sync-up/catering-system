'use strict';
/** דו"ח שערוך מלאי PDF (סוף שנה) — RTL בעברית */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { valuationCurrent } = require('../services/inventory');

/** מנסה לטעון פונט עברי. נופל ל-Helvetica אם אין */
function pickFont(doc) {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'public', 'fonts', 'NotoSansHebrew-Regular.ttf'),
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\david.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        doc.registerFont('heb', p);
        return 'heb';
      }
    } catch (_) {}
  }
  return 'Helvetica';
}

/** היפוך מחרוזת עברית פשוט עבור pdfkit (שאינו תומך RTL גנרי) */
function rtl(s) {
  if (!s) return '';
  // החזר מחרוזת בכיוון הפוך כדי שתופיע נכון בקובץ. ספרות לטיניות נשארות כפי שהן.
  // (פתרון בסיסי; לטקסט מעורב מלא נדרש Bidi מלא.)
  return String(s).split('').reverse().join('');
}

async function buildValuationPdf({ asOfDate = null, title = 'שערוך מלאי' } = {}) {
  const rows = valuationCurrent(asOfDate);
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));
  const done = new Promise((res) => doc.on('end', () => res(Buffer.concat(buffers))));

  const font = pickFont(doc);
  doc.font(font);

  doc.fontSize(18).text(rtl(title), { align: 'right' });
  doc.fontSize(10).text(rtl('תאריך: ' + (asOfDate || new Date().toISOString().slice(0, 10))), { align: 'right' });
  doc.moveDown(0.5);

  // כותרות עמודות (מימין לשמאל)
  const headers = ['#', 'מק"ט', 'שם', 'יח׳', 'מיקום', 'כמות', 'עלות יח׳', 'שווי'];
  // נצייר טבלה פשוטה משמאל לימין במשמעות הקובץ; הטקסט עצמו הפוך לתצוגה
  const colWidths = [25, 60, 140, 35, 70, 60, 60, 70];
  let x = 30, y = doc.y + 10;
  doc.fontSize(10);
  for (let i = 0; i < headers.length; i++) {
    doc.text(rtl(headers[i]), x, y, { width: colWidths[i], align: 'right' });
    x += colWidths[i];
  }
  y += 16;
  doc.moveTo(30, y).lineTo(565, y).stroke();
  y += 4;

  let total = 0;
  let i = 1;
  for (const r of rows) {
    if (y > 800) { doc.addPage(); y = 40; }
    const value = (r.qty || 0) * (r.value && r.qty ? (r.value / r.qty) : 0);
    const unitCost = r.qty ? (r.value || 0) / r.qty : 0;
    total += r.value || 0;
    const cells = [
      String(i),
      r.sku || '',
      r.name || '',
      r.unit || '',
      r.location_name || '',
      Number(r.qty || 0).toFixed(3),
      unitCost.toFixed(2),
      Number(r.value || 0).toFixed(2),
    ];
    let cx = 30;
    for (let k = 0; k < cells.length; k++) {
      const text = (k === 0 || k >= 5) ? cells[k] : rtl(cells[k]);
      doc.text(text, cx, y, { width: colWidths[k], align: 'right' });
      cx += colWidths[k];
    }
    y += 14;
    i++;
  }
  y += 6;
  doc.moveTo(30, y).lineTo(565, y).stroke();
  y += 6;
  doc.fontSize(12).text(rtl(`סה"כ שווי מלאי: ${total.toFixed(2)} ש"ח`), 30, y, { align: 'right', width: 535 });

  doc.end();
  return done;
}

module.exports = { buildValuationPdf };
