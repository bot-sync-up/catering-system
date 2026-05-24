# Rate Limits

## מכסות

| תוכנית | בקשות לדקה | בקשות לדקה (Innovation) |
|---|---|---|
| Free / Trial | 60 | 10 |
| Pro | 600 | 60 |
| Business | 3,000 | 300 |
| Enterprise | מותאם | מותאם |

ה-Innovation tier (קריאות שמערבות מודלים יקרים — `plate-quality`, יצירת תמונה)
נמדד בנפרד.

## כותרות מידע

כל תגובה כוללת:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1716540060
```

## חריגה

`HTTP 429 Too Many Requests` עם:

```json
{
  "code": "rate_limited",
  "message": "חרגתם ממכסה. נסו שוב בעוד 18 שניות.",
  "details": { "retryAfterSeconds": 18 }
}
```

הכותרת `Retry-After` תכיל את אותו ערך בשניות.

## פיצוץ (Burst)

המערכת מאפשרת burst של פי-2 מהמכסה ל-10 שניות, עם רעון חוזר. כלומר על
תוכנית Pro (600/דקה = 10/שנייה) — עד 200 בקשות ב-10 שניות הראשונות יעברו
חלק, ואז יוגבל.

## המלצות

- השתמשו ב-bulk endpoints כשאפשר (`POST /orders/bulk` עתידי).
- שמרו תוצאות `GET` ב-cache עם `ETag`.
- ל-Webhooks אין rate limit נכנס (מצדכם אלינו).
