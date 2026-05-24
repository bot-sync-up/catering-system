# SLO — OCR Turnaround

## יעד
**p95 < 10s** מ-upload עד תוצאה זמינה, ב-rolling window של 7 ימים.

הזמן הזה כולל:
1. Upload + virus scan.
2. Pre-processing (resize, denoise).
3. OCR inference (Tesseract / Cloud Vision / מודל פנימי).
4. Post-processing (validation, structuring).
5. Persist + notify.

## SLI

נמדד דרך histogram `queue_processing_duration_seconds{queue="ocr"}`.

### Prometheus query

```promql
# p95 turnaround ב-7d
histogram_quantile(
  0.95,
  sum by (le) (
    rate(queue_processing_duration_seconds_bucket{
      queue="ocr",
      result="success"
    }[7d])
  )
)
```

### יעד

```promql
sum(rate(queue_processing_duration_seconds_bucket{
  queue="ocr",
  result="success",
  le="10"
}[7d]))
/
sum(rate(queue_processing_duration_seconds_count{
  queue="ocr",
  result="success"
}[7d]))
```

≥ 0.95.

## פירוט לפי סוג מסמך

יש סוגים שמטבעם איטיים יותר (מסמכי PDF רב-עמודיים). SLO זה הוא **aggregate**.
SLOs פר-סוג מסמך:

| סוג מסמך       | p95 יעד |
|----------------|---------|
| חשבונית בודדת  | 5s      |
| דרכון/ת"ז      | 3s      |
| PDF רב-עמודי   | 15s     |
| כתב יד         | 20s     |

## אזעקות

| Window | תנאי | Action |
|--------|------|--------|
| 15m    | p95 > 15s | Slack (#ml-alerts) |
| 1h     | p95 > 20s | Ticket |
| 6h     | p99 > 60s | Page (queue likely stuck) |

## הקשר עם accuracy

תזמון מהיר על חשבון accuracy = רע. אם accuracy יורד מתחת ל-90% במקביל
ל-turnaround שיורד — מודל פגום, להחזיר fallback.

ראה: `alerts/ocr-accuracy-drop.yml`.
