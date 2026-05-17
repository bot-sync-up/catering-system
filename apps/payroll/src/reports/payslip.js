/**
 * תלוש שכר חודשי - PDF בעברית RTL
 * Monthly Payslip PDF generator (Hebrew RTL)
 */

'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { rtlText, formatCurrency, monthName, formatDate } = require('./pdf-helpers');

/**
 * מחולל תלוש שכר PDF
 * @param {Object} payrollRecord
 * @param {string} outputPath
 * @returns {Promise<string>} - נתיב הקובץ שנוצר
 */
function generatePayslip(payrollRecord, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: {
          Title: `Payslip ${payrollRecord.year}-${payrollRecord.month}`,
          Author: 'Payroll System',
        },
      });

      // נסה לטעון פונט עברי אם קיים
      const fontPaths = [
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      ];
      let fontLoaded = false;
      for (const fp of fontPaths) {
        try {
          if (fs.existsSync(fp)) {
            doc.registerFont('Hebrew', fp);
            doc.font('Hebrew');
            fontLoaded = true;
            break;
          }
        } catch (_) { /* ignore */ }
      }

      // ודא שהתיקייה קיימת
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const employee = payrollRecord.employee || {};
      const summary = payrollRecord.summary;

      const PAGE_WIDTH = doc.page.width - 80;
      const RIGHT = doc.page.width - 40;

      // ============ כותרת ============
      doc.fontSize(20);
      const title = rtlText('תלוש שכר');
      doc.text(title, 40, 50, { width: PAGE_WIDTH, align: 'right' });

      doc.fontSize(14);
      const period = rtlText(`חודש ${monthName(payrollRecord.month)} ${payrollRecord.year}`);
      doc.text(period, 40, 75, { width: PAGE_WIDTH, align: 'right' });

      // קו מפריד
      doc.moveTo(40, 100).lineTo(RIGHT, 100).stroke();

      // ============ פרטי עובד ============
      doc.fontSize(11);
      let y = 115;
      const labelEmp = rtlText('פרטי עובד:');
      doc.text(labelEmp, 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 18;

      const empLines = [
        `שם: ${employee.fullName || ''}`,
        `ת.ז.: ${employee.tz || ''}`,
        `מספר עובד: ${employee.id || ''}`,
        `תפקיד: ${employee.position || ''}`,
        `מחלקה: ${employee.department || ''}`,
        `תאריך תחילת עבודה: ${formatDate(employee.startDate)}`,
      ];
      doc.fontSize(10);
      for (const line of empLines) {
        doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 14;
      }

      y += 10;
      doc.moveTo(40, y).lineTo(RIGHT, y).stroke();
      y += 10;

      // ============ פירוט הכנסות ============
      doc.fontSize(12);
      doc.text(rtlText('פירוט הכנסות:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 18;

      // טבלה: סכום | שיעור | כמות | תיאור
      doc.fontSize(9);
      // Header
      const colSum = 90;
      const colRate = 180;
      const colQty = 270;
      const colDesc = 350;
      const headerY = y;
      doc.rect(40, headerY, PAGE_WIDTH, 18).fillAndStroke('#dddddd', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('סכום'), colSum - 30, headerY + 4, { width: 60, align: 'center' });
      doc.text(rtlText('שיעור'), colRate - 30, headerY + 4, { width: 60, align: 'center' });
      doc.text(rtlText('כמות'), colQty - 30, headerY + 4, { width: 60, align: 'center' });
      doc.text(rtlText('תיאור'), colDesc - 30, headerY + 4, { width: 200, align: 'right' });
      y += 20;

      for (const item of payrollRecord.items) {
        doc.fontSize(9);
        doc.text(formatCurrency(item.amount), colSum - 30, y, { width: 60, align: 'center' });
        doc.text(formatCurrency(item.rate), colRate - 30, y, { width: 60, align: 'center' });
        doc.text(String(item.quantity), colQty - 30, y, { width: 60, align: 'center' });
        doc.text(rtlText(item.description || ''), colDesc - 30, y, { width: 200, align: 'right' });
        y += 14;
        if (y > 720) { doc.addPage(); y = 40; }
      }

      // סיכום ברוטו
      y += 5;
      doc.fontSize(10);
      doc.rect(40, y, PAGE_WIDTH, 18).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('#000000');
      const grossLine = `סך ברוטו: ${formatCurrency(summary.grossSalary)} ש"ח`;
      doc.text(rtlText(grossLine), 40, y + 4, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 25;

      // ============ ניכויים - עובד ============
      doc.fontSize(12);
      doc.text(rtlText('ניכויים מעובד:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 18;

      const employeeDeductions = payrollRecord.deductions.filter(d => !d.isEmployerContribution);
      doc.fontSize(9);
      for (const d of employeeDeductions) {
        doc.text(formatCurrency(d.amount), colSum - 30, y, { width: 60, align: 'center' });
        doc.text(rtlText(d.description), colDesc - 30, y, { width: 280, align: 'right' });
        y += 14;
        if (y > 720) { doc.addPage(); y = 40; }
      }
      y += 5;

      // ============ נטו ============
      doc.fontSize(12);
      doc.rect(40, y, PAGE_WIDTH, 22).fillAndStroke('#cce5ff', '#000000');
      doc.fillColor('#000000');
      const netLine = `שכר נטו לתשלום: ${formatCurrency(summary.netSalary)} ש"ח`;
      doc.text(rtlText(netLine), 40, y + 6, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 30;

      // ============ הפרשות מעסיק ============
      doc.fontSize(11);
      doc.text(rtlText('הפרשות מעסיק:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 16;

      const employerDeductions = payrollRecord.deductions.filter(d => d.isEmployerContribution);
      doc.fontSize(9);
      for (const d of employerDeductions) {
        doc.text(formatCurrency(d.amount), colSum - 30, y, { width: 60, align: 'center' });
        doc.text(rtlText(d.description), colDesc - 30, y, { width: 280, align: 'right' });
        y += 13;
        if (y > 720) { doc.addPage(); y = 40; }
      }

      y += 8;
      doc.fontSize(10);
      doc.text(rtlText(`סך עלות מעסיק: ${formatCurrency(summary.employerCost)} ש"ח`),
        40, y, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 20;

      // ============ צבירות ============
      if (payrollRecord.vacationBalance || payrollRecord.sickLeave) {
        doc.fontSize(11);
        doc.text(rtlText('צבירת חופשה ומחלה:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 16;

        doc.fontSize(9);
        if (payrollRecord.vacationBalance) {
          const v = payrollRecord.vacationBalance;
          const line = `חופשה - יתרת פתיחה: ${v.openingBalance}, נצברו: ${v.accrued}, נוצלו: ${v.used}, יתרה: ${v.closingBalance}`;
          doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
          y += 14;
        }
        if (payrollRecord.sickLeave) {
          const s = payrollRecord.sickLeave;
          const line = `מחלה - יתרת פתיחה: ${s.openingBalance}, נצברו: ${s.accrued}, נוצלו: ${s.used}, יתרה: ${s.closingBalance}`;
          doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
          y += 14;
        }
        y += 8;
      }

      // ============ פוטר ============
      doc.fontSize(8);
      doc.fillColor('#888888');
      const footer = `הופק: ${formatDate(payrollRecord.generatedAt)} | מערכת חישוב שכר`;
      doc.text(rtlText(footer), 40, doc.page.height - 50, { width: PAGE_WIDTH, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePayslip };
