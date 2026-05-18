/* Payroll System UI - JavaScript */

const api = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async put(url, body) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

const HEBREW_MONTHS = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('hidden'), 3000);
}

// ============ Navigation ============
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
  });
});

// ============ Employees ============
async function loadEmployees() {
  const employees = await api.get('/api/employees');
  const tbody = document.querySelector('#employees-table tbody');
  tbody.innerHTML = '';
  for (const e of employees) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.id}</td>
      <td>${e.tz}</td>
      <td>${e.fullName}</td>
      <td>${e.position || ''}</td>
      <td>${e.department || ''}</td>
      <td>${e.startDate || ''}</td>
      <td>${fmt(e.baseSalary)}</td>
      <td>${fmt(e.hourlyRate)}</td>
      <td>
        <button class="btn small" data-edit="${e.id}">ערוך</button>
        <button class="btn small danger" data-del="${e.id}">מחק</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  // Bind events
  tbody.querySelectorAll('[data-edit]').forEach(b => {
    b.addEventListener('click', () => openEmployeeModal(b.dataset.edit));
  });
  tbody.querySelectorAll('[data-del]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('למחוק עובד?')) return;
      await api.del(`/api/employees/${b.dataset.del}`);
      loadEmployees();
      populateEmployeeSelectors();
      showToast('נמחק', 'success');
    });
  });
  // עדכן selectors
  populateEmployeeSelectors(employees);
}

async function populateEmployeeSelectors(employees) {
  if (!employees) employees = await api.get('/api/employees');
  const opts = employees.map(e => `<option value="${e.id}">${e.fullName} (${e.tz})</option>`).join('');
  document.getElementById('payroll-employee').innerHTML = opts;
  document.getElementById('r106-employee').innerHTML = opts;
}

function openEmployeeModal(id) {
  const modal = document.getElementById('employee-modal');
  const form = document.getElementById('form-employee');
  form.reset();
  form.dataset.id = id || '';
  document.getElementById('modal-title').textContent = id ? 'עריכת עובד' : 'עובד חדש';
  if (id) {
    api.get(`/api/employees/${id}`).then(e => {
      for (const [k, v] of Object.entries(e)) {
        const inp = form.elements[k];
        if (!inp) continue;
        if (inp.type === 'checkbox') inp.checked = !!v;
        else if (v != null) inp.value = v;
      }
    });
  }
  modal.classList.remove('hidden');
}

function closeEmployeeModal() {
  document.getElementById('employee-modal').classList.add('hidden');
}

document.getElementById('btn-new-employee').addEventListener('click', () => openEmployeeModal());
document.getElementById('btn-cancel-employee').addEventListener('click', closeEmployeeModal);

