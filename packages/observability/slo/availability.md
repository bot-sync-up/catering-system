# SLO — Availability

## יעד
**99.9% זמינות** ב-rolling window של 30 ימים.

תקציב שגיאות (error budget): 0.1% = **43.2 דקות downtime** ב-30 ימים.

## SLI — מה נמדד

זמינות מוגדרת כיחס בקשות "מוצלחות" מתוך כלל הבקשות שמגיעות ל-LB.

- **success** = HTTP 2xx, 3xx, או 4xx **שאינו 429**.
- **failure** = 5xx, 429, timeout, connection refused.

מתעלמים מ-`/health` ו-`/metrics`.

### Prometheus query

```promql
# Availability ratio (rolling 30d)
sum(rate(http_requests_total{status_code!~"5..",status_code!="429",route!~"/metrics|/health.*"}[30d]))
/
sum(rate(http_requests_total{route!~"/metrics|/health.*"}[30d]))
```

### Error budget burn rate

```promql
# Burn rate ב-1h — שיעור צריכת תקציב מנורמל
(
  sum(rate(http_requests_total{status_code=~"5..",route!~"/metrics|/health.*"}[1h]))
  /
  sum(rate(http_requests_total{route!~"/metrics|/health.*"}[1h]))
) / 0.001
```

### אזעקות

| Window | Burn rate | Action |
|--------|-----------|--------|
| 1h     | > 14.4    | Page (consumes 2% of monthly budget in 1h) |
| 6h     | > 6       | Page |
| 24h    | > 3       | Ticket |
| 72h    | > 1       | Email |

## חריגים

- תחזוקה מתוזמנת (announced 7 ימים מראש) — לא נספרת.
- Force majeure של ספק ענן עם RFO ציבורי — מתועד אבל לא משפיע על SLO.

## בעלות

צוות backend אחראי ל-SLO זה. ה-CTO מקבל דיווח חודשי.
