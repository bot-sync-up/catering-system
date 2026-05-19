#!/usr/bin/env node
/**
 * compare-to-baseline.js
 * משווה את תוצאות k6 האחרונות לבייסליין שמור, מסמן רגרסיות > FAIL_PCT.
 * נכתב במכוון בלי תלויות (zero deps) כדי שירוץ ב-CI runner ריק.
 */

const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts';
const BASELINE_DIR = process.env.BASELINE_DIR || 'performance/reports/baseline-history';
const OUT_DIR = 'performance/reports/ci';
const FAIL_PCT = Number(process.env.FAIL_PCT || 10);
const WARN_PCT = Number(process.env.WARN_PCT || 5);

const METRICS_TO_TRACK = [
  { name: 'http_req_duration', stat: 'p(95)', label: 'p95 latency', unit: 'ms', higher_is_bad: true },
  { name: 'http_req_duration', stat: 'p(99)', label: 'p99 latency', unit: 'ms', higher_is_bad: true },
  { name: 'http_req_duration', stat: 'avg',  label: 'avg latency', unit: 'ms', higher_is_bad: true },
  { name: 'http_req_failed',   stat: 'rate', label: 'error rate',  unit: '%',  higher_is_bad: true, asPct: true },
  { name: 'iteration_duration',stat: 'avg',  label: 'iter avg',    unit: 'ms', higher_is_bad: true },
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function findCurrentResults() {
  const results = {};
  if (!fs.existsSync(ARTIFACTS_DIR)) return results;
  for (const dir of fs.readdirSync(ARTIFACTS_DIR)) {
    if (!dir.startsWith('k6-')) continue;
    const m = dir.match(/^k6-(.+)-\d+$/);
    if (!m) continue;
    const script = m[1];
    const dirPath = path.join(ARTIFACTS_DIR, dir);
    const file = fs.readdirSync(dirPath).find(f => f.endsWith('.json') && !f.endsWith('-raw.json'));
    if (!file) continue;
    try {
      results[script] = readJson(path.join(dirPath, file));
    } catch (e) {
      console.warn(`failed reading ${dir}: ${e.message}`);
    }
  }
  return results;
}

function findBaseline() {
  if (!fs.existsSync(BASELINE_DIR)) return {};
  const baseline = {};
  for (const file of fs.readdirSync(BASELINE_DIR)) {
    if (!file.endsWith('.json')) continue;
    const script = file.replace('.json', '');
    try {
      baseline[script] = readJson(path.join(BASELINE_DIR, file));
    } catch (e) {}
  }
  return baseline;
}

function extract(metricSummary, stat) {
  if (!metricSummary || !metricSummary.values) return null;
  if (stat === 'rate' && metricSummary.values.rate !== undefined) return metricSummary.values.rate;
  return metricSummary.values[stat] ?? null;
}

function pctDiff(curr, base) {
  if (base === 0 || base == null) return null;
  return ((curr - base) / base) * 100;
}

function fmt(v, unit, asPct) {
  if (v == null) return 'n/a';
  if (asPct) return (v * 100).toFixed(2) + '%';
  if (unit === 'ms') return v.toFixed(1) + 'ms';
  return v.toFixed(3);
}

function statusFor(diffPct, higherIsBad) {
  if (diffPct == null) return 'unknown';
  const dir = higherIsBad ? 1 : -1;
  const adj = diffPct * dir;
  if (adj >= FAIL_PCT) return 'fail';
  if (adj >= WARN_PCT) return 'warn';
  if (adj <= -WARN_PCT) return 'win';
  return 'pass';
}

function main() {
  const current = findCurrentResults();
  const baseline = findBaseline();

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const rows = [];
  let worstStatus = 'pass';

  for (const script of Object.keys(current)) {
    const c = current[script];
    const b = baseline[script];
    for (const def of METRICS_TO_TRACK) {
      const cm = c.metrics?.[def.name];
      const bm = b?.metrics?.[def.name];
      const cv = extract(cm, def.stat);
      const bv = bm ? extract(bm, def.stat) : null;
      const diff = bv != null && cv != null ? pctDiff(cv, bv) : null;
      const status = statusFor(diff, def.higher_is_bad);
      rows.push({ script, label: def.label, unit: def.unit, asPct: def.asPct, curr: cv, base: bv, diff, status });
      const rank = { fail: 3, warn: 2, pass: 1, win: 0, unknown: 0 };
      if (rank[status] > rank[worstStatus]) worstStatus = status;
    }
  }

  // כתוב summary.md
  const lines = [];
  lines.push(`# Performance regression report`);
  lines.push('');
  lines.push(`Status: **${worstStatus.toUpperCase()}** — FAIL_PCT=${FAIL_PCT}%, WARN_PCT=${WARN_PCT}%`);
  lines.push('');
  lines.push('| Script | Metric | Current | Baseline | Diff | Status |');
  lines.push('|--------|--------|---------|----------|------|--------|');
  for (const r of rows) {
    const diffStr = r.diff == null ? 'n/a' : (r.diff >= 0 ? '+' : '') + r.diff.toFixed(1) + '%';
    const emoji = { fail: 'FAIL', warn: 'WARN', pass: 'pass', win: 'WIN', unknown: '?' }[r.status];
    lines.push(`| ${r.script} | ${r.label} | ${fmt(r.curr, r.unit, r.asPct)} | ${fmt(r.base, r.unit, r.asPct)} | ${diffStr} | ${emoji} |`);
  }
  lines.push('');
  if (worstStatus === 'fail') {
    lines.push(`> רגרסיה זוהתה. נדרשת בדיקה לפני המשך deploy.`);
  } else if (worstStatus === 'warn') {
    lines.push(`> אזהרה — חצינו את סף ${WARN_PCT}% במדד אחד או יותר. כדאי לבדוק.`);
  } else {
    lines.push(`> כל המדדים בטווח הקביל.`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'compare-result.json'), JSON.stringify({ status: worstStatus, rows }, null, 2));

  // עדכון baseline אם הכל בסדר וזה main
  if (worstStatus !== 'fail' && process.env.GITHUB_REF === 'refs/heads/main') {
    if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });
    for (const [script, data] of Object.entries(current)) {
      fs.writeFileSync(path.join(BASELINE_DIR, `${script}.json`), JSON.stringify(data));
    }
  }

  // קבע output ל-GitHub
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${worstStatus === 'fail' ? 'fail' : 'pass'}\n`);
  }

  console.log(lines.join('\n'));
  process.exit(worstStatus === 'fail' ? 1 : 0);
}

main();
