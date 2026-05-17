/**
 * שרת API + הגשת UI סטטי
 * Express REST API + static UI
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const {
  addEmployee, getEmployee, listEmployees, updateEmployee, deleteEmployee,
  savePayroll, getPayroll, listPayrolls, getEmployeeYearlyRecords, seedDemo,
} = require('./store');
const { calculateMonthlyPayroll } = require('../engine/calc');
const {
  updateVacationBalance, updateSickLeaveBalance, calculateSickPay,
  calculateMiluimCompensation, calculateYearsOfService,
} = require('../engine/balances');
const { generatePayslip } = require('../reports/payslip');
const { generateForm106 } = require('../reports/form106');
const { generateReport102, generateReport126 } = require('../reports/reports102_126');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Seed demo data
seedDemo();

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ============ UI Static ============
app.use('/', express.static(path.join(__dirname, '..', 'ui')));
app.use('/output', express.static(OUTPUT_DIR));

// ============ Health ============
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ============ Employees ============
app.get('/api/employees', (req, res) => {
  res.json(listEmployees());
});

app.get('/api/employees/:id', (req, res) => {
  const e = getEmployee(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});

app.post('/api/employees', (req, res) => {
  try {
    const e = addEmployee(req.body);
    res.status(201).json(e);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  const e = updateEmployee(req.params.id, req.body);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});

app.delete('/api/employees/:id', (req, res) => {
  const ok = deleteEmployee(req.params.id);
  res.json({ deleted: ok });
});

// ============ Payroll Calculation ============
app.post('/api/payroll/calculate', (req, res) => {
  try {
    const { employeeId, year, month, workDays, additionalItems, advanceAmount,
            sickDaysThisMonth = 0, vacationDaysThisMonth = 0, miluim = null } = req.body;

    const employee = getEmployee(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const yearsOfService = calculateYearsOfService(employee.startDate);

    // צבירת חופשה ומחלה
    const vacationData = updateVacationBalance({
      employeeId,
      year,
      yearsOfService,
      openingBalance: 5,
      accruedSoFar: 0,
      usedSoFar: 0,
      usedThisMonth: vacationDaysThisMonth,
    });

    const sickData = updateSickLeaveBalance({
      employeeId,
      year,
      openingBalance: 0,
      accruedSoFar: 0,
      usedSoFar: 0,
      usedThisMonth: sickDaysThisMonth,
    });

    // חישוב מחלה (אם רלוונטי) - מתווסף ל-additionalItems
    const items = [...(additionalItems || [])];
    if (sickDaysThisMonth > 0 && employee.hourlyRate > 0) {
      const dailySalary = employee.hourlyRate * 8.6;
      const sickPay = calculateSickPay({ sickDaysThisMonth, dailySalary });
      if (sickPay > 0) {
        items.push({
          type: 'SICK_PAY',
          description: `תשלום מחלה (${sickDaysThisMonth} ימים)`,
          quantity: sickDaysThisMonth,
          rate: dailySalary,
          amount: sickPay,
          taxable: true,
          pensionable: true,
          bituachLeumiable: true,
        });
      }
    }

    let miluimRecord = null;
    if (miluim && miluim.daysCount > 0) {
      miluimRecord = calculateMiluimCompensation({
        employeeId,
        startDate: miluim.startDate,
        endDate: miluim.endDate,
        daysCount: miluim.daysCount,
        reservationOrderNumber: miluim.reservationOrderNumber,
        averageDailySalary: miluim.averageDailySalary || (employee.baseSalary / 30) || (employee.hourlyRate * 8.6),
      });
    }

    const record = calculateMonthlyPayroll({
      employee,
      year,
      month,
      workDays: workDays || [],
      additionalItems: items,
      advanceAmount: advanceAmount || 0,
      vacationData,
      sickData,
      miluimData: miluimRecord,
    });

    savePayroll(record);
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payroll', (req, res) => {
  const { employeeId, year, month } = req.query;
  const records = listPayrolls({
    employeeId,
    year: year ? Number(year) : null,
    month: month ? Number(month) : null,
  });
  res.json(records);
});

app.get('/api/payroll/:employeeId/:year/:month', (req, res) => {
  const { employeeId, year, month } = req.params;
  const r = getPayroll(employeeId, Number(year), Number(month));
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

// ============ PDF Reports ============
app.post('/api/reports/payslip', async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;
    const record = getPayroll(employeeId, Number(year), Number(month));
    if (!record) return res.status(404).json({ error: 'Payroll not found' });
    const filename = `payslip-${employeeId}-${year}-${String(month).padStart(2, '0')}.pdf`;
    const outPath = path.join(OUTPUT_DIR, filename);
    await generatePayslip(record, outPath);
    res.json({ url: `/output/${filename}`, path: outPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/106', async (req, res) => {
  try {
    const { employeeId, year } = req.body;
    const employee = getEmployee(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const records = getEmployeeYearlyRecords(employeeId, Number(year));
    if (records.length === 0) return res.status(404).json({ error: 'No payroll records' });
    const filename = `form106-${employeeId}-${year}.pdf`;
    const outPath = path.join(OUTPUT_DIR, filename);
    await generateForm106({ employee, year: Number(year), payrollRecords: records }, outPath);
    res.json({ url: `/output/${filename}`, path: outPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/102', async (req, res) => {
  try {
    const { year, month, employerName } = req.body;
    const records = listPayrolls({ year: Number(year), month: Number(month) });
    if (records.length === 0) return res.status(404).json({ error: 'No payroll records' });
    const filename = `report102-${year}-${String(month).padStart(2, '0')}.pdf`;
    const outPath = path.join(OUTPUT_DIR, filename);
    await generateReport102({ year: Number(year), month: Number(month), employerName: employerName || 'חברה בע"מ', payrollRecords: records }, outPath);
    res.json({ url: `/output/${filename}`, path: outPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/126', async (req, res) => {
  try {
    const { year, month, employerName, employerNumber } = req.body;
    const records = listPayrolls({ year: Number(year), month: Number(month) });
    if (records.length === 0) return res.status(404).json({ error: 'No payroll records' });
    const filename = `report126-${year}-${String(month).padStart(2, '0')}.pdf`;
    const outPath = path.join(OUTPUT_DIR, filename);
    await generateReport126({
      year: Number(year), month: Number(month),
      employerName: employerName || 'חברה בע"מ',
      employerNumber: employerNumber || '',
      payrollRecords: records,
    }, outPath);
    res.json({ url: `/output/${filename}`, path: outPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Server start ============
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Payroll system running on http://localhost:${PORT}`);
  });
}

module.exports = app;
