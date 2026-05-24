#!/bin/bash
# generate-html.sh <results.json> <pass> <fail> <skip> <duration_sec>
# Builds smoke-results.html (Hebrew RTL) from the JSON results.

RESULTS="${1:-./smoke-results.json}"
PASS="${2:-0}"
FAIL="${3:-0}"
SKIP="${4:-0}"
DURATION="${5:-0}"
OUT="$(dirname "$0")/smoke-results.html"

TOTAL=$((PASS + FAIL + SKIP))
PASS_PCT=0
if [ "$TOTAL" -gt 0 ]; then
  PASS_PCT=$(( PASS * 100 / TOTAL ))
fi
STATUS_LABEL="עבר בהצלחה"
STATUS_CLASS="ok"
if [ "$FAIL" -gt 0 ]; then
  STATUS_LABEL="נכשל"
  STATUS_CLASS="fail"
fi

NOW=$(date '+%Y-%m-%d %H:%M:%S')

# Read results JSON into HTML rows (very small JSON parser inline)
ROWS=""
if [ -f "$RESULTS" ]; then
  ROWS=$(node -e "
    const fs=require('fs');
    const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
    const esc=s=>String(s||'').replace(/[<>&\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','\"':'&quot;'})[c]);
    console.log(d.map(r=>{
      const cls=r.status==='pass'?'ok':r.status==='fail'?'fail':'skip';
      const icon=r.status==='pass'?'✔':r.status==='fail'?'✖':'—';
      return \`<tr class=\"\${cls}\">
        <td class=\"step\">#\${r.step}</td>
        <td class=\"name\">\${esc(r.name)}</td>
        <td class=\"status\">\${icon} \${r.status.toUpperCase()}</td>
        <td class=\"dur\">\${r.duration_ms}ms</td>
        <td class=\"err\">\${esc(r.error||'')}</td>
      </tr>\`;
    }).join('\n'));
  " "$RESULTS" 2>/dev/null || echo "")
fi

cat > "$OUT" <<HTML
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תוצאות Smoke Tests - $NOW</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --ok: #22c55e;
      --fail: #ef4444;
      --skip: #f59e0b;
      --accent: #3b82f6;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Heebo', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border);
    }
    h1 { margin: 0; font-size: 28px; }
    .timestamp { color: var(--muted); font-size: 14px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .card .value { font-size: 36px; font-weight: 700; }
    .card .label { color: var(--muted); font-size: 14px; margin-top: 4px; }
    .card.ok .value { color: var(--ok); }
    .card.fail .value { color: var(--fail); }
    .card.skip .value { color: var(--skip); }
    .card.total .value { color: var(--accent); }
    .status-banner {
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 24px;
    }
    .status-banner.ok { background: rgba(34,197,94,0.15); color: var(--ok); border: 1px solid var(--ok); }
    .status-banner.fail { background: rgba(239,68,68,0.15); color: var(--fail); border: 1px solid var(--fail); }
    .progress {
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin: 16px 0 24px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--ok), #16a34a);
      width: ${PASS_PCT}%;
      transition: width 0.5s ease;
    }
    table {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: right;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: rgba(59,130,246,0.1);
      font-weight: 600;
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:last-child td { border-bottom: none; }
    tr.ok { background: rgba(34,197,94,0.05); }
    tr.fail { background: rgba(239,68,68,0.08); }
    tr.skip { background: rgba(245,158,11,0.05); }
    tr.ok .status { color: var(--ok); font-weight: 600; }
    tr.fail .status { color: var(--fail); font-weight: 700; }
    tr.skip .status { color: var(--skip); font-weight: 600; }
    .step { color: var(--muted); font-family: monospace; font-size: 13px; }
    .name { font-weight: 500; }
    .dur { color: var(--muted); font-family: monospace; font-size: 13px; }
    .err { color: var(--fail); font-size: 12px; font-family: monospace; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
    footer {
      margin-top: 32px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
    .filters {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .filter-btn {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
    }
    .filter-btn:hover { background: var(--border); }
    .filter-btn.active { background: var(--accent); border-color: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>תוצאות Smoke Tests</h1>
      <div class="timestamp">עודכן לאחרונה: $NOW</div>
    </header>

    <div class="status-banner $STATUS_CLASS">
      סטטוס כללי: $STATUS_LABEL
    </div>

    <div class="summary">
      <div class="card total">
        <div class="value">$TOTAL</div>
        <div class="label">סך הכל בדיקות</div>
      </div>
      <div class="card ok">
        <div class="value">$PASS</div>
        <div class="label">עברו</div>
      </div>
      <div class="card fail">
        <div class="value">$FAIL</div>
        <div class="label">נכשלו</div>
      </div>
      <div class="card skip">
        <div class="value">$SKIP</div>
        <div class="label">דולגו</div>
      </div>
      <div class="card">
        <div class="value">${DURATION}s</div>
        <div class="label">זמן ריצה</div>
      </div>
    </div>

    <div class="progress"><div class="progress-bar"></div></div>

    <div class="filters">
      <button class="filter-btn active" onclick="filter('all')">הכל</button>
      <button class="filter-btn" onclick="filter('ok')">עברו</button>
      <button class="filter-btn" onclick="filter('fail')">נכשלו</button>
      <button class="filter-btn" onclick="filter('skip')">דולגו</button>
    </div>

    <table id="results">
      <thead>
        <tr>
          <th>#</th>
          <th>בדיקה</th>
          <th>סטטוס</th>
          <th>משך</th>
          <th>שגיאה</th>
        </tr>
      </thead>
      <tbody>
        $ROWS
      </tbody>
    </table>

    <footer>
      Smoke Test Harness | Sync Up Catering Platform | $NOW
    </footer>
  </div>

  <script>
    function filter(type) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.querySelectorAll('#results tbody tr').forEach(tr => {
        tr.style.display = (type === 'all' || tr.classList.contains(type)) ? '' : 'none';
      });
    }
  </script>
</body>
</html>
HTML

echo "Dashboard written to $OUT"