document.getElementById('form-employee').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.hasPension = e.target.elements.hasPension.checked;
  data.hasKerenHishtalmut = e.target.elements.hasKerenHishtalmut.checked;
  ['baseSalary', 'hourlyRate', 'monthlyHours', 'taxCredits', 'numChildren'].forEach(k => {
    if (data[k] !== '' && data[k] !== undefined) data[k] = Number(data[k]);
  });
  try {
    const id = e.target.dataset.id;
    if (id) await api.put(`/api/employees/${id}`, data);
    else await api.post('/api/employees', data);
    closeEmployeeModal();
    loadEmployees();
    showToast('נשמר', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ============ Payroll ============
function populateMonths() {
  const sels = ['payroll-month', 'r102-month', 'r126-month'];
  for (const id of sels) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    sel.innerHTML = HEBREW_MONTHS.slice(1).map((n, i) => `<option value="${i+1}">${n}</option>`).join('');
    sel.value = new Date().getMonth() + 1;
  }
}

function addWorkdayRow() {
  const container = document.getElementById('workdays-container');
  const row = document.createElement('div');
  row.className = 'workday-row';
  row.innerHTML = `
    <input type="date" name="date" />
    <input type="number" name="hours" placeholder="שעות" step="0.5" min="0" />
    <select name="kind">
      <option value="regular">רגיל</option>
      <option value="shabbat">שבת</option>
      <option value="holiday">חג</option>
    </select>
    <span></span>
    <button type="button" class="btn small danger" data-remove>הסר</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function addExtraRow() {
  const container = document.getElementById('extras-container');
  const row = document.createElement('div');
  row.className = 'extra-row';
  row.innerHTML = `
    <input type="text" name="description" placeholder="תיאור (לדוגמה: נסיעות)" />
    <select name="type">
      <option value="TRAVEL">נסיעות</option>
      <option value="MEALS">אוכל</option>
      <option value="EVENT_BONUS">בונוס אירוע</option>
      <option value="BONUS">בונוס</option>
      <option value="RECUPERATION">הבראה</option>
      <option value="CLOTHING">ביגוד</option>
      <option value="PHONE">טלפון</option>
      <option value="THIRTEENTH">משכורת 13</option>
      <option value="OTHER">אחר</option>
    </select>
    <input type="number" name="amount" placeholder="סכום" step="0.01" min="0" />
    <select name="taxable"><option value="true">חייב מס</option><option value="false">פטור</option></select>
    <button type="button" class="btn small danger" data-remove>הסר</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

document.getElementById('add-workday').addEventListener('click', addWorkdayRow);
document.getElementById('add-extra').addEventListener('click', addExtraRow);

document.getElementById('form-payroll').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const employeeId = fd.get('employeeId');
  const year = Number(fd.get('year'));
  const month = Number(fd.get('month'));

  // Collect workdays
  const workDays = [];
  document.querySelectorAll('.workday-row').forEach(r => {
    const date = r.querySelector('[name=date]').value;
    const hours = Number(r.querySelector('[name=hours]').value || 0);
    const kind = r.querySelector('[name=kind]').value;
    if (hours > 0) {
      workDays.push({
        date,
        hours,
        isShabbat: kind === 'shabbat',
        isHoliday: kind === 'holiday',
      });
    }
  });

  // Collect extras
  const additionalItems = [];
  document.querySelectorAll('.extra-row').forEach(r => {
    const desc = r.querySelector('[name=description]').value;
    const type = r.querySelector('[name=type]').value;
    const amount = Number(r.querySelector('[name=amount]').value || 0);
    const taxable = r.querySelector('[name=taxable]').value === 'true';
    if (amount > 0) {
      additionalItems.push({
        type, description: desc || type, amount,
        quantity: 1, rate: amount,
        taxable, pensionable: type === 'BONUS' || type === 'THIRTEENTH', bituachLeumiable: taxable,
      });
    }
  });

  const sickDaysThisMonth = Number(fd.get('sickDaysThisMonth') || 0);
  const vacationDaysThisMonth = Number(fd.get('vacationDaysThisMonth') || 0);
  const advanceAmount = Number(fd.get('advanceAmount') || 0);
  const miluimDays = Number(fd.get('miluimDays') || 0);

  const payload = {
    employeeId, year, month, workDays, additionalItems,
    advanceAmount, sickDaysThisMonth, vacationDaysThisMonth,
    miluim: miluimDays > 0 ? { daysCount: miluimDays, startDate: `${year}-${String(month).padStart(2,'0')}-01`, endDate: `${year}-${String(month).padStart(2,'0')}-${miluimDays}` } : null,
  };

  try {
    const result = await api.post('/api/payroll/calculate', payload);
    renderPayrollResult(result);
    showToast('חושב בהצלחה', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function renderPayrollResult(record) {
  const card = document.getElementById('payroll-result');
  const content = document.getElementById('payroll-result-content');
  card.classList.remove('hidden');

  const itemsHtml = record.items.map(i => `
    <tr>
      <td>${i.description}</td>
      <td class="num">${i.quantity}</td>
      <td class="num">${fmt(i.rate)}</td>
      <td class="num">${fmt(i.amount)}</td>
    </tr>
  `).join('');

  const empDeductHtml = record.deductions.filter(d => !d.isEmployerContribution).map(d => `
    <tr><td>${d.description}</td><td class="num">${fmt(d.amount)}</td></tr>
  `).join('');

  const emprDeductHtml = record.deductions.filter(d => d.isEmployerContribution).map(d => `
    <tr><td>${d.description}</td><td class="num">${fmt(d.amount)}</td></tr>
  `).join('');

  content.innerHTML = `
    <div class="payroll-summary">
      <h4>סיכום שכר ${HEBREW_MONTHS[record.month]} ${record.year} - ${record.employee.fullName}</h4>
      <div class="summary-grid">
        <span class="key">סך ברוטו:</span>
        <span class="value">${fmt(record.summary.grossSalary)} ש"ח</span>
        <span class="key">חייב במס:</span>
        <span class="value">${fmt(record.summary.taxableIncome)} ש"ח</span>
        <span class="key">סך ניכויים מעובד:</span>
        <span class="value">${fmt(record.summary.employeeDeductions)} ש"ח</span>
        <span class="key">הפרשות מעסיק:</span>
        <span class="value">${fmt(record.summary.employerContributions)} ש"ח</span>
        <span class="key" style="font-size: 16px;">שכר נטו:</span>
        <span class="value net">${fmt(record.summary.netSalary)} ש"ח</span>
        <span class="key">עלות מעסיק:</span>
        <span class="value">${fmt(record.summary.employerCost)} ש"ח</span>
      </div>
    </div>

    <h4>פירוט הכנסות</h4>
    <table class="items-table">
      <thead><tr><th>תיאור</th><th>כמות</th><th>תעריף</th><th>סכום</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <h4>ניכויים מעובד</h4>
    <table class="items-table">
      <thead><tr><th>תיאור</th><th>סכום</th></tr></thead>
      <tbody>${empDeductHtml}</tbody>
    </table>

    <h4>הפרשות מעסיק</h4>
    <table class="items-table">
      <thead><tr><th>תיאור</th><th>סכום</th></tr></thead>
      <tbody>${emprDeductHtml}</tbody>
    </table>

    ${record.vacationBalance ? `
      <h4>צבירת חופשה</h4>
      <p>פתיחה: ${record.vacationBalance.openingBalance} | נצברו: ${record.vacationBalance.accrued} | נוצלו: ${record.vacationBalance.used} | יתרה: ${record.vacationBalance.closingBalance}</p>
    ` : ''}
    ${record.sickLeave ? `
      <h4>צבירת מחלה</h4>
      <p>פתיחה: ${record.sickLeave.openingBalance} | נצברו: ${record.sickLeave.accrued} | נוצלו: ${record.sickLeave.used} | יתרה: ${record.sickLeave.closingBalance}</p>
    ` : ''}
  `;

  // Bind PDF button
  document.getElementById('btn-generate-payslip').onclick = async () => {
    try {
      const r = await api.post('/api/reports/payslip', {
        employeeId: record.employeeId,
        year: record.year,
        month: record.month,
      });
      addReportLink('תלוש שכר', record, r.url);
      window.open(r.url, '_blank');
      showToast('תלוש הופק', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// ============ Reports ============
function addReportLink(title, info, url) {
  const ul = document.getElementById('reports-list');
  const li = document.createElement('li');
  const date = new Date().toLocaleString('he-IL');
  li.innerHTML = `<a href="${url}" target="_blank">${title}</a> - ${date}`;
  ul.prepend(li);
}

document.getElementById('form-106').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const r = await api.post('/api/reports/106', {
      employeeId: fd.get('employeeId'),
      year: Number(fd.get('year')),
    });
    addReportLink('טופס 106', null, r.url);
    window.open(r.url, '_blank');
    showToast('טופס 106 הופק', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('form-102').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const r = await api.post('/api/reports/102', {
      year: Number(fd.get('year')),
      month: Number(fd.get('month')),
      employerName: fd.get('employerName'),
    });
    addReportLink('דוח 102', null, r.url);
    window.open(r.url, '_blank');
    showToast('דוח 102 הופק', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('form-126').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const r = await api.post('/api/reports/126', {
      year: Number(fd.get('year')),
      month: Number(fd.get('month')),
      employerName: fd.get('employerName'),
      employerNumber: fd.get('employerNumber'),
    });
    addReportLink('דוח 126', null, r.url);
    window.open(r.url, '_blank');
    showToast('דוח 126 הופק', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ============ Init ============
populateMonths();
loadEmployees();
addWorkdayRow();
addExtraRow();
