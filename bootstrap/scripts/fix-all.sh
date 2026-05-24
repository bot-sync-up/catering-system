#!/usr/bin/env bash
# fix-all.sh — מיישם את כל ה-fixes של CONFLICTS.md על monorepo F1 אמיתי
# Usage: ./bootstrap/scripts/fix-all.sh <path-to-monorepo>
#
# שלבים:
#   1) גיבוי package.json/tsconfig/pnpm-workspace.yaml מקוריים
#   2) החלפה ב-fixed versions
#   3) הוספת .npmrc
#   4) יצירת tests/package.json אם חסר
#   5) תיקון workspace deps (`*` → `workspace:*`)
#   6) המרת sub-package.json מ-npm workspaces ל-pnpm filter
#   7) הסרת `"workspaces"` field מ-sub-package.json
#   8) דיווח סופי

set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"
BOOTSTRAP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  F1 Monorepo Bootstrap — fix-all"
echo "  ROOT:      $ROOT"
echo "  BOOTSTRAP: $BOOTSTRAP_DIR"
echo "═══════════════════════════════════════════════════════════════"
echo

if [ ! -f "$ROOT/pnpm-workspace.yaml" ]; then
  echo "ERROR: לא נמצא pnpm-workspace.yaml ב-$ROOT" >&2
  exit 1
fi

# ─── 1. גיבוי ──────────────────────────────────────────────────────
BACKUP_DIR="$ROOT/.bootstrap-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "[1/8] גיבוי קבצים מקוריים → $BACKUP_DIR"
cp "$ROOT/package.json"            "$BACKUP_DIR/package.json"            2>/dev/null || true
cp "$ROOT/pnpm-workspace.yaml"     "$BACKUP_DIR/pnpm-workspace.yaml"     2>/dev/null || true
cp "$ROOT/tsconfig.base.json"      "$BACKUP_DIR/tsconfig.base.json"      2>/dev/null || true
cp "$ROOT/.npmrc"                  "$BACKUP_DIR/.npmrc"                  2>/dev/null || true

# ─── 2. החלפת קבצי root ────────────────────────────────────────────
echo "[2/8] החלפת קבצי קונפיגורציה ראשיים"
cp "$BOOTSTRAP_DIR/config/package.json.fixed"        "$ROOT/package.json"
cp "$BOOTSTRAP_DIR/config/pnpm-workspace.yaml.fixed" "$ROOT/pnpm-workspace.yaml"
cp "$BOOTSTRAP_DIR/config/tsconfig.base.json.fixed"  "$ROOT/tsconfig.base.json"

# ─── 3. הוספת .npmrc ──────────────────────────────────────────────
echo "[3/8] הוספת .npmrc"
cp "$BOOTSTRAP_DIR/config/.npmrc" "$ROOT/.npmrc"

# ─── 4. יצירת tests/package.json אם חסר ─────────────────────────────
echo "[4/8] בדיקת tests/package.json"
if [ ! -f "$ROOT/tests/package.json" ]; then
  mkdir -p "$ROOT/tests"
  cp "$BOOTSTRAP_DIR/config/tests-package.json" "$ROOT/tests/package.json"
  echo "  └─ נוצר tests/package.json"
else
  echo "  └─ קיים, מדלג"
fi

# ─── 5. תיקון workspace deps ──────────────────────────────────────
echo "[5/8] תיקון workspace dependencies (* → workspace:*)"
NODE_FIX_DEPS=$(cat <<'NODE_EOF'
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const workspaceNames = new Set();

// Step 1: collect all workspace package names
function walk(dir, depth) {
  if (depth > 5) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const pj = path.join(p, "package.json");
      if (fs.existsSync(pj)) {
        try {
          const data = JSON.parse(fs.readFileSync(pj, "utf8"));
          if (data.name) workspaceNames.add(data.name);
        } catch {}
      }
      walk(p, depth + 1);
    }
  }
}
walk(path.join(root, "apps"), 0);
walk(path.join(root, "packages"), 0);
walk(path.join(root, "services"), 0);

console.error(`  └─ זוהו ${workspaceNames.size} workspace packages`);

