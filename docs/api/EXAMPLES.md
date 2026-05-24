# דוגמאות שימוש ב-API של Sync Up Catering

כל הדוגמאות מניחות שהגדרתם משתנה סביבה `SYNCUP_TOKEN` עם JWT תקף
(ראה [AUTHENTICATION.md](./AUTHENTICATION.md) ליצירת אחד).

> **Base URL בייצור:** `https://api.syncup.co.il/v1`
> **Base URL בסטייג'ינג:** `https://api.staging.syncup.co.il/v1`

## תוכן עניינים
1. [בריאות](#בריאות)
2. [הזמנות](#הזמנות)
3. [תפריטים](#תפריטים)
4. [חשבוניות](#חשבוניות)
5. [משלוחים](#משלוחים)
6. [QR codes לכל ישות](#qr-codes-לכל-ישות)
7. [ניתוח איכות הגשת מנה](#ניתוח-איכות-הגשת-מנה)
8. [Webhooks](#webhooks)

---

## בריאות

```bash
curl https://api.syncup.co.il/v1/health
```

תשובה:
```json
{ "status": "ok", "service": "syncup-catering-api", "timestamp": "2026-05-24T10:00:00Z" }
```

## הזמנות

### יצירת הזמנה חדשה

```bash
curl -X POST https://api.syncup.co.il/v1/orders \
  -H "Authorization: Bearer $SYNCUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_chasuna_kohen_2026_06_15",
    "customerId": "cust_avi_kohen",
    "items": [
      { "menuItemId": "mi_hummus_classic", "quantity": 50, "unitPriceIls": 22 },
      { "menuItemId": "mi_kebab_jerusalem", "quantity": 50, "unitPriceIls": 65 }
    ]
  }'
```

### עדכון סטטוס

```bash
curl -X PATCH https://api.syncup.co.il/v1/orders/ord_001 \
  -H "Authorization: Bearer $SYNCUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "confirmed" }'
```

### Pagination

```bash
curl "https://api.syncup.co.il/v1/orders?page=2&pageSize=100&status=confirmed" \
  -H "Authorization: Bearer $SYNCUP_TOKEN"
```

## תפריטים

```bash
curl https://api.syncup.co.il/v1/menus \
  -H "Authorization: Bearer $SYNCUP_TOKEN"
```

## חשבוניות

```bash
curl https://api.syncup.co.il/v1/invoices/inv_2026_05_0042 \
  -H "Authorization: Bearer $SYNCUP_TOKEN"
```

תשובה (קטע):
```json
{
  "id": "inv_2026_05_0042",
  "invoiceNumber": "2026-0042",
  "totalIls": 11800,
  "vatIls": 1800,
  "issueDate": "2026-05-24",
  "pdfUrl": "https://cdn.syncup.co.il/invoices/2026/0042.pdf"
}
```

## משלוחים

```bash
curl https://api.syncup.co.il/v1/deliveries/del_001/track \
  -H "Authorization: Bearer $SYNCUP_TOKEN"
```

## QR Codes לכל ישות

הסוגים הנתמכים: `order`, `invoice`, `event`, `customer`, `delivery`, `equipment`, `vehicle`, `employee`.

```bash
curl -X POST https://api.syncup.co.il/v1/innovation/qr/order/ord_001 \
  -H "Authorization: Bearer $SYNCUP_TOKEN"
```

תשובה:
```json
{
  "subject": "order",
  "entityId": "ord_001",
  "shortUrl": "https://s.syncup.co.il/oV3kPq7h",
  "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

## ניתוח איכות הגשת מנה

```bash
curl -X POST https://api.syncup.co.il/v1/innovation/plate-quality \
  -H "Authorization: Bearer $SYNCUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "imageUrl": "https://cdn.syncup.co.il/plates/2026/05/24/abc.jpg" }'
```

תשובה (קטע):
```json
{
  "scores": { "presentation": 9, "portion": 8, "plating": 9, "freshness": 10 },
  "averageScore": 9,
  "alert": false,
  "notesHe": "פלייטינג מצוין, מנה טריה ומפנקת. שווה להוסיף קישוט של פטרוזיליה."
}
```

אם הציון הממוצע נופל מתחת ל-7, `alert=true` ויישלח אירוע
`plate.quality_alert` לכל ה-webhooks הרשומים.

## Webhooks

ראה [WEBHOOKS.md](./WEBHOOKS.md) למבנה מלא של המטענים.

```bash
curl -X POST https://api.syncup.co.il/v1/webhooks \
  -H "Authorization: Bearer $SYNCUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/syncup-webhook",
    "events": ["order.created", "invoice.issued", "plate.quality_alert"]
  }'
```

## דוגמת JavaScript (fetch)

```ts
const res = await fetch("https://api.syncup.co.il/v1/orders", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.SYNCUP_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    eventId: "evt_001",
    customerId: "cust_001",
    items: [{ menuItemId: "mi_001", quantity: 50, unitPriceIls: 75 }],
  }),
});
const order = await res.json();
```
