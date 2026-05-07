/**
 * בדיקות יסוד למנוע השכר
 * Basic tests for payroll engine
 */

'use strict';

const assert = require('assert');
const {
  createEmployee, createPayrollItem, PAY_ITEM_TYPES, PAYROLL_SETTINGS_2026,
} = require('../src/schemas');
const {
  calculateHoursBreakdown,
  calculateIncomeTax,
  calculateIncomeTaxGross,
  calculateBituachLeumiAndHealth,
  calculatePensionAndCompensation,
  calculateKerenHishtalmut,
  calculateMonthlyPayroll,
} = require('../src/engine/calc');
const {
  updateVacationBalance, calculateSickPay, calculateYearsOfService,
} = require('../src/engine/balances');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n=== Test: Schemas ===');
test('createEmployee creates valid employee', () => {
  const e = createEmployee({
    id: '1', tz: '123', firstName: 'A', lastName: 'B',
    startDate: '2020-01-01', baseSalary: 10000,
  });
  assert.strictEqual(e.fullName, 'A B');
  assert.strictEqual(e.baseSalary, 10000);
});

test('createPayrollItem calculates amount from qty × rate', () => {
  const item = createPayrollItem({ type: 'X', description: 'T', quantity: 10, rate: 50 });
  assert.strictEqual(item.amount, 500);
});

console.log('\n=== Test: Hours Breakdown ===');
test('regular 8h day gives no overtime', () => {
  const result = calculateHoursBreakdown({
    workDays: [{ hours: 8 }],
    hourlyRate: 100,
    standardDailyHours: 8.6,
  });
  assert.strictEqual(result.breakdown.regular, 8);
  assert.strictEqual(result.breakdown.overtime125, 0);
});

test('10h day -> 8.6 regular + 1.4 OT125', () => {
  const result = calculateHoursBreakdown({
    workDays: [{ hours: 10 }],
    hourlyRate: 100,
    standardDailyHours: 8.6,
  });
  assert.strictEqual(result.breakdown.regular, 8.6);
  assert.strictEqual(result.breakdown.overtime125, 1.4);
});

test('12h day -> 8.6 reg + 2 OT125 + 1.4 OT150', () => {
  const result = calculateHoursBreakdown({
    workDays: [{ hours: 12 }],
    hourlyRate: 100,
    standardDailyHours: 8.6,
  });
  assert.strictEqual(result.breakdown.regular, 8.6);
  assert.strictEqual(result.breakdown.overtime125, 2);
  assert.strictEqual(Math.abs(result.breakdown.overtime150 - 1.4) < 0.001, true);
});

test('shabbat 8h -> 8 hours at 150%', () => {
  const result = calculateHoursBreakdown({
    workDays: [{ hours: 8, isShabbat: true }],
    hourlyRate: 100,
  });
  assert.strictEqual(result.breakdown.shabbatBase, 8);
  assert.strictEqual(result.breakdown.shabbatOT, 0);
});

test('shabbat 10h -> 8.6 base 150% + 1.4 OT 175%', () => {
  const result = calculateHoursBreakdown({
    workDays: [{ hours: 10, isShabbat: true }],
    hourlyRate: 100,
    standardDailyHours: 8.6,
  });
  assert.strictEqual(result.breakdown.shabbatBase, 8.6);
  assert.strictEqual(Math.abs(result.breakdown.shabbatOT - 1.4) < 0.001, true);
});

console.log('\n=== Test: Income Tax (2026 brackets) ===');
test('low income 5000: only 10% bracket', () => {
  const tax = calculateIncomeTaxGross(5000);
  assert.strictEqual(tax, 500);
});

test('income 8000: spans 2 brackets', () => {
  // 7010 * 0.10 + (8000-7010) * 0.14 = 701 + 138.6 = 839.6
  const tax = calculateIncomeTaxGross(8000);
  assert.ok(Math.abs(tax - 839.6) < 0.5, `got ${tax}`);
});

test('tax credits reduce final tax', () => {
  const grossTax = calculateIncomeTaxGross(15000);
  const finalTax = calculateIncomeTax(15000, 2.25);
  const credit = 2.25 * PAYROLL_SETTINGS_2026.taxCreditPointValue;
  assert.ok(finalTax === Math.max(0, grossTax - credit) || Math.abs(finalTax - (grossTax - credit)) < 1);
});

test('tax never goes below 0 with high credits', () => {
  const tax = calculateIncomeTax(3000, 5);
  assert.strictEqual(tax, 0);
});

console.log('\n=== Test: Bituach Leumi ===');
test('low income uses reduced rates', () => {
  const result = calculateBituachLeumiAndHealth(5000);
  // 5000 * 0.0040 = 20
  assert.ok(Math.abs(result.bituachLeumiEmployee - 20) < 0.1);
  // 5000 * 0.0310 = 155
  assert.ok(Math.abs(result.healthTaxEmployee - 155) < 0.1);
});