// Step 2: rewrite "*" workspace deps + log unresolved
const unresolvedRefs = [];
function fixDeps(dir, depth) {
  if (depth > 5) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const pj = path.join(p, "package.json");
      if (fs.existsSync(pj)) {
        try {
          const raw = fs.readFileSync(pj, "utf8");
          const data = JSON.parse(raw);
          let changed = false;
          for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
            if (!data[field]) continue;
            for (const [depName, ver] of Object.entries(data[field])) {
              if (ver === "*" && workspaceNames.has(depName)) {
                data[field][depName] = "workspace:*";
                changed = true;
              }
              if (typeof ver === "string" && ver.startsWith("workspace:") && !workspaceNames.has(depName)) {
                unresolvedRefs.push({ pkg: data.name || pj, dep: depName, ver });
              }
            }
          }
          if (changed) {
            fs.writeFileSync(pj, JSON.stringify(data, null, 2) + "\n");
            console.error(`     ✓ ${data.name || pj}`);
          }
        } catch (err) {
          console.error(`     ✗ פגום: ${pj}: ${err.message}`);
        }
      }
      fixDeps(p, depth + 1);
    }
  }
}
fixDeps(path.join(root, "apps"), 0);
fixDeps(path.join(root, "packages"), 0);
fixDeps(path.join(root, "services"), 0);

// Step 3: special — @contracts/core in public-site → @catering/contracts
const publicSitePj = path.join(root, "apps/public-site/package.json");
if (fs.existsSync(publicSitePj)) {
  const data = JSON.parse(fs.readFileSync(publicSitePj, "utf8"));
  if (data.dependencies && data.dependencies["@contracts/core"]) {
    delete data.dependencies["@contracts/core"];
    data.dependencies["@catering/contracts"] = "workspace:*";
    fs.writeFileSync(publicSitePj, JSON.stringify(data, null, 2) + "\n");
    console.error(`     ✓ apps/public-site: @contracts/core → @catering/contracts`);
  }
}

if (unresolvedRefs.length) {
  console.error(`\n  ⚠ ${unresolvedRefs.length} workspace refs לא נפתרו:`);
  for (const r of unresolvedRefs) {
    console.error(`     • ${r.pkg} → ${r.dep}@${r.ver}`);
  }
}
NODE_EOF
)
node -e "$NODE_FIX_DEPS" _ "$ROOT"

# ─── 6. המרת sub-package scripts מ-npm לpnpm ─────────────────────
echo "[6/8] המרת scripts: 'npm --workspace X' → 'pnpm --filter X'"
NODE_FIX_SCRIPTS=$(cat <<'NODE_EOF'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];

const SUBS = [
  "apps/expenses",
  "apps/fleet",
  "apps/hr",
  "apps/marketing",
  "apps/menus",
  "packages/security-fixes",
];

for (const sub of SUBS) {
  const pj = path.join(root, sub, "package.json");
  if (!fs.existsSync(pj)) continue;
  const data = JSON.parse(fs.readFileSync(pj, "utf8"));
  let changed = false;
  if (data.scripts) {
    for (const [k, v] of Object.entries(data.scripts)) {
      if (typeof v !== "string") continue;
      let newV = v
        .replace(/npm --workspace (\S+) run (\S+)/g, "pnpm --filter $1 run $2")
        .replace(/npm run (\S+) -w (\S+)/g, "pnpm --filter $2 run $1")
        .replace(/npm start -w (\S+)/g, "pnpm --filter $1 start")
        .replace(/npm:dev:(\S+)/g, "pnpm:dev:$1");
      if (newV !== v) {
        data.scripts[k] = newV;
        changed = true;
      }
    }
  }
  // הסר workspaces field
  if (data.workspaces) {
    data._workspacesRemoved = data.workspaces;
    delete data.workspaces;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(pj, JSON.stringify(data, null, 2) + "\n");
    console.error(`     ✓ ${sub}/package.json`);
  }
}
NODE_EOF
)
node -e "$NODE_FIX_SCRIPTS" _ "$ROOT"

# ─── 7. אכיפת version pins על dependencies מובלעות ────────────
echo "[7/8] אכיפת גרסאות אחידות (React/Next/Prisma/TS/zod/...)"
NODE_PIN_VERSIONS=$(cat <<'NODE_EOF'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];

