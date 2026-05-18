/**
 * עזרים ל-PDF עברית RTL
 * Hebrew RTL PDF helpers
 */

'use strict';

/**
 * הופך מחרוזת עברית כדי שתודפס נכון ב-PDFKit
 * (PDFKit לא תומך ב-RTL מולדת, לכן נדרש היפוך ידני)
 */
function rtlText(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  // היפוך פשוט: שומר על מילים אך הופך כיווניות
  // לטקסט מעורב עברית-מספרים-אנגלית, הופכים את כל הטקסט
  // ושומרים על מספרים בכיוון הנכון
  return reverseHebrew(s);
}

function reverseHebrew(str) {
  // היפוך כל המחרוזת אך שמירה על קטעים של ספרות/לטינית בכיוון המקורי
  const tokens = [];
  let buffer = '';
  let bufferIsAscii = false;

  const isAscii = (ch) => {
    const c = ch.charCodeAt(0);
    return (c >= 0x20 && c <= 0x7E) && !/[֐-׿]/.test(ch);
  };

  for (const ch of str) {
    const ascii = isAscii(ch) && /[A-Za-z0-9.,\-+()/:%₪$]/.test(ch);
    if (buffer === '') {
      buffer = ch;
      bufferIsAscii = ascii;
    } else if (ascii === bufferIsAscii) {
      buffer += ch;
    } else {
      tokens.push({ text: buffer, ascii: bufferIsAscii });
      buffer = ch;
      bufferIsAscii = ascii;
    }
  }
  if (buffer) tokens.push({ text: buffer, ascii: bufferIsAscii });

  // להפוך את סדר הטוקנים, ולהפוך טקסט עברי, אך לשמר טוקני ASCII כפי שהם
  const reversed = tokens
    .reverse()
    .map(t => t.ascii ? t.text : t.text.split('').reverse().join(''))
    .join('');
  return reversed;
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
  const n = Number(amount);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthName(month) {
  const names = [
    '', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];
  return names[month] || '';
}

function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

module.exports = {
  rtlText,
  reverseHebrew,
  formatCurrency,
  monthName,
  formatDate,
};
