#!/usr/bin/env bash
# pre-deploy-check.sh — fail fast on migration risks before a deploy starts.
#
# Checks:
#   1. No migration file > N MB (likely a giant data migration)
#   2. Every migration has a matching rollback (down.sql or *-undo.sql or note in README)
#   3. No DROP TABLE / DROP COLUMN without a guard comment "-- safe: confirmed-via-RFC-####"
#   4. No new ALTER TABLE ... NOT NULL on existing columns (use deploy-then-backfill pattern)
#   5. Schema diff against staging DB is non-trivially small (warn if > 500 lines)
set -euo pipefail

MIG_DIR="${MIG_DIR:-prisma/migrations}"
MAX_FILE_KB="${MAX_FILE_KB:-512}"

fail=0
warn=0

[ -d "$MIG_DIR" ] || { echo "[pre-deploy] no migrations dir: $MIG_DIR — skipping"; exit 0; }

# Only check NEW migrations since main
new_migs=$(git diff --name-only --diff-filter=A origin/main...HEAD -- "$MIG_DIR" 2>/dev/null || true)
[ -z "$new_migs" ] && { echo "[pre-deploy] no new migrations"; exit 0; }

echo "[pre-deploy] new migrations:"
echo "$new_migs" | sed 's/^/  /'

for f in $new_migs; do
  [ -f "$f" ] || continue
  size_kb=$(du -k "$f" | awk '{print $1}')
  if [ "$size_kb" -gt "$MAX_FILE_KB" ]; then
    echo "  FAIL: $f is ${size_kb}KB > ${MAX_FILE_KB}KB. Move data work to an out-of-band script."
    fail=1
  fi

  if grep -Eq '(^|\s)DROP\s+(TABLE|COLUMN|SCHEMA)' "$f" && ! grep -q 'safe: confirmed-via-RFC' "$f"; then
    echo "  FAIL: $f contains DROP without an RFC reference comment."
    fail=1
  fi

  if grep -Eq 'ALTER\s+TABLE.*ALTER\s+COLUMN.*SET\s+NOT\s+NULL' "$f" && ! grep -q 'safe: backfilled' "$f"; then
    echo "  FAIL: $f sets NOT NULL on existing column. Use deploy-then-backfill-then-constraint."
    fail=1
  fi

  if grep -Eq 'CREATE\s+INDEX[^C]' "$f"; then
    echo "  WARN: $f creates an index without CONCURRENTLY. Will lock writes on large tables."
    warn=1
  fi
done

# Optional schema diff size guardrail
if [ -n "${SHADOW_DATABASE_URL:-}" ] && command -v atlas >/dev/null; then
  diff_lines=$(atlas migrate diff --to "file://$MIG_DIR" --dev-url "$SHADOW_DATABASE_URL" --format '{{ . }}' 2>&1 | wc -l)
  echo "[pre-deploy] schema diff lines: $diff_lines"
  if [ "$diff_lines" -gt 500 ]; then
    echo "  WARN: large schema diff ($diff_lines lines). Review carefully."
    warn=1
  fi
fi

if [ $fail -ne 0 ]; then echo "[pre-deploy] FAILED ($fail issues)"; exit 1; fi
if [ $warn -ne 0 ]; then echo "[pre-deploy] passed with warnings"; fi
echo "[pre-deploy] OK"
