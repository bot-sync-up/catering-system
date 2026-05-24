# קודי שגיאה

כל שגיאה מוחזרת בפורמט:

```json
{
  "code": "validation_error",
  "message": "תיאור בעברית",
  "details": { "field": "items[0].quantity", "expected": ">= 1" }
}
```

## טבלת קודים

### 4xx — שגיאות לקוח

| HTTP | code | תיאור | פתרון |
|---|---|---|---|
| 400 | `validation_error` | אחד השדות לא תואם את הסכמה | בדקו את `details.field` |
| 400 | `invalid_json` | גוף הבקשה אינו JSON תקין | ודאו `Content-Type: application/json` ו-JSON תקין |
| 401 | `unauthorized` | חסר טוקן או פג תוקפו | רעננו את ה-token (`AUTHENTICATION.md`) |
| 403 | `insufficient_scope` | לטוקן אין הרשאה לפעולה | בקשו scope מתאים בעת יצירת הטוקן |
| 403 | `forbidden_tenant` | משתמש לא משויך ל-tenant הזה | פנו ל-Admin |
| 404 | `not_found` | המשאב לא קיים | ודאו את ה-ID |
| 409 | `conflict` | מצב לא תקף (לדוגמה ביטול הזמנה שכבר נמסרה) | בדקו את הסטטוס הנוכחי |
| 409 | `duplicate` | רשומה כפולה (למשל הזמנה עם external_id קיים) | השתמשו ב-PATCH |
| 422 | `business_rule_violation` | חוקת עסקים נכשלה (לדוגמה חריגה ממלאי) | ראו `details.rule` |
| 429 | `rate_limited` | חרגתם ממכסה | המתינו, ראו `RATE-LIMITS.md` |

### 5xx — שגיאות שרת

| HTTP | code | תיאור | פתרון |
|---|---|---|---|
| 500 | `internal_error` | שגיאה לא צפויה | נסו שוב, פנו לתמיכה עם `requestId` |
| 502 | `upstream_failure` | אחד מספקי הצד-שלישי כשל (iCount/SMS) | נסו שוב מאוחר יותר |
| 503 | `maintenance` | תחזוקה מתוכננת | בדקו את `status.syncup.co.il` |
| 504 | `timeout` | פעולה לקחה יותר מ-30 שניות | נסו שוב, פצלו לבקשות קטנות |

## RequestId

כל תשובה כוללת `X-Request-Id`. בכל פנייה לתמיכה ציינו אותו — נמצא אותו
מיידית בלוגים שלנו.

## Idempotency

כל בקשת `POST` שמייצרת משאב מקבלת כותרת אופציונלית `Idempotency-Key`.
שליחה כפולה עם אותו key תחזיר את אותה התשובה (במקום ליצור משאב חדש).

```bash
curl -X POST .../orders -H "Idempotency-Key: 7f8e9d-..."
```

ה-key נשמר 24 שעות.
