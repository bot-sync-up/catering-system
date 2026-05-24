#!/usr/bin/env bash
# zap-full.sh — OWASP ZAP full active scan (DANGEROUS).
#
# WARNING: runs active attacks (SQLi, XSS, injection payloads).
# Use ONLY against staging/test environments — NEVER production.
# Requires explicit confirmation.
#
# Usage: ./zap-full.sh https://staging.example.co.il [output-dir]

set -euo pipefail

readonly TARGET="${1:?Usage: $0 <staging-url> [output-dir]}"
readonly OUTDIR="${2:-./security-audit/reports/zap-full-$(date +%Y%m%d-%H%M%S)}"
readonly ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"

# === Safety check: refuse known production hostnames ===
PROD_PATTERNS=(
    'app\.'
    'api\.'
    'www\.'
    '\.co\.il$'
    '\.com$'
)

for pattern in "${PROD_PATTERNS[@]}"; do
    if [[ "$TARGET" =~ $pattern ]] && [[ ! "$TARGET" =~ staging|dev|test|qa ]]; then
        echo "ERROR: target looks like production. Refusing."
        echo "Override by setting CONFIRM_PROD_SCAN=I_UNDERSTAND_THE_RISK"
        if [[ "${CONFIRM_PROD_SCAN:-}" != "I_UNDERSTAND_THE_RISK" ]]; then
            exit 1
        fi
    fi
done

echo "=== ZAP FULL ACTIVE SCAN ==="
echo "Target: $TARGET"
echo "Output: $OUTDIR"
echo ""
echo "This will run active attacks. Press Ctrl+C within 5 seconds to abort."
sleep 5

mkdir -p "$OUTDIR"

docker run --rm \
    -v "$(realpath "$OUTDIR")":/zap/wrk/:rw \
    -v "$(realpath ./security-audit/configs/zap-context.xml)":/zap/wrk/context.xml:ro \
    -t "$ZAP_IMAGE" \
    zap-full-scan.py \
    -t "$TARGET" \
    -n /zap/wrk/context.xml \
    -r report.html \
    -J report.json \
    -w report.md \
    -x report.xml \
    -I \
    -j \
    -m 10 \
    -T 60 \
    -z "-config api.disablekey=true \
         -config scanner.threadPerHost=5 \
         -config scanner.maxRuleDurationInMins=10 \
         -config scanner.maxScanDurationInMins=120"

# Parse + summarize
if [[ -f "$OUTDIR/report.json" ]]; then
    echo "=== Findings by severity ==="
    jq -r '.site[].alerts[]? | "\(.riskdesc) - \(.name)"' "$OUTDIR/report.json" | sort | uniq -c | sort -rn
fi

echo ""
echo "Full report: file://$OUTDIR/report.html"
