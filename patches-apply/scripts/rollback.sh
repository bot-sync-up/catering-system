#!/usr/bin/env bash
# rollback.sh — מחזיר את כל ה-patches שיושמו
#
# Usage:
#   ./rollback.sh <path-to-monorepo>
#
# מחזיר:
#   - .audit-bak  (מ-inject-audit.ts)
#   - .imports-bak (מ-migrate-imports.ts)
#   - תיקיית .patches-backup-YYYYMMDD-HHMMSS האחרונה (מ-apply-all-patches.sh)

set -euo pipefail

ROOT="${1:-}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
  echo "ERROR: צריך לתת path קיים ל-monorepo כפרמטר ראשון"
  echo "Usage: $0 <path-to-monorepo>"
  exit 1
fi

ROOT="$(cd "$ROOT" && pwd)"
echo "Rolling back patches in: $ROOT"
echo ""

# ---------------------------------------------------------------------------
# 1. החזרת .audit-bak (inject-audit.ts)
# ---------------------------------------------------------------------------
AUDIT_BAK_COUNT=0
while IFS= read -r -d '' bak; do
  original="${bak%.audit-bak}"
  cp "$bak" "$original"
  rm "$bak"
  AUDIT_BAK_COUNT=$((AUDIT_BAK_COUNT + 1))
  echo "  ✓ Restored $original (from .audit-bak)"
done < <(find "$ROOT" -name '*.audit-bak' -type f -print0 2>/dev/null)

echo "Audit backups restored: $AUDIT_BAK_COUNT"
echo ""

# ---------------------------------------------------------------------------
# 2. החזרת .imports-bak (migrate-imports.ts)
# ---------------------------------------------------------------------------
IMPORTS_BAK_COUNT=0
while IFS= read -r -d '' bak; do
  original="${bak%.imports-bak}"
  cp "$bak" "$original"
  rm "$bak"
  IMPORTS_BAK_COUNT=$((IMPORTS_BAK_COUNT + 1))
  echo "  ✓ Restored $original (from .imports-bak)"
done < <(find "$ROOT" -name '*.imports-bak' -type f -print0 2>/dev/null)

echo "Imports backups restored: $IMPORTS_BAK_COUNT"
echo ""

# ---------------------------------------------------------------------------
# 3. החזרה מ-.patches-backup-* (apply-all-patches.sh)
# ---------------------------------------------------------------------------
LATEST_BACKUP=$(ls -dt "$ROOT"/.patches-backup-* 2>/dev/null | head -1 || true)
APPLY_BAK_COUNT=0

if [ -n "$LATEST_BACKUP" ] && [ -d "$LATEST_BACKUP" ]; then
  echo "Using backup: $LATEST_BACKUP"
  while IFS= read -r -d '' bak; do
    # שם בקובץ ה-backup הוא path/separator='_'
    rel_name=$(basename "$bak" .bak)
    original=$(echo "$rel_name" | tr '_' '/')
    target="$ROOT/$original"
    if [ -f "$target" ]; then
      cp "$bak" "$target"
      APPLY_BAK_COUNT=$((APPLY_BAK_COUNT + 1))
      echo "  ✓ Restored $target"
    fi
  done < <(find "$LATEST_BACKUP" -name '*.bak' -type f -print0 2>/dev/null)
  echo "apply-all-patches backups restored: $APPLY_BAK_COUNT"
else
  echo "WARN: לא נמצאה תיקיית .patches-backup-* — דלג"
fi

# ---------------------------------------------------------------------------
# 4. מחיקת הלוג
# ---------------------------------------------------------------------------
if [ -f "$ROOT/.patches-applied.log" ]; then
  rm "$ROOT/.patches-applied.log"
  echo "  ✓ Removed .patches-applied.log"
fi

echo ""
echo "================================================================"
echo "✓ Rollback complete"
echo "  Audit backups: $AUDIT_BAK_COUNT files"
echo "  Imports backups: $IMPORTS_BAK_COUNT files"
echo "  apply-all-patches backups: $APPLY_BAK_COUNT files"
echo ""
echo "המלצה: pnpm install && pnpm typecheck לאחר ה-rollback."
echo "================================================================"
