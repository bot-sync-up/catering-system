#!/usr/bin/env bash
# ============================================================
# import-worktrees.sh
# העתקת source code מ-25 worktrees לתוך מבנה המונורפו
# ============================================================
# שימוש:
#   bash scripts/import-worktrees.sh             # dry-run (ברירת מחדל)
#   bash scripts/import-worktrees.sh --apply     # ביצוע בפועל
#   bash scripts/import-worktrees.sh --apply 06  # רק worktree 06
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT_BASE="${WT_BASE:-$HOME/.claude/worktrees}"
APPLY=0
ONLY=""

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --help|-h)
      grep '^#' "$0" | head -20
      exit 0 ;;
    *) ONLY="$arg" ;;
  esac
done

# שינוי לפי הסביבה (Windows MSYS / WSL / Linux)
if [[ ! -d "$WT_BASE" ]]; then
  if [[ -d "/c/Users/user/.claude/worktrees" ]]; then
    WT_BASE="/c/Users/user/.claude/worktrees"
  elif [[ -d "$USERPROFILE/.claude/worktrees" ]]; then
    WT_BASE="$USERPROFILE/.claude/worktrees"
  fi
fi

echo "[INFO] ROOT  = $ROOT"
echo "[INFO] WT    = $WT_BASE"
echo "[INFO] APPLY = $APPLY"
echo ""

# מיפוי: <id>|<src_worktree>|<rsync_pattern>|<destination_path>
# rsync_pattern - מה להעתיק מתוך ה-worktree (relative)
MAPPING=(
  "01|agent-ac2389dbcde5e8bd9|docker/|docker/"
  "01b|agent-ac2389dbcde5e8bd9|nginx.conf|services/gateway/nginx.conf"
  "01c|agent-ac2389dbcde5e8bd9|scripts/|scripts/_imported/01-infra/"
  "01d|agent-ac2389dbcde5e8bd9|apps/admin/|apps/admin/"
  "01e|agent-ac2389dbcde5e8bd9|packages/|packages/_imported/01/"

  "02|agent-abcfc839a28d7b588|prisma/|packages/db/prisma/"
  "02b|agent-abcfc839a28d7b588|src/|packages/db/src/"

  "03|agent-a0d949436df27ed12|src/|packages/auth/src/"
  "04|agent-a5e9ec7d29999be9c|src/|packages/audit/src/"

  "05|agent-ad2220241a52022d0|src/|apps/crm/src/"
  "05b|agent-ad2220241a52022d0|prisma/|apps/crm/prisma/"

  "06|agent-a3864f31565b63390|src/|apps/orders/src/"
  "06b|agent-a3864f31565b63390|prisma/|apps/orders/prisma/"
  "06c|agent-a3864f31565b63390|tests/|apps/orders/tests/"

  "07|agent-aecddcb45d3db0342|src/|apps/web-portal/src/"
  "08|agent-a1f475c6464b1f625|src/|apps/menus/src/"
  "09|agent-adc7b003297d67905|src/|apps/recipes/src/"
  "10|agent-a9490fdab3005fda1|src/|apps/inventory/src/"
  "11|agent-a23e11108be93681b|src/|apps/suppliers/src/"

  "12|agent-a9ab30939b7e8e2c3|src/|apps/ocr/src/"
  "12b|agent-a9ab30939b7e8e2c3|workers/|services/worker/src/ocr/"

  "13|agent-ab6c0dce79413e79f|src/|apps/events/src/"
  "14|agent-aa05ac323e9015be7|src/|apps/logistics/src/"
  "15|agent-a50ad709234b49b0b|src/|apps/hr/src/"
  "16|agent-ab96ab384014c8442|src/|apps/payroll/src/"
  "17|agent-a31b566159e7cc878|src/|apps/invoices/src/"

  "18|agent-accb121134afd7c1a|src/|packages/integrations/icount/src/"
  "19|agent-a91fe015c553e924f|src/|packages/integrations/cardcom/src/"

  "20|agent-a016172202c9645f0|src/|apps/expenses/src/"
  "21|agent-a2f8c66ff540bd496|src/|apps/fleet/src/"

  "22|agent-a0cfd9be4e88397cc|src/|apps/bi/src/"
  "22b|agent-a0cfd9be4e88397cc|workers/|services/worker/src/bi/"

  "23|agent-a7f6f8c320f0b1219|marketing-platform/src/|apps/marketing/src/"
  "23b|agent-a7f6f8c320f0b1219|marketing-platform/integrations/email/|packages/integrations/email/src/"
  "23c|agent-a7f6f8c320f0b1219|marketing-platform/integrations/sms/|packages/integrations/sms/src/"
  "23d|agent-a7f6f8c320f0b1219|marketing-platform/integrations/whatsapp/|packages/integrations/whatsapp/src/"

  "24|agent-a4541f69f7ac884b2|src/|apps/public-site/src/"
  "25|agent-a869d3b70f23a9a88|src/|apps/mobile/src/"
  "25b|agent-a869d3b70f23a9a88|app.json|apps/mobile/app.json"
  "25c|agent-a869d3b70f23a9a88|assets/|apps/mobile/assets/"
)

# rsync excludes משותפים — אסור להעתיק
EXCLUDES=(
  "--exclude=node_modules"
  "--exclude=.next"
  "--exclude=.turbo"
  "--exclude=dist"
  "--exclude=build"
  "--exclude=out"
  "--exclude=coverage"
  "--exclude=.git"
  "--exclude=.env"
  "--exclude=.env.local"
  "--exclude=package-lock.json"
  "--exclude=yarn.lock"
  "--exclude=pnpm-lock.yaml"
  "--exclude=*.log"
)

copy_one() {
  local id="$1" src_wt="$2" src_pat="$3" dest_rel="$4"
  local src="$WT_BASE/$src_wt/$src_pat"
  local dest="$ROOT/$dest_rel"

  if [[ ! -e "$src" ]]; then
    echo "[SKIP $id] חסר במקור: $src"
    return 0
  fi

  echo "[$id] $src_wt :: $src_pat  -->  $dest_rel"
  if (( APPLY == 1 )); then
    mkdir -p "$(dirname "$dest")"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a "${EXCLUDES[@]}" "$src" "$dest"
    else
      # fallback ל-cp ב-Windows ללא rsync
      cp -R "$src" "$dest"
    fi
  fi
}

for entry in "${MAPPING[@]}"; do
  IFS='|' read -r id src_wt src_pat dest_rel <<<"$entry"
  if [[ -n "$ONLY" && "${id%%[a-z]*}" != "$ONLY" ]]; then
    continue
  fi
  copy_one "$id" "$src_wt" "$src_pat" "$dest_rel"
done

echo ""
if (( APPLY == 0 )); then
  echo "[DRY-RUN] לא בוצעה העתקה בפועל. הרץ עם --apply לביצוע."
else
  echo "[DONE] העתקה הושלמה. הרץ:"
  echo "  pnpm install"
  echo "  pnpm typecheck   # לבדיקת קונפליקטים"
fi
