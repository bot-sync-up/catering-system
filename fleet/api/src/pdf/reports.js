// יוצר PDF-ים: דוח חודשי, שנתי, ונסועה למס
// משתמש ב-pdfkit עם תמיכה ב-RTL בסיסי (היפוך טקסט)

import PDFDocument from 'pdfkit';
import { EXPENSE_TYPE_HE, PURPOSE_HE, FUEL_HE, formatDateHe, formatILS } from '../utils/hebrew.js';

// היפוך תווים כדי שיופיעו נכון בעברית (פיתרון בסיסי בלי שייפינג מלא)
function rev(s) {
  if (s == null) return '';
  // נשמר על מספרים מבחוץ — הופך רק את חלקי האותיות
  return String(s).split('').reverse().join('');
}

function sumByType(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.type] = (map[e.type] || 0) + (e.amount || 0);
  }
  return map;
}

function header(doc, title, vehicle) {
  doc.fontSize(18).text(rev(title), { align: 'right' });
  doc.moveDown(0.3);
  if (vehicle) {
    doc.fontSize(11).text(
      rev(`רכב: ${vehicle.plate} | ${vehicle.make} ${vehicle.model} (${vehicle.year}) | דלק: ${FUEL_HE[vehicle.fuel] || vehicle.fuel}`),
      { align: 'right' },
    );
    if (vehicle.driver) doc.text(rev(`נהג: ${vehicle.driver.name}`), { align: 'right' });
  }
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);
}

function tableHeader(doc, cols) {
  doc.fontSize(10).fillColor('#000');
  const y = doc.y;
  let x = 555;
  for (const c of cols) {
    x -= c.w;
    doc.text(rev(c.label), x, y, { width: c.w - 4, align: 'right' });
  }
  doc.moveDown(1);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
}

function tableRow(doc, cols, values) {
  const y = doc.y;
  let x = 555;
  for (let i = 0; i < cols.length; i++) {
    x -= cols[i].w;
    const v = values[i] ?? '';
    doc.fontSize(9).text(rev(v), x, y, { width: cols[i].w - 4, align: 'right' });
  }
  doc.moveDown(0.8);
}

function summaryBlock(doc, expenses, mileages) {
  const sums = sumByType(expenses);
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalKm = mileages.reduce((s, m) => s + (m.km || 0), 0);
  const businessKm = mileages.filter((m) => m.purpose === 'BUSINESS').reduce((s, m) => s + m.km, 0);
  doc.moveDown(0.5);
  doc.fontSize(13).text(rev('סיכום'), { align: 'right' });
  doc.moveDown(0.3);
  doc.fontSize(10);
  for (const [type, total] of Object.entries(sums)) {
    doc.text(rev(`${EXPENSE_TYPE_HE[type] || type}: ${formatILS(total)}`), { align: 'right' });
  }
  doc.moveDown(0.3);
  doc.fontSize(11).text(rev(`סך ההוצאות: ${formatILS(total)}`), { align: 'right' });
  doc.text(rev(`סך נסועה: ${totalKm.toLocaleString('he-IL')} ק"מ (עסקי: ${businessKm.toLocaleString('he-IL')})`), { align: 'right' });
}

