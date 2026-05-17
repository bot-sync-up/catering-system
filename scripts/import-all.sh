#!/usr/bin/env bash
# import-all.sh — מייבא 28 worktrees ל-monorepo המאוחד
# excludes: node_modules, .git, .next, dist, build, *.log, .turbo
set -uo pipefail

DEST=C:/Users/user/.claude/worktrees/agent-a572cad8aecc19473
W=C:/Users/user/.claude/worktrees

copy_src() {
  local src="$1"
  local dst="$2"
  if [ ! -d "$src" ]; then
    echo "  SKIP (missing): $src"
    return
  fi
  mkdir -p "$dst"
  (cd "$src" && tar \
      --exclude=node_modules \
      --exclude=.next \
      --exclude=dist \
      --exclude=build \
      --exclude=.turbo \
      --exclude=.git \
      --exclude='*.log' \
      --exclude=coverage \
      --exclude='*.tsbuildinfo' \
      --exclude='.cache' \
      --exclude='out' \
      --exclude='package-lock.json' \
      --exclude='uploads' \
      -cf - .) | (cd "$dst" && tar -xf -)
  echo "  OK: $src -> $dst"
}

echo "==> 02 DB (abcfc83) -> packages/db (overwrite skeleton)"
copy_src "$W/agent-abcfc839a28d7b588/packages/db" "$DEST/packages/db"

echo "==> 03 Auth (a0d949) -> packages/auth + apps/web (Q&A)"
copy_src "$W/agent-a0d949436df27ed12/packages/auth" "$DEST/packages/auth"
copy_src "$W/agent-a0d949436df27ed12/apps/web" "$DEST/apps/qa-web"

echo "==> 04 Audit (a5e9ec7d) -> packages/audit"
copy_src "$W/agent-a5e9ec7d29999be9c" "$DEST/packages/audit"

echo "==> 05 CRM (ad22202) -> apps/crm"
copy_src "$W/agent-ad2220241a52022d0" "$DEST/apps/crm"

echo "==> 06 Orders (a3864f3) -> apps/orders"
copy_src "$W/agent-a3864f31565b63390" "$DEST/apps/orders"

echo "==> 07 Portal (aecddcb) -> apps/customer-portal"
copy_src "$W/agent-aecddcb45d3db0342/apps/customer-portal" "$DEST/apps/customer-portal"

echo "==> 08 Menus (a1f475c) -> apps/menus"
copy_src "$W/agent-a1f475c6464b1f625" "$DEST/apps/menus"

echo "==> 09 Recipes (adc7b00) -> apps/recipes"
copy_src "$W/agent-adc7b003297d67905" "$DEST/apps/recipes"

echo "==> 10 Inventory (a9490fd) -> apps/inventory"
copy_src "$W/agent-a9490fdab3005fda1/inventory" "$DEST/apps/inventory"

echo "==> 11 Suppliers (a23e111) -> apps/suppliers"
copy_src "$W/agent-a23e11108be93681b" "$DEST/apps/suppliers"

echo "==> 12 OCR (a9ab309) -> packages/integrations/ocr + apps/ocr"
copy_src "$W/agent-a9ab30939b7e8e2c3/packages/integrations" "$DEST/packages/integrations"
copy_src "$W/agent-a9ab30939b7e8e2c3/apps/api" "$DEST/services/ocr-api"
copy_src "$W/agent-a9ab30939b7e8e2c3/apps/web-verify" "$DEST/apps/ocr-verify"

echo "==> 13 Events (ab6c0dc) -> apps/events"
copy_src "$W/agent-ab6c0dce79413e79f/event-manager" "$DEST/apps/events"

echo "==> 14 Logistics (aa05ac3) -> apps/logistics"
copy_src "$W/agent-aa05ac323e9015be7/logistics" "$DEST/apps/logistics"

echo "==> 15 HR (a50ad70) -> apps/hr"
copy_src "$W/agent-a50ad709234b49b0b" "$DEST/apps/hr"

echo "==> 16 Payroll (ab96ab3) -> apps/payroll"
copy_src "$W/agent-ab96ab384014c8442/payroll-system" "$DEST/apps/payroll"

echo "==> 17 Invoices (a31b566) -> apps/invoices"
copy_src "$W/agent-a31b566159e7cc878/finance-docs" "$DEST/apps/invoices"

echo "==> 18 iCount (accb121) -> packages/integrations/icount"
copy_src "$W/agent-accb121134afd7c1a/packages/integrations" "$DEST/packages/integrations/_18"

echo "==> 19 Cardcom (a91fe01) -> packages/integrations/cardcom"
copy_src "$W/agent-a91fe015c553e924f/packages/integrations" "$DEST/packages/integrations/_19"

echo "==> 20 Expenses (a016172) -> apps/expenses"
copy_src "$W/agent-a016172202c9645f0" "$DEST/apps/expenses"

echo "==> 21 Fleet (a2f8c66) -> apps/fleet"
copy_src "$W/agent-a2f8c66ff540bd496/fleet" "$DEST/apps/fleet"

echo "==> 22 BI (a0cfd9b) -> apps/bi"
copy_src "$W/agent-a0cfd9be4e88397cc" "$DEST/apps/bi"

echo "==> 23 Marketing (a7f6f8c) -> apps/marketing"
copy_src "$W/agent-a7f6f8c320f0b1219/marketing-platform" "$DEST/apps/marketing"

echo "==> 24 Public-site (a4541f6) -> apps/public-site + packages/contracts"
copy_src "$W/agent-a4541f69f7ac884b2/apps/public-site" "$DEST/apps/public-site"
copy_src "$W/agent-a4541f69f7ac884b2/packages/contracts" "$DEST/packages/contracts"

echo "==> 25 Mobile field-ops (a869d3b) -> apps/mobile + packages/ui (RN)"
copy_src "$W/agent-a869d3b70f23a9a88/apps/mobile" "$DEST/apps/mobile"
copy_src "$W/agent-a869d3b70f23a9a88/packages/ui" "$DEST/packages/ui-mobile"

echo "==> Sealing-2 contracts (a76e966) -> packages/contracts/_sealed"
copy_src "$W/agent-a76e96667f8ed42ce/packages/contracts" "$DEST/packages/contracts/_sealed"

echo "==> Sealing-3 security-fixes (a3a11a0) -> packages/security-fixes"
copy_src "$W/agent-a3a11a087ec5a2e42/security-fixes" "$DEST/packages/security-fixes"

echo "==> Sealing-1 (a58d6b3) skeleton + README — already used as base; copy READMEs"
# Sealing-1 has READMEs for each app/package - copy them as fallback if missing
for app in admin bi crm events expenses fleet hr inventory invoices logistics marketing menus mobile ocr orders payroll public-site recipes suppliers web-portal; do
  src_readme="$W/agent-a58d6b3d689de6fbd/apps/$app/README.md"
  dst_readme="$DEST/apps/$app/README-sealing.md"
  if [ -f "$src_readme" ]; then
    mkdir -p "$DEST/apps/$app"
    cp "$src_readme" "$dst_readme" 2>/dev/null
  fi
done
for pkg in audit auth config contracts db queue ui utils; do
  src_readme="$W/agent-a58d6b3d689de6fbd/packages/$pkg/README.md"
  dst_readme="$DEST/packages/$pkg/README-sealing.md"
  if [ -f "$src_readme" ]; then
    mkdir -p "$DEST/packages/$pkg"
    cp "$src_readme" "$dst_readme" 2>/dev/null
  fi
done

echo ""
echo "==> import-all DONE"
