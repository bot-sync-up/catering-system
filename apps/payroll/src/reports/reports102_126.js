/**
 * דוחות 102 (ניכויים מס הכנסה) ו-126 (ביטוח לאומי) חודשיים
 * Monthly tax authority reports - 102 (income tax) and 126 (bituach leumi)
 */

'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { rtlText, formatCurrency, monthName, formatDate } = require('./pdf-helpers');

function loadHebrewFont(doc) {
  const fontPaths = [
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];
  for (const fp of fontPaths) {
    try {
      if (fs.existsSync(fp)) {
        doc.registerFont('Hebrew', fp);
        doc.font('Hebrew');
        return;
      }
    } catch (_) {}
  }
}

/**
 * דוח 102 - דיווח ניכויים מס הכנסה ובריאות לרשות המסים
 */
function generateReport102({ year, month, employerName, payrollRecords }, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
      loadHebrewFont(doc);

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const PAGE_WIDTH = doc.page.width - 80;

      // חישוב סיכומים
      let totalGross = 0;
      let totalTaxable = 0;
      let totalIncomeTax = 0;
      let totalHealthTax = 0;
      const empCount = payrollRecords.length;

      for (const r of payrollRecords) {
        totalGross += r.summary.grossSalary;
        totalTaxable += r.summary.taxableIncome;
        const tax = r.deductions.find(d => d.type === 'INCOME_TAX')?.amount || 0;
        const health = r.deductions.find(d => d.type === 'HEALTH_TAX')?.amount || 0;
        totalIncomeTax += tax;
        totalHealthTax += health;
      }

      // כותרת
      doc.fontSize(20);
      doc.text(rtlText('דוח 102'), 40, 50, { width: PAGE_WIDTH, align: 'right' });
      doc.fontSize(13);
      doc.text(rtlText('דיווח ניכויים מס הכנסה ובריאות'), 40, 78, { width: PAGE_WIDTH, align: 'right' });
      doc.fontSize(11);
      doc.text(rtlText(`תקופה: ${monthName(month)} ${year}`), 40, 100, { width: PAGE_WIDTH, align: 'right' });
      doc.text(rtlText(`מעסיק: ${employerName || ''}`), 40, 116, { width: PAGE_WIDTH, align: 'right' });

      doc.moveTo(40, 140).lineTo(40 + PAGE_WIDTH, 140).stroke();

      // פירוט עובדים
      let y = 155;
      doc.fontSize(10);
      doc.text(rtlText('פירוט לפי עובד:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 16;

      // Header
      doc.fontSize(8);
      doc.rect(40, y, PAGE_WIDTH, 16).fillAndStroke('#dddddd', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('שם'),       40,  y + 3, { width: 100, align: 'center' });
      doc.text(rtlText('ת.ז.'),     150, y + 3, { width: 80,  align: 'center' });
      doc.text(rtlText('ברוטו'),    235, y + 3, { width: 70,  align: 'center' });
      doc.text(rtlText('חייב מס'),  310, y + 3, { width: 70,  align: 'center' });
      doc.text(rtlText('מס הכנסה'), 385, y + 3, { width: 75,  align: 'center' });
      doc.text(rtlText('בריאות'),   465, y + 3, { width: 70,  align: 'center' });
      y += 18;

      for (const r of payrollRecords) {
        const emp = r.employee || {};
        const tax = r.deductions.find(d => d.type === 'INCOME_TAX')?.amount || 0;
        const health = r.deductions.find(d => d.type === 'HEALTH_TAX')?.amount || 0;
        doc.text(rtlText(emp.fullName || ''), 40, y, { width: 100, align: 'center' });
        doc.text(emp.tz || '', 150, y, { width: 80, align: 'center' });
        doc.text(formatCurrency(r.summary.grossSalary), 235, y, { width: 70, align: 'center' });
        doc.text(formatCurrency(r.summary.taxableIncome), 310, y, { width: 70, align: 'center' });
        doc.text(formatCurrency(tax), 385, y, { width: 75, align: 'center' });
        doc.text(formatCurrency(health), 465, y, { width: 70, align: 'center' });
        y += 14;
        if (y > 740) { doc.addPage(); y = 40; }
      }

      // סיכום
      y += 10;
      doc.fontSize(11);
      doc.rect(40, y, PAGE_WIDTH, 22).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('סיכום דוח'), 40, y + 6, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 28;

      doc.fontSize(10);
      const summary = [
        `מספר עובדים: ${empCount}`,
        `סך ברוטו: ${formatCurrency(totalGross)} ש"ח`,
        `סך חייב במס: ${formatCurrency(totalTaxable)} ש"ח`,
        `סך מס הכנסה לתשלום: ${formatCurrency(totalIncomeTax)} ש"ח`,
        `סך מס בריאות לתשלום: ${formatCurrency(totalHealthTax)} ש"ח`,
        `סך הכל לתשלום לרשות המסים: ${formatCurrency(totalIncomeTax + totalHealthTax)} ש"ח`,
      ];
      for (const line of summary) {
        doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 16;
      }

      doc.fontSize(8);
      doc.fillColor('#888888');
      doc.text(rtlText(`הופק: ${formatDate(new Date())} | מערכת חישוב שכר`),
        40, doc.page.height - 50, { width: PAGE_WIDTH, align: 'center' });

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * דוח 126 - דיווח דמי ביטוח לאומי
 */
function generateReport126({ year, month, employerName, employerNumber, payrollRecords }, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
      loadHebrewFont(doc);

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const PAGE_WIDTH = doc.page.width - 80;

      // סיכומים
      let totalGross = 0;
      let totalBLEmp = 0;
      let totalBLEmpr = 0;
      let totalHealth = 0;

      for (const r of payrollRecords) {
        totalGross += r.summary.grossSalary;
        totalBLEmp += r.deductions.find(d => d.type === 'BITUACH_LEUMI' && !d.isEmployerContribution)?.amount || 0;
        totalBLEmpr += r.deductions.find(d => d.type === 'BITUACH_LEUMI' && d.isEmployerContribution)?.amount || 0;
        totalHealth += r.deductions.find(d => d.type === 'HEALTH_TAX')?.amount || 0;
      }

      // כותרת
      doc.fontSize(20);
      doc.text(rtlText('דוח 126'), 40, 50, { width: PAGE_WIDTH, align: 'right' });
      doc.fontSize(13);
      doc.text(rtlText('דיווח דמי ביטוח לאומי'), 40, 78, { width: PAGE_WIDTH, align: 'right' });
      doc.fontSize(11);
      doc.text(rtlText(`תקופה: ${monthName(month)} ${year}`), 40, 100, { width: PAGE_WIDTH, align: 'right' });
      doc.text(rtlText(`מעסיק: ${employerName || ''} | תיק ניכויים: ${employerNumber || ''}`),
        40, 116, { width: PAGE_WIDTH, align: 'right' });

      doc.moveTo(40, 140).lineTo(40 + PAGE_WIDTH, 140).stroke();

      let y = 155;
      doc.fontSize(10);
      doc.text(rtlText('פירוט לפי עובד:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 16;

      doc.fontSize(8);
      doc.rect(40, y, PAGE_WIDTH, 16).fillAndStroke('#dddddd', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('שם'),         40,  y + 3, { width: 100, align: 'center' });
      doc.text(rtlText('ת.ז.'),       150, y + 3, { width: 80,  align: 'center' });
      doc.text(rtlText('ברוטו'),      235, y + 3, { width: 70,  align: 'center' });
      doc.text(rtlText('ב.ל. עובד'),  310, y + 3, { width: 75,  align: 'center' });
      doc.text(rtlText('ב.ל. מעסיק'), 390, y + 3, { width: 75,  align: 'center' });
      doc.text(rtlText('בריאות'),     470, y + 3, { width: 65,  align: 'center' });
      y += 18;

      for (const r of payrollRecords) {
        const emp = r.employee || {};
        const blEmp = r.deductions.find(d => d.type === 'BITUACH_LEUMI' && !d.isEmployerContribution)?.amount || 0;
        const blEmpr = r.deductions.find(d => d.type === 'BITUACH_LEUMI' && d.isEmployerContribution)?.amount || 0;
        const health = r.deductions.find(d => d.type === 'HEALTH_TAX')?.amount || 0;

        doc.text(rtlText(emp.fullName || ''), 40, y, { width: 100, align: 'center' });
        doc.text(emp.tz || '', 150, y, { width: 80, align: 'center' });
        doc.text(formatCurrency(r.summary.grossSalary), 235, y, { width: 70, align: 'center' });
        doc.text(formatCurrency(blEmp), 310, y, { width: 75, align: 'center' });
        doc.text(formatCurrency(blEmpr), 390, y, { width: 75, align: 'center' });
        doc.text(formatCurrency(health), 470, y, { width: 65, align: 'center' });
        y += 14;
        if (y > 740) { doc.addPage(); y = 40; }
      }

      y += 10;
      doc.fontSize(11);
      doc.rect(40, y, PAGE_WIDTH, 22).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('סיכום דוח'), 40, y + 6, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 28;

      doc.fontSize(10);
      const total = totalBLEmp + totalBLEmpr + totalHealth;
      const lines = [
        `מספר עובדים: ${payrollRecords.length}`,
        `סך ברוטו: ${formatCurrency(totalGross)} ש"ח`,
        `סך ביטוח לאומי - חלק עובד: ${formatCurrency(totalBLEmp)} ש"ח`,
        `סך ביטוח לאומי - חלק מעסיק: ${formatCurrency(totalBLEmpr)} ש"ח`,
        `סך מס בריאות: ${formatCurrency(totalHealth)} ש"ח`,
        `סך הכל לתשלום למוסד לביטוח לאומי: ${formatCurrency(total)} ש"ח`,
      ];
      for (const line of lines) {
        doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 16;
      }

      doc.fontSize(8);
      doc.fillColor('#888888');
      doc.text(rtlText(`הופק: ${formatDate(new Date())} | מערכת חישוב שכר`),
        40, doc.page.height - 50, { width: PAGE_WIDTH, align: 'center' });

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateReport102,
  generateReport126,
};
