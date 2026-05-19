#!/usr/bin/env bash
# ===========================================================
# Redis slowlog + INFO snapshot
# שימוש: ./redis-slowlog.sh [host] [port] [password]
# ===========================================================

set -euo pipefail

HOST="${1:-${REDIS_HOST:-127.0.0.1}}"
PORT="${2:-${REDIS_PORT:-6379}}"
PASS="${3:-${REDIS_PASSWORD:-}}"

REDIS_CMD=(redis-cli -h "$HOST" -p "$PORT")
if [[ -n "$PASS" ]]; then
  REDIS_CMD+=(-a "$PASS" --no-auth-warning)
fi

OUT_DIR="${OUT_DIR:-./reports/redis-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

echo "==> Redis profiler @ $HOST:$PORT"
echo "==> Output: $OUT_DIR"

# 1. הגדר את הסף ל-10ms ושמור 256 רשומות
"${REDIS_CMD[@]}" CONFIG SET slowlog-log-slower-than 10000 > /dev/null
"${REDIS_CMD[@]}" CONFIG SET slowlog-max-len 256 > /dev/null
"${REDIS_CMD[@]}" SLOWLOG RESET > /dev/null
echo "[ok] slowlog armed @ 10ms threshold"

# 2. רוץ ב-loop, שמור snapshots כל 30 שניות
DURATION="${DURATION:-300}"   # ברירת מחדל 5 דקות
INTERVAL=30
ELAPSED=0
ITER=0

while [[ $ELAPSED -lt $DURATION ]]; do
  ITER=$((ITER+1))
  TS=$(date +%Y%m%d-%H%M%S)

  echo "--- snapshot #$ITER @ $TS ---"

  {
    echo "# === INFO @ $TS ==="
    "${REDIS_CMD[@]}" INFO
    echo
    echo "# === MEMORY STATS @ $TS ==="
    "${REDIS_CMD[@]}" MEMORY STATS
    echo
    echo "# === CLIENT LIST @ $TS ==="
    "${REDIS_CMD[@]}" CLIENT LIST | head -50
    echo
    echo "# === LATENCY HISTORY @ $TS ==="
    "${REDIS_CMD[@]}" LATENCY HISTORY event-loop || true
    echo
    echo "# === LATENCY DOCTOR @ $TS ==="
    "${REDIS_CMD[@]}" LATENCY DOCTOR || true
  } > "$OUT_DIR/snapshot-${ITER}.txt"

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

# 3. שלוף slowlog בסוף
echo "==> Dumping final slowlog..."
"${REDIS_CMD[@]}" SLOWLOG GET 256 > "$OUT_DIR/slowlog-final.txt"
"${REDIS_CMD[@]}" SLOWLOG LEN

# 4. סיכום מפתחות הכי חמים (אם כלי hotkeys מופעל)
"${REDIS_CMD[@]}" --hotkeys > "$OUT_DIR/hotkeys.txt" 2>&1 || echo "(hotkeys requires maxmemory-policy=allkeys-lfu)"

# 5. bigkeys
"${REDIS_CMD[@]}" --bigkeys > "$OUT_DIR/bigkeys.txt" 2>&1 || true

echo "==> Done. See $OUT_DIR/"
