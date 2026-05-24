# SLO — Payment Latency

## יעד
**p95 < 800ms** לכל קריאת `/payments/charge`, נמדד ב-rolling window של 7 ימים.

p99 < 2s (קשיח — מעבר לזה לקוחות נוטשים את הסל).

## SLI

זמן ה-end-to-end מ-request enters server עד response sent, כולל שיחה לספק תשלום (Stripe / iCount / PayPlus).

מתעלמים מ:
- 5xx (נספרים בזמינות, לא בלטנסי).
- preflight OPTIONS.

### Prometheus query

```promql
# p95 latency ב-7d
histogram_quantile(
  0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{
      route="/payments/charge",
      status_code!~"5..",
      method="POST"
    }[7d])
  )
)
```

### יעד (קשיח)

```promql
# יעד SLO — אחוז ה-requests מתחת ל-800ms
sum(rate(http_request_duration_seconds_bucket{
  route="/payments/charge",
  status_code!~"5..",
  le="0.8"
}[7d]))
/
sum(rate(http_request_duration_seconds_count{
  route="/payments/charge",
  status_code!~"5.."
}[7d]))
```

צריך להיות **≥ 0.95**.

## תקציב

5% מהקריאות יכולות להיות איטיות. = ~5,000 קריאות איטיות לשבוע ב-throughput של 100k.

## אזעקות

| Window | תנאי | Action |
|--------|------|--------|
| 5m     | p95 > 1.2s | Slack |
| 15m    | p95 > 1.5s | Page |
| 1h     | p99 > 5s   | Page |

## דברים שמעלים לטנסי (debugging hints)

1. ספק תשלום איטי — בדוק `external_http_duration{host=~"stripe|icount|payplus"}`.
2. DB locks — בדוק `db_query_duration_seconds` עם `operation="update"`.
3. Cold start של pods — בדוק `up{service="payments"}` סביב deploys.
