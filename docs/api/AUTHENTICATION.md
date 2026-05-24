# אימות (Authentication)

ה-API משתמש ב-**JWT (Bearer)**. כל בקשה אמורה לכלול את הכותרת:

```
Authorization: Bearer <token>
```

## קבלת Token

### 1. אישורי לקוח (Client Credentials)

לאינטגרציות שרת↔שרת:

```bash
curl -X POST https://auth.syncup.co.il/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=orders.read orders.write invoices.read"
```

תשובה:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "orders.read orders.write invoices.read"
}
```

### 2. כניסת משתמש (Authorization Code + PKCE)

עבור אפליקציות לקוח (Web / Mobile) — זרימת OAuth2 רגילה עם PKCE.

1. הפנו את המשתמש ל:
   `https://auth.syncup.co.il/oauth2/authorize?response_type=code&client_id=...&code_challenge=...&code_challenge_method=S256&redirect_uri=...&scope=...`
2. ה-callback מקבל `code`.
3. החליפו ל-token עם `code_verifier`:
   ```bash
   curl -X POST https://auth.syncup.co.il/oauth2/token \
     -d "grant_type=authorization_code" \
     -d "code=$CODE" \
     -d "code_verifier=$VERIFIER" \
     -d "client_id=$CLIENT_ID" \
     -d "redirect_uri=$REDIRECT"
   ```

### 3. Passkeys / WebAuthn

עבור משתמשי קצה ב-Dashboard ניתן להתחבר עם Passkey במקום סיסמה.
ראו `@syncup/innovation/passkeys` בקוד הצד-לקוח.

## רענון Token

```bash
curl -X POST https://auth.syncup.co.il/oauth2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH" \
  -d "client_id=$CLIENT_ID"
```

## Scopes נתמכים

| Scope | תיאור |
|------|------|
| `orders.read` / `orders.write` | קריאה / כתיבה של הזמנות |
| `events.read` / `events.write` | אירועים |
| `customers.read` / `customers.write` | לקוחות |
| `invoices.read` | חשבוניות |
| `deliveries.read` / `deliveries.write` | משלוחים |
| `webhooks.manage` | ניהול webhooks |
| `innovation.*` | יכולות החדשנות (QR, plate quality וכו') |

## אבטחה

- כל ה-Tokens חתומים HS256 עם סוד פר-tenant.
- TTL ברירת מחדל: גישה — 1 שעה. רענון — 30 ימים.
- שבירת Token (revoke) דרך `POST /oauth2/revoke`.

## שגיאות נפוצות

| HTTP | code | משמעות |
|---|---|---|
| 401 | `unauthorized` | חסר טוקן או פג תוקפו |
| 403 | `insufficient_scope` | לטוקן אין הרשאה לפעולה |
| 429 | `rate_limited` | חרגתם ממכסה — ראה `RATE-LIMITS.md` |
