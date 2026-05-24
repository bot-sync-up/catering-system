#!/usr/bin/env bash
# apply-all-patches.sh — מיישם את כל ה-patches על monorepo נתון
#
# Usage:
#   ./apply-all-patches.sh <path-to-monorepo>
#
# מקור: patches-apply/MASTER-PATCHES.md
# סדר ה-patches: VAT, JWT, OTP, Cookies, 2FA, Cardcom, XSS, Privacy, Imports
# הסקריפט עוצר על שגיאות (set -e) ויוצר .bak לכל קובץ שנגעו בו.

set -euo pipefail

ROOT="${1:-}"
if [ -z "$ROOT" ] || [ ! -d "$ROOT" ]; then
  echo "ERROR: צריך לתת path קיים ל-monorepo כפרמטר ראשון"
  echo "Usage: $0 <path-to-monorepo>"
  exit 1
fi

ROOT="$(cd "$ROOT" && pwd)"
LOG_FILE="${ROOT}/.patches-applied.log"
BACKUP_DIR="${ROOT}/.patches-backup-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
echo "Backup dir: $BACKUP_DIR"
echo "Log file:   $LOG_FILE"
echo "" > "$LOG_FILE"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

# פונקציה לסריקה+שינוי ב-batch עם backup
sed_in_files() {
  local pattern="$1"
  local replacement="$2"
  local glob="$3"
  local desc="$4"
  local count=0

  # OS-aware sed (BSD על macOS, GNU על Linux)
  local sed_inplace
  if sed --version 2>/dev/null | grep -q GNU; then
    sed_inplace="sed -i.bak"
  else
    sed_inplace="sed -i.bak"
  fi

  while IFS= read -r -d '' file; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      cp "$file" "$BACKUP_DIR/$(echo "$file" | sed "s|$ROOT/||" | tr '/' '_').bak"
      $sed_inplace -E "s|${pattern}|${replacement}|g" "$file"
      rm -f "${file}.bak"
      count=$((count + 1))
    fi
  done < <(find "$ROOT" -type f \( $glob \) \
            -not -path '*/node_modules/*' \
            -not -path '*/.git/*' \
            -not -path '*/dist/*' \
            -not -path '*/.next/*' \
            -not -path '*/.turbo/*' \
            -not -path '*/build/*' \
            -not -path "$BACKUP_DIR/*" \
            -print0)

  log "  $desc: $count files modified"
}

# ----------------------------------------------------------------------------
# Patch 1: VAT 17% → 18%
# ----------------------------------------------------------------------------
log "=== Patch 1: VAT 17% → 18% ==="

sed_in_files \
  'vatRate:\s*0\.17' \
  'vatRate: 0.18' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx' \
  "vatRate: 0.17 → 0.18"

sed_in_files \
  'VAT_RATE\s*=\s*0\.17' \
  'VAT_RATE = 0.18' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx' \
  "VAT_RATE = 0.17 → 0.18"

sed_in_files \
  'VAT_RATE\s*=\s*17' \
  'VAT_RATE = 18' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx' \
  "VAT_RATE = 17 → 18"

sed_in_files \
  'vat:\s*17([^0-9])' \
  'vat: 18\1' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx -o -name *.json' \
  "vat: 17 → 18"

sed_in_files \
  '\*\s*0\.17\b' \
  '* 0.18' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx' \
  "multiplication * 0.17 → * 0.18"

sed_in_files \
  '\*\s*1\.17\b' \
  '* 1.18' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx' \
  "multiplication * 1.17 → * 1.18"

sed_in_files \
  'מע"מ\s*17%' \
  'מע"מ 18%' \
  '-name *.ts -o -name *.tsx -o -name *.js -o -name *.jsx -o -name *.json -o -name *.html' \
  "Hebrew UI string 17% → 18%"

# SQL migrations
sed_in_files \
  'vatRate\s*=\s*0\.17' \
  'vatRate = 0.18' \
  '-name *.sql' \
  "SQL vatRate = 0.17 → 0.18"

sed_in_files \
  'vat_rate\s*=\s*0\.17' \
  'vat_rate = 0.18' \
  '-name *.sql' \
  "SQL vat_rate = 0.17 → 0.18"