test('high income capped at ceiling', () => {
  const result1 = calculateBituachLeumiAndHealth(60000);
  const result2 = calculateBituachLeumiAndHealth(100000);
  // שניהם צריכים להיות זהים כי מעבר לתקרה
  assert.strictEqual(result1.bituachLeumiEmployee, result2.bituachLeumiEmployee);
});

console.log('\n=== Test: Pension & Compensation ===');
test('pension 6%/6.5%/8.33% on pensionable income', () => {
  const employee = createEmployee({ id: '1', tz: '1', firstName: 'A', lastName: 'B', startDate: '2020-01-01', hasPension: true });
  const result = calculatePensionAndCompensation(10000, employee);
  assert.strictEqual(result.pensionEmployee, 600);
  assert.strictEqual(result.pensionEmployer, 650);
  assert.strictEqual(result.compensation, 833);
});

test('no pension when employee has hasPension=false', () => {
  const employee = createEmployee({ id: '1', tz: '1', firstName: 'A', lastName: 'B', startDate: '2020-01-01', hasPension: false });
  const result = calculatePensionAndCompensation(10000, employee);
  assert.strictEqual(result.pensionEmployee, 0);
});

console.log('\n=== Test: Keren Hishtalmut ===');
test('keren 2.5%/7.5% when enabled', () => {
  const employee = createEmployee({ id: '1', tz: '1', firstName: 'A', lastName: 'B', startDate: '2020-01-01', hasKerenHishtalmut: true });
  const result = calculateKerenHishtalmut(10000, employee);
  assert.strictEqual(result.kerenEmployee, 250);
  assert.strictEqual(result.kerenEmployer, 750);
});

console.log('\n=== Test: Vacation/Sick ===');
test('vacation accrual based on years of service (1 year = 12 days)', () => {
  const balance = updateVacationBalance({
    employeeId: '1', year: 2026,
    yearsOfService: 1,
    openingBalance: 0, accruedSoFar: 0, usedSoFar: 0, usedThisMonth: 0,
  });
  assert.strictEqual(balance.accrued, 1); // 12/12 = 1
});

test('sick pay: day 1 = 0, days 2-3 = 50%, day 4+ = 100%', () => {
  const pay = calculateSickPay({ sickDaysThisMonth: 5, dailySalary: 1000 });
  // 0 + 500 + 500 + 1000 + 1000 = 3000
  assert.strictEqual(pay, 3000);
});

test('years of service calculation', () => {
  const years = calculateYearsOfService('2020-01-01', new Date('2026-05-07'));
  assert.ok(years >= 6 && years <= 7, `got ${years}`);
});

console.log('\n=== Test: Full Monthly Payroll ===');
test('full monthly calculation produces sensible numbers', () => {
  const employee = createEmployee({
    id: '1', tz: '1', firstName: 'A', lastName: 'B',
    startDate: '2020-01-01',
    baseSalary: 15000,
    hasPension: true, hasKerenHishtalmut: true,
    taxCredits: 2.25,
  });
  const record = calculateMonthlyPayroll({
    employee, year: 2026, month: 5, workDays: [], additionalItems: [],
  });
  assert.strictEqual(record.summary.grossSalary, 15000);
  assert.ok(record.summary.netSalary < record.summary.grossSalary);
  assert.ok(record.summary.netSalary > 0);
  assert.ok(record.summary.employerCost > record.summary.grossSalary);
  // וודא שיש ניכויים נכונים
  const types = record.deductions.map(d => d.type);
  assert.ok(types.includes('PENSION_EMPLOYEE'));
  assert.ok(types.includes('PENSION_EMPLOYER'));
  assert.ok(types.includes('COMPENSATION'));
  assert.ok(types.includes('BITUACH_LEUMI'));
});

test('overtime + extras combined correctly', () => {
  const employee = createEmployee({
    id: '1', tz: '1', firstName: 'A', lastName: 'B',
    startDate: '2020-01-01',
    baseSalary: 0, hourlyRate: 100,
    hasPension: true,
  });
  const workDays = [{ hours: 10 }, { hours: 8 }, { hours: 12 }];
  const record = calculateMonthlyPayroll({
    employee, year: 2026, month: 5,
    workDays,
    additionalItems: [{ type: 'TRAVEL', description: 'נסיעות', amount: 200, taxable: false, pensionable: false, bituachLeumiable: false }],
  });
  // ברוטו: regular hours * 100 + overtime * higher rates + 200 travel
  assert.ok(record.summary.grossSalary > 200);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
