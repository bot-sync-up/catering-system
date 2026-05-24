/**
 * In-memory store - אחסון בזיכרון לעובדים ולתלושים
 * (Greenfield - בסיס נתונים אמיתי יוטמע בהמשך)
 */

'use strict';

const { createEmployee } = require('../schemas');

const store = {
  employees: new Map(),
  payrolls: new Map(), // key: `${employeeId}-${year}-${month}`
  vacationBalances: new Map(), // key: `${employeeId}-${year}`
  sickBalances: new Map(),
  miluim: [],
  nextEmployeeId: 1,
};

function addEmployee(data) {
  const id = data.id || String(store.nextEmployeeId++);
  const emp = createEmployee({ ...data, id });
  store.employees.set(id, emp);
  return emp;
}

function getEmployee(id) {
  return store.employees.get(id);
}

function listEmployees() {
  return Array.from(store.employees.values());
}

function updateEmployee(id, updates) {
  const e = store.employees.get(id);
  if (!e) return null;
  const updated = createEmployee({ ...e, ...updates, id });
  store.employees.set(id, updated);
  return updated;
}

function deleteEmployee(id) {
  return store.employees.delete(id);
}

function savePayroll(record) {
  const key = `${record.employeeId}-${record.year}-${record.month}`;
  store.payrolls.set(key, record);
  return record;
}

function getPayroll(employeeId, year, month) {
  return store.payrolls.get(`${employeeId}-${year}-${month}`);
}

function listPayrolls({ employeeId = null, year = null, month = null } = {}) {
  return Array.from(store.payrolls.values()).filter(r => {
    if (employeeId && r.employeeId !== employeeId) return false;
    if (year && r.year !== year) return false;
    if (month && r.month !== month) return false;
    return true;
  });
}

function getEmployeeYearlyRecords(employeeId, year) {
  return Array.from(store.payrolls.values())
    .filter(r => r.employeeId === employeeId && r.year === year)
    .sort((a, b) => a.month - b.month);
}

// ============ Seed עובדי דמו ============
function seedDemo() {
  if (store.employees.size > 0) return;

  addEmployee({
    tz: '012345678',
    firstName: 'משה',
    lastName: 'כהן',
    startDate: '2020-03-15',
    position: 'מפתח',
    department: 'הייטק',
    baseSalary: 18000,
    hourlyRate: 100,
    monthlyHours: 182,
    hasPension: true,
    hasKerenHishtalmut: true,
    taxCredits: 2.25,
    numChildren: 2,
  });

  addEmployee({
    tz: '023456789',
    firstName: 'שרה',
    lastName: 'לוי',
    startDate: '2018-09-01',
    position: 'מנהלת פרויקטים',
    department: 'הנהלה',
    baseSalary: 25000,
    hourlyRate: 140,
    monthlyHours: 182,
    hasPension: true,
    hasKerenHishtalmut: true,
    taxCredits: 2.75,
    numChildren: 3,
  });

  addEmployee({
    tz: '034567890',
    firstName: 'יוסי',
    lastName: 'מזרחי',
    startDate: '2023-01-10',
    position: 'אבטחה',
    department: 'תפעול',
    baseSalary: 0,
    hourlyRate: 45,
    monthlyHours: 182,
    hasPension: true,
    hasKerenHishtalmut: false,
    taxCredits: 2.25,
    numChildren: 1,
  });
}

module.exports = {
  store,
  addEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  deleteEmployee,
  savePayroll,
  getPayroll,
  listPayrolls,
  getEmployeeYearlyRecords,
  seedDemo,
};
