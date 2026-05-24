/**
 * דמו - הרצת המערכת ללא שרת
 * Demo - run system without server
 */

'use strict';

const path = require('path');
const { createEmployee } = require('./schemas');
const { calculateMonthlyPayroll } = require('./engine/calc');
const {
  updateVacationBalance, updateSickLeaveBalance,
  calculateMiluimCompensation, calculateYearsOfService,
} = require('./engine/balances');
const { generatePayslip } = require('./reports/payslip');
const { generateForm106 } = require('./reports/form106');
const { generateReport102, generateReport126 } = require('./reports/reports102_126');

async function main() {
  console.log('=== דמו - מערכת חישוב שכר ===\n');

  // יצירת עובד
  const employee = createEmployee({
    id: '1001',
    tz: '012345678',
    firstName: 'משה',
    lastName: 'כהן',
    startDate: '2020-03-15',
    position: 'מפתח בכיר',
    department: 'הייטק',
    baseSalary: 18000,
    hourlyRate: 100,
    monthlyHours: 182,
    hasPension: true,
    hasKerenHishtalmut: true,
    taxCredits: 2.25,
    numChildren: 2,
  });

  console.log(`עובד: ${employee.fullName} (${employee.tz})`);
  console.log(`ותק: ${calculateYearsOfService(employee.startDate)} שנים\n`);

  // ימי עבודה לדוגמה - 22 ימי עבודה רגילים, 2 ימי שבת, יום חג
  const workDays = [];
  for (let i = 1; i <= 22; i++) workDays.push({ date: `2026-05-${String(i).padStart(2,'0')}`, hours: 9.5 }); // שעה נוספת
  workDays.push({ date: '2026-05-23', hours: 8, isShabbat: true });
  workDays.push({ date: '2026-05-30', hours: 6, isShabbat: true });

  const additionalItems = [
    { type: 'TRAVEL', description: 'נסיעות', amount: 350, taxable: false, pensionable: false, bituachLeumiable: false },
    { type: 'MEALS', description: 'אוכל', amount: 600, taxable: true, pensionable: false, bituachLeumiable: true },
    { type: 'EVENT_BONUS', description: 'בונוס אירוע - השקת מוצר', amount: 2500, taxable: true, pensionable: false, bituachLeumiable: true },
    { type: 'RECUPERATION', description: 'דמי הבראה', amount: 1500, taxable: true, pensionable: false, bituachLeumiable: true },
  ];

  const yearsOfService = calculateYearsOfService(employee.startDate);

  const vacationData = updateVacationBalance({
    employeeId: employee.id,
    year: 2026,
    yearsOfService,
    openingBalance: 8,
    accruedSoFar: 5,
    usedSoFar: 2,
    usedThisMonth: 1,
  });

  const sickData = updateSickLeaveBalance({
    employeeId: employee.id,
    year: 2026,
    openingBalance: 4,
    accruedSoFar: 6,
    usedSoFar: 0,
    usedThisMonth: 2,
  });

  // חישוב חודש מאי 2026
  const record = calculateMonthlyPayroll({
    employee,
    year: 2026,
    month: 5,
    workDays,
    additionalItems,
    advanceAmount: 1000,
    vacationData,
    sickData,
  });

  console.log('=== סיכום שכר חודש 05/2026 ===');
  console.log(`ברוטו:                ${record.summary.grossSalary.toLocaleString()} ₪`);
  console.log(`חייב במס:             ${record.summary.taxableIncome.toLocaleString()} ₪`);
  console.log(`ניכויים מעובד:        ${record.summary.employeeDeductions.toLocaleString()} ₪`);
  console.log(`הפרשות מעסיק:         ${record.summary.employerContributions.toLocaleString()} ₪`);
  console.log(`נטו לתשלום:           ${record.summary.netSalary.toLocaleString()} ₪`);
  console.log(`עלות מעסיק כוללת:     ${record.summary.employerCost.toLocaleString()} ₪`);
  console.log();

  console.log('=== פירוט הכנסות ===');
  for (const item of record.items) {
    console.log(`  ${item.description.padEnd(30)} ${item.quantity.toString().padStart(8)} × ${item.rate.toString().padStart(7)} = ${item.amount.toString().padStart(10)} ₪`);
  }
  console.log();

  console.log('=== ניכויים ===');
  for (const d of record.deductions) {
    const tag = d.isEmployerContribution ? '[מעסיק]' : '[עובד] ';
    console.log(`  ${tag} ${d.description.padEnd(35)} ${d.amount.toString().padStart(10)} ₪`);
  }
  console.log();

  // הפקת תלוש PDF
  const outputDir = path.join(__dirname, '..', 'output');
  console.log('=== הפקת PDF ===');

  const payslipPath = path.join(outputDir, `payslip-${employee.id}-2026-05.pdf`);
  await generatePayslip(record, payslipPath);
  console.log(`  תלוש שכר:  ${payslipPath}`);

  // בנה רשומות לכל השנה (לטופס 106)
  const yearlyRecords = [];
  for (let m = 1; m <= 5; m++) {
    const r = calculateMonthlyPayroll({
      employee,
      year: 2026,
      month: m,
      workDays: workDays.slice(0, 22),
      additionalItems: additionalItems.slice(0, 2),
      vacationData,
      sickData,
    });
    yearlyRecords.push(r);
  }

  const form106Path = path.join(outputDir, `form106-${employee.id}-2026.pdf`);
  await generateForm106({ employee, year: 2026, payrollRecords: yearlyRecords }, form106Path);
  console.log(`  טופס 106:   ${form106Path}`);

  const r102Path = path.join(outputDir, 'report102-2026-05.pdf');
  await generateReport102({ year: 2026, month: 5, employerName: 'חברת דוגמה בע"מ', payrollRecords: [record] }, r102Path);
  console.log(`  דוח 102:    ${r102Path}`);

  const r126Path = path.join(outputDir, 'report126-2026-05.pdf');
  await generateReport126({
    year: 2026, month: 5,
    employerName: 'חברת דוגמה בע"מ',
    employerNumber: '987654321',
    payrollRecords: [record],
  }, r126Path);
  console.log(`  דוח 126:    ${r126Path}`);

  console.log('\nהדמו הסתיים בהצלחה!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