log "  WARN: יש להריץ ידנית migrations/vat-migration.sql ל-DB"

# ----------------------------------------------------------------------------
# Patch 2: JWT_SECRET חזק
# ----------------------------------------------------------------------------
log "=== Patch 2: JWT_SECRET חזק ==="

# יצירת secret חדש (לא ניתן ל-sed להזריק אותו ישירות כי כל קובץ צריך warning)
NEW_JWT_ACCESS=$(openssl rand -base64 48 2>/dev/null || echo "REPLACE_ME_MANUALLY_$(date +%s)")
NEW_JWT_REFRESH=$(openssl rand -base64 48 2>/dev/null || echo "REPLACE_ME_MANUALLY_$(date +%s)b")

# החלפת .env.example בלבד (לא נוגעים ב-.env אמיתי)
find "$ROOT" -name '.env.example' -not -path '*/node_modules/*' -print0 | while IFS= read -r -d '' file; do
  if grep -qE 'JWT_SECRET\s*=\s*(change[-_]?me|secret|password|12345)' "$file"; then
    cp "$file" "$BACKUP_DIR/$(echo "$file" | sed "s|$ROOT/||" | tr '/' '_').bak"
    sed -i.bak -E "s|JWT_SECRET\s*=\s*.*|JWT_ACCESS_SECRET=__GENERATE_WITH_openssl_rand_base64_48__\nJWT_REFRESH_SECRET=__GENERATE_WITH_openssl_rand_base64_48__\nJWT_ACCESS_TTL=15m\nJWT_REFRESH_TTL=7d|g" "$file"
    rm -f "${file}.bak"
    log "  Updated $file"
  fi
done

# אזהרה לכל .env (לא .env.example) שמכיל ערך חלש
find "$ROOT" -name '.env' -o -name '.env.local' -o -name '.env.production' 2>/dev/null \
  | while read -r file; do
  if grep -qE 'JWT_SECRET\s*=\s*(change[-_]?me|secret|password|12345)' "$file" 2>/dev/null; then
    log "  CRITICAL: $file מכיל JWT_SECRET חלש — יש להחליף ידנית עם openssl rand -base64 48"
  fi
done

# ----------------------------------------------------------------------------
# Patch 3: OTP crypto.randomInt (מ-Math.random)
# ----------------------------------------------------------------------------
log "=== Patch 3: OTP crypto.randomInt ==="

# סריקה — לא מחליפים אוטומטית כי דורש שינוי import. רק warning.
MATH_RANDOM_OTP=$(grep -RnE 'Math\.random\(\).*(otp|verification|code|token|secret)' \
  --include='*.ts' --include='*.tsx' --include='*.js' \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
  "$ROOT" 2>/dev/null | wc -l)

log "  Math.random ב-OTP/security contexts: $MATH_RANDOM_OTP hits"
log "  WARN: יש להחליף ידנית ב-generateOTP() מ-@catering/otp"

if [ "$MATH_RANDOM_OTP" -gt 0 ]; then
  grep -RnE 'Math\.random\(\).*(otp|verification|code|token|secret)' \
    --include='*.ts' --include='*.tsx' --include='*.js' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next \
    "$ROOT" 2>/dev/null >> "$LOG_FILE" || true
fi

# ----------------------------------------------------------------------------
# Patch 4: Cookie Secure+HttpOnly+SameSite
# ----------------------------------------------------------------------------
log "=== Patch 4: Cookie Secure+HttpOnly+SameSite ==="

# סורק res.cookie ללא דגלים — warning בלבד
COOKIE_HITS=$(grep -RnE 'res\.cookie\(' --include='*.ts' --include='*.js' \
  --exclude-dir=node_modules --exclude-dir=dist \
  "$ROOT" 2>/dev/null | grep -v 'buildSetCookie\|secure:\s*true' | wc -l)

log "  res.cookie() ללא דגלי אבטחה: $COOKIE_HITS hits"
log "  WARN: יש להחליף ב-buildSetCookie() מ-@catering/cookies"

# ----------------------------------------------------------------------------
# Patch 5: 2FA חובה למנהלים
# ----------------------------------------------------------------------------
log "=== Patch 5: 2FA חובה למנהלים ==="

