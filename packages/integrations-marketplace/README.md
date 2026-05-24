# @syncup/integrations-marketplace

> מרקטפלייס פלאגינים ופריימוורק אינטגרציות ל-Sync Up.
> משלב יומנים, חשבונאות ישראלית, סליקה, BI, שיווק, תפעול, תקשורת ואחסון —
> תחת ארכיטקטורת פלאגינים אחידה עם sandbox, OAuth מנוהל, ו-webhook signature verification.

## מה זה כולל

- **Plugin Architecture**: `IPlugin`, `PluginRegistry`, `PluginContext`, `PluginSandbox`
- **Framework**: שרת webhooks מרכזי, ניהול OAuth2 (PKCE + auto-refresh), Admin UI
- **33 פלאגינים** מובנים — ראו [`PLUGIN-CATALOG.md`](./PLUGIN-CATALOG.md)
- **Migration tools**: קורא DBF לחשבשבת, Parser ל-ABM Excel, Wizard גנרי ל-Excel→DB
- **SDK** מלא ל-TypeScript לפיתוח פלאגינים חיצוניים

## התקנה

```bash
npm install @syncup/integrations-marketplace
```

## מבנה הספרייה

```
packages/integrations-marketplace/
  src/
    core/                # IPlugin, PluginRegistry, PluginContext, PluginSandbox
    framework/           # WebhookServer, SignatureVerifier, OAuthManager
    admin-ui/            # MarketplaceUI, InstallFlow, PluginSettings
    migration/           # HashavshevetDbfReader, AbmExcelParser, ExcelImportWizard
    sdk/                 # SDK חיצוני + template-plugin
  plugins/               # 33 פלאגינים מובנים (ראו PLUGIN-CATALOG.md)
  tests/                 # vitest לכל פלאגין ולליבה
  docs/                  # תיעוד מפורט
```

## שימוש בסיסי

```typescript
import {
  PluginRegistry,
  WebhookServer,
  OAuthManager,
  InMemoryEncryptedTokenStorage,
} from '@syncup/integrations-marketplace';

import googleCalendar from '@syncup/integrations-marketplace/plugins/calendar/google-calendar';
import icount from '@syncup/integrations-marketplace/plugins/accounting/icount';
import cardcom from '@syncup/integrations-marketplace/plugins/payment/cardcom';

// 1. רישום
const registry = new PluginRegistry();
registry.register(googleCalendar);
registry.register(icount);
registry.register(cardcom);

// 2. OAuth (לפלאגינים שדורשים)
const oauth = new OAuthManager(
  new InMemoryEncryptedTokenStorage(process.env.ENC_KEY!),
  [/* OAuthProvider[] */]
);

// 3. שרת webhooks
const server = new WebhookServer({
  registry,
  ctxFactory: async (installId) => buildContext(installId),
  port: 4000,
});
server.listen();
```

## פיתוח פלאגין חיצוני

ראו [`src/sdk/template-plugin.ts`](./src/sdk/template-plugin.ts) — תבנית מלאה להתחלה.

```typescript
import { definePlugin } from '@syncup/integrations-marketplace/sdk';

export default definePlugin({
  manifest: { /* ... */ },
  async install(ctx, config) { /* ... */ },
  async uninstall(ctx) { /* ... */ },
  async healthCheck(ctx) { /* ... */ },
});
```

## אבטחה

- **Sandbox**: כל פלאגין רץ עם timeout, תפיסת חריגות, אכיפת הרשאות
- **Secrets**: מאוחסנים מוצפנים (AES-256-GCM) ב-`PluginSecrets`
- **OAuth tokens**: encrypted at rest + auto-refresh לפני פקיעה
- **Webhook signatures**: אימות HMAC לפי ספק עם `timingSafeEqual`
- **Least-privilege**: כל פלאגין חייב להצהיר במניפסט על הרשאות שדורש

## בדיקות

```bash
npm test           # הרצת vitest
npm run test:watch # מצב פיתוח
```

הבדיקות מכסות:
- ולידציית מניפסט לכל 33 הפלאגינים
- מחזור חיים מלא install/uninstall/healthCheck תחת mock
- ליבה: Registry, Sandbox, SignatureVerifier, OAuthManager

## רישיון

UNLICENSED — נכס Sync Up.
