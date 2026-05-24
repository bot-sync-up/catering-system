# פיתוח פלאגין חדש

## התחלה מהירה

1. העתיקו את [`src/sdk/template-plugin.ts`](../src/sdk/template-plugin.ts) לתיקייה חדשה תחת `plugins/<category>/<provider>/index.ts`.
2. עדכנו את המניפסט (`id`, `name`, `nameHe`, `category`, `permissions`, `configSchema`).
3. מיממו את `install`, `uninstall`, `healthCheck`.
4. אם הספק שולח webhooks — הוסיפו `requiresWebhook: true` ומיממו `handleWebhook`.
5. הוסיפו `actions` שניתן לקרוא דרך RPC.
6. כיתבו בדיקות תחת `tests/plugins/<name>.test.ts` או הוסיפו ל-`tests/plugins/all-plugins.test.ts`.

## עקרונות

### Least-privilege
הצהירו רק על הרשאות שבאמת דרושות. דוגמה:
```ts
permissions: ['network:api.example.com', 'storage:read', 'storage:write', 'secrets:read'],
```

### Secrets vs storage
- **secrets**: API keys, tokens, סיסמאות — תמיד מוצפן.
- **storage**: קונפיג גלוי, IDs ציבוריים, cursors.

### Idempotency
`install` חייב להיות idempotent — קריאות חוזרות לא יקלקלו מצב קיים.

### Error handling
החזירו שגיאות עם הקשר ברור. ה-Sandbox יקדים `[plugin:<id>]` אוטומטית.

### Health check
- ללא תלות חיצונית: החזירו `{status: 'ok'}` ישירות.
- עם תלות: בצעו ping קצר, השתמשו ב-timeout של 5s.

## בדיקות

השתמשו ב-`mockContext` תחת `tests/helpers/mockContext.ts`:

```ts
import { mockContext } from '../helpers/mockContext';
import myPlugin from '../../plugins/category/my-provider';

it('installs', async () => {
  const ctx = mockContext({ httpResponses: [{ status: 200 }] });
  await myPlugin.install(ctx, { apiKey: 'k' });
  expect(ctx._secrets.get('apiKey')).toBe('k');
});
```

## פלאגין OAuth2

אם authType=oauth2:
1. אל תקבלו `apiKey` ב-configSchema — הפלאגין מסתמך על `OAuthManager`.
2. ב-`install` בצעו קונפיג נוסף בלבד.
3. בקריאות HTTP — קבלו token דרך `oauth.getValidToken(provider, installationId)`.

## פלאגין Webhook

1. סמנו `requiresWebhook: true`.
2. ודאו ש-`SignatureVerifier` תומך בספק (או הוסיפו strategy).
3. מיממו `handleWebhook` — אל תחזירו promise ארוך, השתמשו ב-queue במידת הצורך.
4. בעת התקנה — רישמו את ה-webhook בספק (אם API מאפשר).
