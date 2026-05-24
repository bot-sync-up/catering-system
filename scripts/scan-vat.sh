#!/usr/bin/env bash
# scan-vat.sh - סקריפט סריקה לדפוסי VAT 17%
# מטרה: לאתר את כל המופעים של מע"מ 17% בקוד לקראת המעבר ל-18%
# תקף: החל מ-1/1/2025
#
# שימוש:
#   ./scan-vat.sh <worktrees-root>
# דוגמה:
#   ./scan-vat.sh /c/Users/user/.claude/worktrees
#
# פלט: רשימה מקובצת לפי worktree+קובץ+שורה ל-stdout.
#      מסכם בקובץ JSON (vat-scan-results.json) ב-cwd.

set -euo pipefail

ROOT="${1:-.}"
OUT_JSON="${OUT_JSON:-vat-scan-results.json}"

# דפוסי חיפוש (regex) - מכסה דרכי כתיבה נפוצות של 17% VAT
PATTERNS=(
  'vat:\s*17'
  'VAT_RATE[^0-9]*17'
  '\b0\.17\b'
  '\b1\.17\b'
  '\*\s*0\.17'
  'מע"מ.*17%'
  'מע״מ.*17%'
  'vatRate\s*[:=]\s*17'
  'vat_rate\s*[:=]\s*17'
  'VatRate\s*[:=]\s*17'
)

# סיומות קוד רלוונטיות בלבד
INCLUDE_GLOBS=(
  '--include=*.ts'
  '--include=*.tsx'
  '--include=*.js'
  '--include=*.jsx'
  '--include=*.cs'
  '--include=*.java'
  '--include=*.py'
  '--include=*.php'
  '--include=*.sql'
  '--include=*.json'
  '--include=*.yml'
  '--include=*.yaml'
  '--include=*.env*'
  '--include=*.config'
)

EXCLUDE_DIRS=(
  '--exclude-dir=node_modules'
  '--exclude-dir=.git'
  '--exclude-dir=dist'
  '--exclude-dir=build'
  '--exclude-dir=.next'
  '--exclude-dir=coverage'
  '--exclude-dir=.turbo'
)

echo "VAT 17% Scan - root: $ROOT"
echo "============================================"

declare -A WT_COUNT

results_jsonl=""
total_hits=0

# סורק כל worktree בנפרד
for worktree_dir in "$ROOT"/*/; do
  [ -d "$worktree_dir" ] || continue
  wt_name=$(basename "$worktree_dir")
  wt_hits=0

  for pat in "${PATTERNS[@]}"; do
    # grep recursive עם line numbers, מבלי לעצור על שגיאות
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      wt_hits=$((wt_hits + 1))
      total_hits=$((total_hits + 1))
      # פורמט: file:line:content
      file=$(echo "$line" | cut -d: -f1)
      lineno=$(echo "$line" | cut -d: -f2)
      content=$(echo "$line" | cut -d: -f3-)
      printf '[%s] %s:%s\n    %s\n' "$wt_name" "$file" "$lineno" "$content"
      results_jsonl+="{\"worktree\":\"$wt_name\",\"file\":\"$file\",\"line\":$lineno,\"pattern\":\"$pat\"}"$'\n'
    done < <(grep -RnE "${EXCLUDE_DIRS[@]}" "${INCLUDE_GLOBS[@]}" -- "$pat" "$worktree_dir" 2>/dev/null || true)
  done

  if [ "$wt_hits" -gt 0 ]; then
    WT_COUNT[$wt_name]=$wt_hits
    echo "--- $wt_name: $wt_hits hits ---"
  fi
done

echo ""
echo "============================================"
echo "סיכום סריקה:"
echo "סה\"כ hits: $total_hits"
echo "סה\"כ worktrees פגועים: ${#WT_COUNT[@]}"
echo ""
for wt in "${!WT_COUNT[@]}"; do
  printf '  %-40s %d\n' "$wt" "${WT_COUNT[$wt]}"
done

# כתיבת JSONL לקובץ
printf '%s' "$results_jsonl" > "$OUT_JSON"
echo ""
echo "תוצאות מפורטות נכתבו ל: $OUT_JSON"
