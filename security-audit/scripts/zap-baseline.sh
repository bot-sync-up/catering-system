#!/usr/bin/env bash
# zap-baseline.sh — OWASP ZAP passive baseline scan.
# Safe to run against production-like URLs. No active attacks.
#
# Usage: ./zap-baseline.sh https://staging.example.co.il [output-dir]

set -euo pipefail

readonly TARGET="${1:?Usage: $0 <target-url> [output-dir]}"
readonly OUTDIR="${2:-./security-audit/reports/zap-baseline-$(date +%Y%m%d-%H%M%S)}"
readonly ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"

mkdir -p "$OUTDIR"

echo "=== ZAP Baseline Scan ==="
echo "Target: $TARGET"
echo "Output: $OUTDIR"

docker run --rm \
    -v "$(realpath "$OUTDIR")":/zap/wrk/:rw \
    -v "$(realpath ./security-audit/configs/zap-context.xml)":/zap/wrk/context.xml:ro \
    -t "$ZAP_IMAGE" \
    zap-baseline.py \
    -t "$TARGET" \
    -n /zap/wrk/context.xml \
    -r report.html \
    -J report.json \
    -w report.md \
    -x report.xml \
    -I \
    -j \
    -m 5 \
    -T 10 \
    -z "-config scanner.attackOnStart=false \
         -config api.disablekey=true \
         -config scanner.threadPerHost=2"

echo "=== Reports ==="
ls -la "$OUTDIR"

# Extract high-severity findings count
if [[ -f "$OUTDIR/report.json" ]]; then
    high=$(jq '[.site[].alerts[]? | select(.riskcode | tonumber >= 3)] | length' "$OUTDIR/report.json")
    echo "HIGH+ risk findings: $high"
    if [[ "$high" -gt 0 ]]; then
        exit 1
    fi
fi
