/**
 * טופס 106 - דוח שכר שנתי
 * Annual Form 106 PDF
 */

'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { rtlText, formatCurrency, formatDate } = require('./pdf-helpers');

/**
 * מחולל טופס 106
 * @param {Object} params
 * @param {Object} params.employee
 * @param {number} params.year
 * @param {Array<Object>} params.payrollRecords - 12 רשומות חודשיות
 * @param {string} outputPath
 */
function generateForm106({ employee, year, payrollRecords }, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: { Title: `Form 106 ${year}`, Author: 'Payroll System' },
      });

      // טען פונט אם קיים
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
            break;
          }
        } catch (_) {}
      }

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const PAGE_WIDTH = doc.page.width - 80;

      // חישוב סיכומי שנה
      const totals = {
        gross: 0,
        taxable: 0,
        incomeTax: 0,
        bituachLeumi: 0,
        healthTax: 0,
        pensionEmp: 0,
        pensionEmpr: 0,
        compensation: 0,
        kerenEmp: 0,
        kerenEmpr: 0,
      };
      for (const r of payrollRecords) {
        totals.gross += r.summary.grossSalary;
        totals.taxable += r.summary.taxableIncome;
        for (const d of r.deductions) {
          if (d.type === 'INCOME_TAX') totals.incomeTax += d.amount;
          else if (d.type === 'BITUACH_LEUMI' && !d.isEmployerContribution) totals.bituachLeumi += d.amount;
          else if (d.type === 'HEALTH_TAX') totals.healthTax += d.amount;
          else if (d.type === 'PENSION_EMPLOYEE') totals.pensionEmp += d.amount;
          else if (d.type === 'PENSION_EMPLOYER') totals.pensionEmpr += d.amount;
          else if (d.type === 'COMPENSATION') totals.compensation += d.amount;
          else if (d.type === 'KEREN_EMPLOYEE') totals.kerenEmp += d.amount;
          else if (d.type === 'KEREN_EMPLOYER') totals.kerenEmpr += d.amount;
        }
      }

      // כותרת
      doc.fontSize(22);
      doc.text(rtlText(`טופס 106 - ${year}`), 40, 50, { width: PAGE_WIDTH, align: 'right' });
      doc.fontSize(14);
      doc.text(rtlText('אישור שנתי על ניכוי מס במקור משכר'), 40, 80, { width: PAGE_WIDTH, align: 'right' });

      doc.moveTo(40, 110).lineTo(40 + PAGE_WIDTH, 110).stroke();

      // פרטי עובד
      let y = 125;
      doc.fontSize(11);
      doc.text(rtlText('פרטי העובד:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 18;
      doc.fontSize(10);
      const empInfo = [
        `שם: ${employee.fullName}`,
        `תעודת זהות: ${employee.tz}`,
        `תפקיד: ${employee.position || ''}`,
        `תאריך תחילת עבודה: ${formatDate(employee.startDate)}`,
      ];
      for (const line of empInfo) {
        doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 14;
      }

      y += 15;
      doc.moveTo(40, y).lineTo(40 + PAGE_WIDTH, y).stroke();
      y += 10;

      // טבלת חודשים
      doc.fontSize(11);
      doc.text(rtlText('פירוט חודשי:'), 40, y, { width: PAGE_WIDTH, align: 'right' });
      y += 18;

      // Header
      doc.fontSize(8);
      const cols = [
        { key: 'month', label: 'חודש', x: 40, w: 50 },
        { key: 'gross', label: 'ברוטו', x: 95, w: 70 },
        { key: 'taxable', label: 'חייב במס', x: 170, w: 70 },
        { key: 'tax', label: 'מס הכנסה', x: 245, w: 65 },
        { key: 'bl', label: 'ב.לאומי', x: 315, w: 60 },
        { key: 'health', label: 'בריאות', x: 380, w: 55 },
        { key: 'pension', label: 'פנסיה', x: 440, w: 55 },
        { key: 'net', label: 'נטו', x: 500, w: 60 },
      ];

      doc.rect(40, y, PAGE_WIDTH, 16).fillAndStroke('#dddddd', '#000000');
      doc.fillColor('#000000');
      for (const c of cols) {
        doc.text(rtlText(c.label), c.x, y + 3, { width: c.w, align: 'center' });
      }
      y += 18;

      for (const r of payrollRecords) {
        const tax = r.deductions.find(d => d.type === 'INCOME_TAX')?.amount || 0;
        const bl = r.deductions.find(d => d.type === 'BITUACH_LEUMI' && !d.isEmployerContribution)?.amount || 0;
        const health = r.deductions.find(d => d.type === 'HEALTH_TAX')?.amount || 0;
        const pension = r.deductions.find(d => d.type === 'PENSION_EMPLOYEE')?.amount || 0;

        doc.text(String(r.month), cols[0].x, y, { width: cols[0].w, align: 'center' });
        doc.text(formatCurrency(r.summary.grossSalary), cols[1].x, y, { width: cols[1].w, align: 'center' });
        doc.text(formatCurrency(r.summary.taxableIncome), cols[2].x, y, { width: cols[2].w, align: 'center' });
        doc.text(formatCurrency(tax), cols[3].x, y, { width: cols[3].w, align: 'center' });
        doc.text(formatCurrency(bl), cols[4].x, y, { width: cols[4].w, align: 'center' });
        doc.text(formatCurrency(health), cols[5].x, y, { width: cols[5].w, align: 'center' });
        doc.text(formatCurrency(pension), cols[6].x, y, { width: cols[6].w, align: 'center' });
        doc.text(formatCurrency(r.summary.netSalary), cols[7].x, y, { width: cols[7].w, align: 'center' });
        y += 14;
      }

      // סיכום שנתי
      y += 10;
      doc.fontSize(11);
      doc.rect(40, y, PAGE_WIDTH, 20).fillAndStroke('#f0f0f0', '#000000');
      doc.fillColor('#000000');
      doc.text(rtlText('סיכום שנתי'), 40, y + 5, { width: PAGE_WIDTH - 10, align: 'right' });
      y += 25;

      doc.fontSize(10);
      const totalLines = [
        `סך ברוטו שנתי: ${formatCurrency(totals.gross)} ש"ח`,
        `סך הכנסה חייבת: ${formatCurrency(totals.taxable)} ש"ח`,
        `מס הכנסה ששולם: ${formatCurrency(totals.incomeTax)} ש"ח`,
        `דמי ביטוח לאומי: ${formatCurrency(totals.bituachLeumi)} ש"ח`,
        `דמי ביטוח בריאות: ${formatCurrency(totals.healthTax)} ש"ח`,
        `הפרשות פנסיה (עובד): ${formatCurrency(totals.pensionEmp)} ש"ח`,
        `הפרשות פנסיה (מעסיק): ${formatCurrency(totals.pensionEmpr)} ש"ח`,
        `פיצויים (מעסיק): ${formatCurrency(totals.compensation)} ש"ח`,
      ];
      for (const line of totalLines) {
        doc.text(rtlText(line), 40, y, { width: PAGE_WIDTH, align: 'right' });
        y += 15;
      }

      // פוטר
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

module.exports = { generateForm106 };