# סורק admin routes ללא require2FA
ADMIN_HITS=$(grep -RnE "app\.use\(['\"]/admin|router\.use\(['\"]/admin" \
  --include='*.ts' --include='*.js' \
  --exclude-dir=node_modules --exclude-dir=dist \
  "$ROOT" 2>/dev/null | grep -v 'require2FA' | wc -l)

log "  admin routes ללא require2FA: $ADMIN_HITS hits"
log "  WARN: יש להוסיף require2FA({ roles: ['admin','finance','dpo'] }) ל-middleware chain"

# ----------------------------------------------------------------------------
# Patch 6: Cardcom Zero-PCI
# ----------------------------------------------------------------------------
log "=== Patch 6: Cardcom Zero-PCI ==="

PCI_HITS=$(grep -RnE '\b(cardNumber|cvv|cvc|pan)\b\s*[:=]' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=dist \
  --exclude-dir=pci-validator \
  "$ROOT" 2>/dev/null | wc -l)

log "  PCI fields בקוד (cardNumber/cvv/pan): $PCI_HITS hits"
if [ "$PCI_HITS" -gt 0 ]; then
  log "  CRITICAL: יש להחליף ב-TokenizeInputSchema מ-@catering/cardcom-production"
fi

# ----------------------------------------------------------------------------
# Patch 7: XSS Sanitizer
# ----------------------------------------------------------------------------
log "=== Patch 7: XSS Sanitizer (DOMPurify) ==="

XSS_HITS=$(grep -RnE 'dangerouslySetInnerHTML' \
  --include='*.tsx' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=dist \
  "$ROOT" 2>/dev/null | grep -v 'sanitize' | wc -l)

log "  dangerouslySetInnerHTML ללא sanitize: $XSS_HITS hits"
log "  WARN: יש לעטוף ב-sanitizeRichText() מ-@catering/xss-sanitizer"

# ----------------------------------------------------------------------------
# Patch 8: Audit middleware (מועבר ל-inject-audit.ts)
# ----------------------------------------------------------------------------
log "=== Patch 8: Audit middleware — מועבר ל-inject-audit.ts ==="
log "  הרץ: ts-node patches-apply/scripts/inject-audit.ts $ROOT"

# ----------------------------------------------------------------------------
# Patch 9: Privacy endpoints
# ----------------------------------------------------------------------------
log "=== Patch 9: Privacy endpoints ==="

# בודק האם קיים apps/privacy-portal
if [ ! -d "$ROOT/apps/privacy-portal" ]; then
  log "  WARN: apps/privacy-portal חסר. העתק מ-agent-a58118e7d348be81b/apps/privacy-portal"
fi

# מציע ל-apps אחרים להוסיף route handler
for app_dir in "$ROOT"/apps/*/; do
  app_name=$(basename "$app_dir")
  [ "$app_name" = "privacy-portal" ] && continue
  if [ -d "$app_dir/src/app/api" ] && [ ! -d "$app_dir/src/app/api/privacy" ]; then
    log "  apps/$app_name חסר /api/privacy/* — שקול mount או re-export"
  fi
done

# ----------------------------------------------------------------------------
# Patch 10: Imports migration (מועבר ל-migrate-imports.ts)
# ----------------------------------------------------------------------------
log "=== Patch 10: Imports migration — מועבר ל-migrate-imports.ts ==="
log "  הרץ: ts-node patches-apply/scripts/migrate-imports.ts $ROOT"

# ----------------------------------------------------------------------------
# סיכום
# ----------------------------------------------------------------------------
log ""
log "================================================================"
log "✓ Apply complete"
log "  Backup: $BACKUP_DIR"
log "  Log:    $LOG_FILE"
log ""
log "צעדים הבאים:"
log "  1. ts-node patches-apply/scripts/inject-audit.ts $ROOT"
log "  2. ts-node patches-apply/scripts/migrate-imports.ts $ROOT"
log "  3. ts-node patches-apply/verify-patches.ts $ROOT > verify-report.json"
log "  4. pnpm install && pnpm typecheck && pnpm test"
log "  5. במקרה של בעיה: bash patches-apply/scripts/rollback.sh $ROOT"
log "================================================================"
