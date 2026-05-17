'use strict';
/** יצירת ברקודים והדפסה ל-PDF (A4) */

const bwipjs = require('bwip-js');
const PDFDocument = require('pdfkit');

/** יצירת קוד EAN-13 חוקי מ-12 ספרות בסיס (ספרת ביקורת מחושבת) */
function eanFromBase(base12) {
  const digits = String(base12).padStart(12, '0').slice(0, 12).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return digits.join('') + String(check);
}

/** יצירת ברקוד למוצר חדש לפי ID (prefix 200 = פנימי) */
function generateBarcodeForProductId(id) {
  const base = '200' + String(id).padStart(9, '0');
  return eanFromBase(base);
}

/** יצירת תמונת ברקוד PNG buffer */
async function renderBarcodePng(text, opts = {}) {
  return bwipjs.toBuffer({
    bcid: opts.bcid || 'ean13',
    text,
    scale: opts.scale || 3,
    height: opts.height || 12,
    includetext: true,
    textxalign: 'center',
  });
}

/**
 * הדפסת מדבקות ברקוד על דף A4.
 * grid: 5 עמודות × 13 שורות = 65 מדבקות.
 * @param {Array<{barcode:string,name:string,sku:string}>} items
 * @returns Promise<Buffer>
 */
async function buildBarcodeSheetPdf(items) {
  const doc = new PDFDocument({ size: 'A4', margin: 20 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));
  const done = new Promise((res) => doc.on('end', () => res(Buffer.concat(buffers))));

  const cols = 5;
  const labelW = (595 - 40) / cols; // ~111
  const labelH = 80;
  const rows = Math.floor((842 - 40) / labelH);
  const perPage = cols * rows;

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const idx = i % perPage;
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const x = 20 + c * labelW;
    const y = 20 + r * labelH;
    const it = items[i];
    try {
      const png = await renderBarcodePng(it.barcode, { scale: 2, height: 10 });
      doc.image(png, x + 5, y + 4, { fit: [labelW - 10, labelH - 24] });
    } catch (e) {
      doc.fontSize(8).text('שגיאה', x + 5, y + 10);
    }
    doc.fontSize(7).text(`${it.name} (${it.sku})`, x + 2, y + labelH - 16, {
      width: labelW - 4, align: 'center', lineBreak: false,
    });
  }
  doc.end();
  return done;
}

module.exports = {
  eanFromBase,
  generateBarcodeForProductId,
  renderBarcodePng,
  buildBarcodeSheetPdf,
};
