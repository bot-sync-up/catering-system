/**
 * Diff HTML report — בונה דו"ח HTML פשוט שמשווה מצב לפני/אחרי.
 *
 * השימוש: לפני הריצה נשמרת snapshot של ספירות. אחרי הריצה הקובץ נוצר עם
 * טבלאות "לפני / אחרי / הפרש" + רשימת אזהרות.
 */

import { promises as fs } from "fs";
import path from "path";
import type { CountMatchResult, IntegrityIssue } from "../validate/index.js";

export interface DiffInputs {
  batchId: string;
  startedAt: string;
  finishedAt: string;
  beforeCounts: Record<string, number>;
  afterCounts: Record<string, number>;
  countMatches: CountMatchResult[];
  integrityIssues: IntegrityIssue[];
  errors: Array<{ sourceModule: string; originalId: string; targetModel: string; message: string }>;
}

export async function writeHtmlDiffReport(input: DiffInputs, outPath: string): Promise<void> {
  const html = renderHtml(input);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, "utf-8");
}

function renderHtml(d: DiffInputs): string {
  const rows = Object.keys({ ...d.beforeCounts, ...d.afterCounts })
    .sort()
    .map((k) => {
      const before = d.beforeCounts[k] ?? 0;
      const after = d.afterCounts[k] ?? 0;
      const delta = after - before;
      const colour = delta > 0 ? "#1a7" : delta < 0 ? "#a33" : "#666";
      return `<tr><td>${escapeHtml(k)}</td><td>${before}</td><td>${after}</td><td style="color:${colour}">${delta >= 0 ? "+" : ""}${delta}</td></tr>`;
    })
    .join("\n");

  const matches = d.countMatches
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.sourceModule)}</td><td>${escapeHtml(m.sourceTable)}</td><td>${escapeHtml(m.targetModel)}</td><td>${m.sourceCount}</td><td>${m.targetCount}</td><td style="color:${m.ok ? "#1a7" : "#a33"}">${m.ok ? "✓" : "✗"} (${m.diff})</td></tr>`,
    )
    .join("\n");

  const issues = d.integrityIssues
    .map(
      (i) =>
        `<li><strong>${escapeHtml(i.check)}</strong> [${escapeHtml(i.table)}] — ${escapeHtml(i.message)}<br/><small>${i.ids.slice(0, 10).map(escapeHtml).join(", ")}${i.ids.length > 10 ? "…" : ""}</small></li>`,
    )
    .join("\n");

  const errs = d.errors
    .slice(0, 200)
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.sourceModule)}</td><td>${escapeHtml(e.originalId)}</td><td>${escapeHtml(e.targetModel)}</td><td>${escapeHtml(e.message)}</td></tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8" />
<title>דו"ח מיגרציה — ${escapeHtml(d.batchId)}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
  h1 { color: #224; }
  h2 { color: #335; border-bottom: 1px solid #cce; padding-bottom: .3rem; margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
  th, td { border: 1px solid #ccd; padding: .35rem .6rem; text-align: right; }
  th { background: #eef; }
  tr:nth-child(even) td { background: #f7f8fc; }
  .meta { color: #557; font-size: .9rem; }
  ul.issues li { margin: .4rem 0; }
</style>
</head>
<body>
<h1>דו"ח מיגרציה</h1>
<p class="meta">
  <strong>Batch:</strong> ${escapeHtml(d.batchId)}<br/>
  <strong>החל:</strong> ${escapeHtml(d.startedAt)}<br/>
  <strong>סיים:</strong> ${escapeHtml(d.finishedAt)}
</p>

<h2>השוואת ספירות (לפני / אחרי)</h2>
<table>
  <thead><tr><th>טבלה</th><th>לפני</th><th>אחרי</th><th>הפרש</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="4">אין נתונים</td></tr>`}</tbody>
</table>

<h2>התאמה בין מקור ליעד</h2>
<table>
  <thead><tr><th>מקור</th><th>טבלת מקור</th><th>טבלת יעד</th><th>מקור</th><th>יעד</th><th>סטטוס</th></tr></thead>
  <tbody>${matches || `<tr><td colspan="6">אין נתונים</td></tr>`}</tbody>
</table>

<h2>בעיות שלמות (Integrity)</h2>
<ul class="issues">${issues || `<li>אין בעיות שלמות שזוהו ✓</li>`}</ul>

<h2>שגיאות פר־שורה (עד 200)</h2>
<table>
  <thead><tr><th>מקור</th><th>מזהה מקורי</th><th>יעד</th><th>הודעה</th></tr></thead>
  <tbody>${errs || `<tr><td colspan="4">אין שגיאות</td></tr>`}</tbody>
</table>

</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