const PINS = {
  "typescript":            "5.6.3",
  "@types/node":           "^22.10.0",
  "zod":                   "3.23.8",
  "bullmq":                "^5.34.0",
  "ioredis":               "^5.4.2",
  "date-fns":              "^4.1.0",
  "express":               "^4.21.2",
  "@types/express":        "^4.17.21",
  "prisma":                "5.22.0",
  "@prisma/client":        "5.22.0",
  "@trpc/server":          "11.0.0-rc.648",
  "@trpc/client":          "11.0.0-rc.648",
  "@trpc/react-query":     "11.0.0-rc.648",
  "@trpc/next":            "11.0.0-rc.648",
  "@tanstack/react-query": "^5.62.0",
  "vitest":                "^2.1.8",
};

// Mobile pins (Expo 51 / React Native 0.74) - לא משפיע על web/server
const MOBILE_PKGS = new Set(["@field-ops/mobile", "fleet-driver"]);

// React 19 — בכל מקום חוץ מ-mobile
const REACT_PINS = {
  "react":            "19.0.0",
  "react-dom":        "19.0.0",
  "@types/react":     "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "next":             "15.1.3",
  "eslint-config-next": "15.1.3",
};

function walk(dir, depth) {
  if (depth > 5) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const pj = path.join(p, "package.json");
      if (fs.existsSync(pj) && p !== root) {
        try {
          const data = JSON.parse(fs.readFileSync(pj, "utf8"));
          if (!data.name) { walk(p, depth + 1); continue; }
          const isMobile = MOBILE_PKGS.has(data.name);
          let changed = false;
          const fields = ["dependencies", "devDependencies"];
          for (const f of fields) {
            if (!data[f]) continue;
            for (const [dep, ver] of Object.entries(data[f])) {
              if (PINS[dep] && ver !== PINS[dep]) {
                data[f][dep] = PINS[dep]; changed = true;
              }
              if (!isMobile && REACT_PINS[dep] && ver !== REACT_PINS[dep]) {
                data[f][dep] = REACT_PINS[dep]; changed = true;
              }
            }
          }
          if (changed) {
            fs.writeFileSync(pj, JSON.stringify(data, null, 2) + "\n");
            console.error(`     ✓ ${data.name}`);
          }
        } catch (err) {
          console.error(`     ✗ פגום: ${pj}: ${err.message}`);
        }
      }
      walk(p, depth + 1);
    }
  }
}
walk(root, 0);
NODE_EOF
)
node -e "$NODE_PIN_VERSIONS" _ "$ROOT"

# ─── 8. אכיפת peerDependencies על @aneh/ui ו-@field-ops/ui ─────
echo "[8/8] אכיפת peerDependencies לחבילות UI"
NODE_FIX_PEERS=$(cat <<'NODE_EOF'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];

const PEER_FIXES = [
  {
    pj: path.join(root, "packages/ui/package.json"),
    peers: { "react": "^19.0.0", "react-dom": "^19.0.0" }
  },
  {
    pj: path.join(root, "packages/ui-mobile/package.json"),
    peers: { "react": "^18.2.0", "react-native": ">=0.74.0 <0.75.0" }
  },
];

for (const { pj, peers } of PEER_FIXES) {
  if (!fs.existsSync(pj)) continue;
  const data = JSON.parse(fs.readFileSync(pj, "utf8"));
  data.peerDependencies = { ...(data.peerDependencies || {}), ...peers };
  fs.writeFileSync(pj, JSON.stringify(data, null, 2) + "\n");
  console.error(`     ✓ ${pj.replace(root + path.sep, "").replace(root + "/", "")}`);
}
NODE_EOF
)
node -e "$NODE_FIX_PEERS" _ "$ROOT"

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ Fix-all הסתיים בהצלחה"
echo
echo "  גיבוי קבצים מקוריים: $BACKUP_DIR"
echo
echo "  השלב הבא:"
echo "    cd $ROOT"
echo "    rm -rf node_modules pnpm-lock.yaml apps/*/node_modules packages/*/node_modules"
echo "    pnpm install"
echo "    pnpm db:generate"
echo
echo "═══════════════════════════════════════════════════════════════"
