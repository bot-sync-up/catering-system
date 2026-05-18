// Server-rendered Hebrew RTL dashboard shell.
// The shell loads /api/* via fetch() — token from localStorage.
export function renderDashboard(): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>מערכת מסמכים פיננסיים</title>
  <style>
    body { font-family: 'Open Sans Hebrew', Arial, sans-serif; margin: 0; background: #f6f7fb; color: #222; }
    header { background: #1f2937; color: #fff; padding: 12px 20px; }
    nav a { color: #fff; margin-inline-start: 16px; text-decoration: none; }
    main { padding: 20px; max-width: 1200px; margin: 0 auto; }
    .card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: right; }
    th { background: #f0f3f8; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .pill.ok { background: #d1fae5; color: #065f46; }
    .pill.warn { background: #fef3c7; color: #92400e; }
    .pill.bad { background: #fee2e2; color: #991b1b; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .kpi { padding: 16px; }
    .kpi h3 { margin: 0 0 8px; font-size: 14px; color: #6b7280; }
    .kpi .v { font-size: 24px; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <strong>מערכת מסמכים פיננסיים</strong>
    <nav>
      <a href="/#docs">מסמכים</a>
      <a href="/#aging">Aging</a>
      <a href="/#checks">צ'קים דחויים</a>
      <a href="/#customers">לקוחות</a>
    </nav>
  </header>
  <main>
    <section class="card">
      <h2>סקירה</h2>
      <div class="grid">
        <div class="kpi"><h3>חוב פתוח</h3><div class="v" id="kpi-open">—</div></div>
        <div class="kpi"><h3>בפיגור</h3><div class="v" id="kpi-overdue">—</div></div>
        <div class="kpi"><h3>צ'קים בשבוע הקרוב</h3><div class="v" id="kpi-checks">—</div></div>
        <div class="kpi"><h3>תזכורות שנשלחו (7 ימים)</h3><div class="v" id="kpi-reminders">—</div></div>
      </div>
    </section>

    <section class="card" id="aging">
      <h2>Aging</h2>
      <table>
        <thead>
          <tr><th>לקוח</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>סה"כ</th></tr>
        </thead>
        <tbody id="aging-body"><tr><td colspan="6">טוען…</td></tr></tbody>
      </table>
    </section>

    <section class="card" id="docs">
      <h2>מסמכים אחרונים</h2>
      <table>
        <thead><tr><th>מס׳</th><th>סוג</th><th>לקוח</th><th>תאריך</th><th>סה"כ</th><th>יתרה</th><th>סטטוס</th></tr></thead>
        <tbody id="docs-body"><tr><td colspan="7">טוען…</td></tr></tbody>
      </table>
    </section>
  </main>
  <script>
    const fmt = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(Number(n));
    const token = localStorage.getItem('token') || '';
    const H = { Authorization: 'Bearer ' + token };

    async function loadAging() {
      try {
        const r = await fetch('/api/aging', { headers: H });
        const rows = await r.json();
        const body = document.getElementById('aging-body');
        body.innerHTML = rows.map(x =>
          \`<tr><td>\${x.customerName}</td><td>\${fmt(x.bucket0_30)}</td><td>\${fmt(x.bucket31_60)}</td><td>\${fmt(x.bucket61_90)}</td><td>\${fmt(x.bucket90_plus)}</td><td><b>\${fmt(x.total)}</b></td></tr>\`
        ).join('') || '<tr><td colspan="6">אין חובות פתוחים</td></tr>';
        const totals = rows.reduce((a, x) => ({ open: a.open + x.total, ovd: a.ovd + x.bucket31_60 + x.bucket61_90 + x.bucket90_plus }), { open: 0, ovd: 0 });
        document.getElementById('kpi-open').textContent = fmt(totals.open);
        document.getElementById('kpi-overdue').textContent = fmt(totals.ovd);
      } catch (e) { console.warn(e); }
    }
    async function loadDocs() {
      try {
        const r = await fetch('/api/documents', { headers: H });
        const docs = await r.json();
        const body = document.getElementById('docs-body');
        body.innerHTML = docs.slice(0, 50).map(d => {
          const cls = d.status === 'PAID' ? 'ok' : (d.status === 'OVERDUE' ? 'bad' : 'warn');
          return \`<tr><td>\${d.number}</td><td>\${d.type}</td><td>\${d.customerId}</td><td>\${new Date(d.issueDate).toLocaleDateString('he-IL')}</td><td>\${fmt(d.total)}</td><td>\${fmt(d.balance)}</td><td><span class="pill \${cls}">\${d.status}</span></td></tr>\`;
        }).join('') || '<tr><td colspan="7">אין מסמכים</td></tr>';
      } catch (e) { console.warn(e); }
    }
    async function loadChecks() {
      try {
        const r = await fetch('/api/checks/upcoming?days=7', { headers: H });
        const arr = await r.json();
        document.getElementById('kpi-checks').textContent = arr.length;
      } catch (e) {}
    }
    loadAging(); loadDocs(); loadChecks();
  </script>
</body>
</html>`;
}
