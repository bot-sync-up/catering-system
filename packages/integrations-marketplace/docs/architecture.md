# ארכיטקטורה — Integrations Marketplace

מסמך זה מתאר את החלוקה הפנימית, אחריות כל רכיב, וזרימת קריאות אופיינית.

## שכבות

```
┌──────────────────────────────────────────────────────────┐
│  Admin UI (MarketplaceUI / InstallFlow / PluginSettings) │
├──────────────────────────────────────────────────────────┤
│  Framework (WebhookServer · OAuthManager · Migration)    │
├──────────────────────────────────────────────────────────┤
│  Core (IPlugin · PluginRegistry · PluginContext · Sand.) │
├──────────────────────────────────────────────────────────┤
│  Plugins (33+ implementations under plugins/)            │
└──────────────────────────────────────────────────────────┘
```

## רכיבי הליבה

### IPlugin
ממשק יסוד לכל פלאגין. כל מימוש חייב להכיל:
- `manifest` — מטא-דאטה (id, version, scopes, permissions, configSchema)
- `install(ctx, config)` — הקמה ראשונית
- `uninstall(ctx)` — ניקוי מסודר
- `healthCheck(ctx)` — בדיקת חיים
- `handleWebhook?(ctx, event)` — אופציונלי, אם requiresWebhook
- `actions?` — RPC actions שניתנות לקריאה מבחוץ

### PluginContext
הקשר ריצה שניתן לפלאגין:
- `logger` — לוגר מובנה
- `storage` — אחסון key-value per installation
- `secrets` — secrets מוצפנים (AES-256-GCM)
- `events` — event bus פנימי
- `http` — לקוח HTTP עם timeout ו-tracing

### PluginRegistry
- רישום פלאגינים בעת bootstrap
- ולידציה של מניפסט (id, version, permissions)
- ניהול installations per organization
- קריאה ל-install/uninstall תחת sandbox

### PluginSandbox
- אכיפת timeout (ברירת מחדל 30s)
- תפיסת חריגות עם prefix של plugin id
- `assertPermission` לאכיפת least-privilege

## Framework

### WebhookServer
שרת Express שמקבל webhooks ב-`/webhooks/:provider/:installationId`.
זרימה: `raw body → SignatureVerifier.verify → JSON.parse → Dispatcher → plugin.handleWebhook`.

### SignatureVerifier
- אסטרטגיות built-in ל-13+ ספקים (Cardcom, Stripe, Slack, HubSpot, וכו')
- `timingSafeEqual` למניעת timing attacks
- ניתן להרחיב עם `registerStrategy`

### OAuthManager
- `OAuthFlow`: PKCE + state, code exchange
- `InMemoryEncryptedTokenStorage`: AES-256-GCM (ניתן להחליף ב-DB)
- `AutoRefresher`: רענון tokens שמתקרבים לפקיעה
- `getValidToken(provider, installationId)` — מחזיר token תקף, מרענן אם צריך

## כלי הגירה

| כלי | קובץ | תיאור |
|---|---|---|
| HashavshevetDbfReader | `src/migration/HashavshevetDbfReader.ts` | קורא קבצי DBF + מיפויי שדות |
| AbmExcelParser | `src/migration/AbmExcelParser.ts` | מנתח Excel של ABM |
| ExcelImportWizard | `src/migration/ExcelImportWizard.ts` | אשף גנרי Excel/CSV → DB |

## זרימה אופיינית: התקנת פלאגין OAuth

1. משתמש לוחץ "התקן" על Slack ב-MarketplaceUI
2. `InstallFlow.begin('slack')` → step=consent עם רשימת permissions
3. אחרי הסכמה → `InstallFlow.afterConsent` → step=config
4. ה-UI שולח קונפיג → `InstallFlow.startOAuth` → URL להפניה
5. משתמש מתחבר ב-Slack, חוזר עם code+state
6. שרת מקבל `/oauth/callback` → `oauth.flow.complete(state, code)` → tokens
7. `oauth.storage.save('slack:installId', tokens)`
8. `InstallFlow.finalize` → `registry.install` → `plugin.install(ctx, config)`
9. סטטוס=active, ההתקנה מוכנה

## זרימה אופיינית: קבלת webhook

1. POST `/webhooks/cardcom/inst_org1_cardcom_123`
2. raw body נשמר → `SignatureVerifier.verify('cardcom', headers, body, installationId)`
3. אם תקין: JSON.parse → `WebhookDispatcher.dispatch`
4. Dispatcher מוצא את ההתקנה → טוען את הפלאגין
5. `ctx = ctxFactory(installationId)` (כולל org context, secrets, storage)
6. `plugin.handleWebhook(ctx, event)`
7. הפלאגין יכול `ctx.events.emit('payment.completed', ...)` להפצה פנים-מערכתית
