# Webhooks

ה-API שולח אירועים מיידיים ל-URL שתספקו, כל פעם שדבר מעניין קורה במערכת.

## רישום

ראה [EXAMPLES.md](./EXAMPLES.md#webhooks).

תשובת `POST /webhooks` מחזירה `secret` — שמרו אותו. הוא מוצג רק פעם אחת
ומשמש לחתימת המטענים (HMAC SHA-256).

## אירועים נתמכים

| Event | מתי נשלח | Payload |
|------|----------|---------|
| `order.created` | בעת יצירת הזמנה | `{ order: Order }` |
| `order.updated` | בכל שינוי בהזמנה | `{ order: Order, changes: object }` |
| `order.cancelled` | ביטול | `{ orderId: string, reason: string }` |
| `invoice.issued` | הופקה חשבונית | `{ invoice: Invoice }` |
| `delivery.status_changed` | שינוי מצב משלוח | `{ deliveryId, from, to }` |
| `plate.quality_alert` | מנה שנכשלה בבדיקת איכות | `{ orderId, scores, notesHe }` |

## מבנה כללי

כל payload הוא:

```json
{
  "id": "evt_a1b2c3",
  "type": "order.created",
  "createdAt": "2026-05-24T10:00:00Z",
  "data": { /* תלוי באירוע */ }
}
```

## אימות החתימה

לכל בקשה נשלחת כותרת `X-SyncUp-Signature`:

```
X-SyncUp-Signature: t=1716540000,v1=5a7b...c3d4
```

בקוד שלכם:

```ts
import crypto from "node:crypto";

function verify(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

> חשוב: אם הפרש הזמן בין `t` לבין `Date.now()` גדול מ-5 דקות — דחו.

## ניסיון חוזר (Retry)

- ניסיון ראשון: מיידי.
- אם תגובת ה-server לא 2xx — ניסיון נוסף לפי backoff מעריכי: 30s, 2m, 10m, 1h, 6h.
- אחרי 5 כישלונות רצופים ה-webhook ננטרל אוטומטית ותקבלו מייל.

## בדיקה מהיר

נסו במסך ניהול ה-webhooks → "שלח אירוע בדיקה".