export function generateMonthlyReport(stream, { vehicle, year, month, expenses, mileages }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Monthly ${vehicle.plate} ${year}-${month}` } });
  doc.pipe(stream);
  header(doc, `דוח חודשי — ${month}/${year}`, vehicle);

  doc.fontSize(13).text(rev('הוצאות'), { align: 'right' });
  doc.moveDown(0.3);
  const cols = [
    { label: 'תאריך', w: 80 },
    { label: 'סוג', w: 70 },
    { label: 'תיאור', w: 200 },
    { label: 'ספק', w: 90 },
    { label: 'סכום', w: 75 },
  ];
  tableHeader(doc, cols);
  for (const e of expenses) {
    tableRow(doc, cols, [
      formatDateHe(e.date),
      EXPENSE_TYPE_HE[e.type] || e.type,
      e.description || '',
      e.vendor || '',
      formatILS(e.amount),
    ]);
  }

  doc.moveDown(0.5);
  doc.fontSize(13).text(rev('נסועה'), { align: 'right' });
  doc.moveDown(0.3);
  const mCols = [
    { label: 'תאריך', w: 80 },
    { label: 'מטרה', w: 70 },
    { label: 'מ-', w: 130 },
    { label: 'אל', w: 130 },
    { label: 'ק"מ', w: 60 },
  ];
  tableHeader(doc, mCols);
  for (const m of mileages) {
    tableRow(doc, mCols, [
      formatDateHe(m.date),
      PURPOSE_HE[m.purpose] || m.purpose,
      m.origin || '',
      m.destination || '',
      String(m.km),
    ]);
  }

  summaryBlock(doc, expenses, mileages);
  doc.end();
}

export function generateAnnualReport(stream, { vehicle, year, expenses, mileages }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);
  header(doc, `דוח שנתי — ${year}`, vehicle);

  // חודש אחר חודש
  doc.fontSize(13).text(rev('פילוח לפי חודש'), { align: 'right' });
  doc.moveDown(0.3);
  const cols = [
    { label: 'חודש', w: 60 },
    { label: 'דלק', w: 90 },
    { label: 'טיפול', w: 90 },
    { label: 'תיקון', w: 90 },
    { label: 'אחר', w: 90 },
    { label: 'סה"כ', w: 95 },
  ];
  tableHeader(doc, cols);
  for (let m = 1; m <= 12; m++) {
    const inMonth = expenses.filter((e) => new Date(e.date).getMonth() === m - 1);
    const sumOf = (type) => inMonth.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);
    const fuel = sumOf('FUEL');
    const service = sumOf('SERVICE');
    const repair = sumOf('REPAIR');
    const total = inMonth.reduce((s, e) => s + e.amount, 0);
    const other = total - fuel - service - repair;
    tableRow(doc, cols, [
      String(m).padStart(2, '0'),
      formatILS(fuel),
      formatILS(service),
      formatILS(repair),
      formatILS(other),
      formatILS(total),
    ]);
  }

  summaryBlock(doc, expenses, mileages);
  doc.end();
}

export function generateMileageTaxReport(stream, { year, vehicle, mileages }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);
  header(doc, `דוח נסועה למס הכנסה — ${year}`, vehicle);
  doc.fontSize(10).text(rev('מסמך זה מסכם נסיעות לצורכי חישוב נכוי הוצאה למס.'), { align: 'right' });
  doc.moveDown(0.3);

  const cols = [
    { label: 'תאריך', w: 80 },
    { label: 'רכב', w: 90 },
    { label: 'מטרה', w: 70 },
    { label: 'מ-', w: 120 },
    { label: 'אל', w: 120 },
    { label: 'ק"מ', w: 60 },
  ];
  tableHeader(doc, cols);
  for (const m of mileages) {
    tableRow(doc, cols, [
      formatDateHe(m.date),
      m.vehicle?.plate || '',
      PURPOSE_HE[m.purpose] || m.purpose,
      m.origin || '',
      m.destination || '',
      String(m.km),
    ]);
  }

  const totalKm = mileages.reduce((s, m) => s + m.km, 0);
  const businessKm = mileages.filter((m) => m.purpose === 'BUSINESS').reduce((s, m) => s + m.km, 0);
  const privateKm = mileages.filter((m) => m.purpose === 'PRIVATE').reduce((s, m) => s + m.km, 0);
  const mixedKm = mileages.filter((m) => m.purpose === 'MIXED').reduce((s, m) => s + m.km, 0);
  doc.moveDown(0.5);
  doc.fontSize(13).text(rev('סיכום'), { align: 'right' });
  doc.fontSize(10);
  doc.text(rev(`עסקי: ${businessKm.toLocaleString('he-IL')} ק"מ`), { align: 'right' });
  doc.text(rev(`פרטי: ${privateKm.toLocaleString('he-IL')} ק"מ`), { align: 'right' });
  doc.text(rev(`מעורב: ${mixedKm.toLocaleString('he-IL')} ק"מ`), { align: 'right' });
  doc.fontSize(11).text(rev(`סה"כ: ${totalKm.toLocaleString('he-IL')} ק"מ`), { align: 'right' });
  doc.end();
}
