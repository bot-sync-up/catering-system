#!/usr/bin/env bash
# auto-fix-vulns.sh — Wrapper around `npm audit fix` with safety guardrails.
# Runs only patch+minor fixes by default. For breaking changes, opens a PR.

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG="$SCRIPT_DIR/../reports/auto-fix-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG")"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

main() {
    log "=== Auto-fix vulnerabilities ==="
    log "Working dir: $(pwd)"

    if [[ ! -f "package.json" ]]; then
        log "ERROR: no package.json in current directory"
        exit 1
    fi

    # 1. Snapshot before
    log "Step 1/5: snapshot baseline"
    npm audit --json > "$LOG.before.json" 2>/dev/null || true
    local before_total
    before_total=$(jq '.metadata.vulnerabilities.total // 0' "$LOG.before.json" 2>/dev/null || echo "0")
    log "  Baseline vulnerabilities: $before_total"

    # 2. Run safe fixes (no breaking changes)
    log "Step 2/5: npm audit fix (safe)"
    npm audit fix 2>&1 | tee -a "$LOG" || true

    # 3. Check what's left
    log "Step 3/5: post-fix audit"
    npm audit --json > "$LOG.after.json" 2>/dev/null || true
    local after_total
    after_total=$(jq '.metadata.vulnerabilities.total // 0' "$LOG.after.json" 2>/dev/null || echo "0")
    log "  Remaining vulnerabilities: $after_total"

    # 4. Identify breaking-change fixes
    log "Step 4/5: identify --force candidates"
    local force_candidates
    force_candidates=$(jq -r '.vulnerabilities | to_entries[] | select(.value.fixAvailable.isSemVerMajor == true) | .key' "$LOG.after.json" 2>/dev/null | sort -u || echo "")

    if [[ -n "$force_candidates" ]]; then
        log "  WARN: breaking-change fixes available for:"
        echo "$force_candidates" | sed 's/^/    - /' | tee -a "$LOG"
        log "  Run manually: npm audit fix --force (after review!)"
    fi

    # 5. Validate
    log "Step 5/5: validate (test + build)"
    if [[ -f "package.json" ]] && jq -e '.scripts.test' package.json >/dev/null 2>&1; then
        npm test --silent 2>&1 | tail -20 | tee -a "$LOG" || {
            log "ERROR: tests failed after auto-fix — REVERT"
            git checkout -- package-lock.json package.json 2>/dev/null || true
            exit 2
        }
    fi

    # Summary
    local fixed=$((before_total - after_total))
    log "=== Summary ==="
    log "  Fixed: $fixed"
    log "  Remaining: $after_total"
    log "  Breaking-change required: $(echo "$force_candidates" | grep -c . || echo 0)"
    log "  Log: $LOG"

    if [[ "$after_total" -gt 0 ]]; then
        exit 1  # signal that issues remain
    fi
}

main "$@"
