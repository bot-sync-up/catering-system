# @app/i18n

חבילת תמיכה רב-לשונית עבור 5 שפות: **עברית (he)** [default], **English (en)**, **العربية (ar)** [RTL], **Русский (ru)**, **አማርኛ (am)** (לעובדים זרים מאתיופיה).

## תכולת החבילה

```
packages/i18n/
├─ src/
│  ├─ i18n.ts                  ← מופע i18next + react-i18next
│  ├─ detectLanguage.ts        ← Browser + IP + user pref
│  ├─ RTLProvider.tsx          ← מנהל dir attribute אוטומטי
│  ├─ formatNumber.ts          ← Intl.NumberFormat per locale
│  ├─ formatDate.ts            ← תאריך/שעה/relative + לוח עברי
│  ├─ formatCurrency.ts        ← ILS / USD / RUB / ETB / AED
│  ├─ pluralizer.ts            ← כללי ריבוי (כולל one/few/many ברוסית)
│  ├─ holidays.ts              ← פסח/ר"ה/חנוכה/פורים/סוכות/שבועות/יום כיפור/ת"ב/יום העצמאות
│  ├─ cityNames.ts             ← 30 ערים × 5 שפות
│  ├─ taxonomy.ts              ← בשרי/חלבי/פרווה + כשר/מהדרין/בד"ץ/גלאט
│  ├─ foodTerms.ts             ← حلال/مكان/שווארמה/פלאפל
│  ├─ rtlCSS.ts                ← stylis-rtl-plugin auto-flip
│  ├─ textDirection.ts         ← bidi helpers
│  ├─ locales/{he,en,ar,ru,am}/{common,orders,kitchen,crm,finance,mobile,emails,errors,validation}.json
│  ├─ tools/
│  │  ├─ extract-keys.ts       ← סורק קוד מקור ומחלץ t() calls
│  │  ├─ find-missing.ts       ← מאתר מפתחות חסרים בשפות
│  │  ├─ validate-completeness.ts  ← בודק שלמות + plurals
│  │  └─ auto-translate.ts     ← תרגום אוטומטי דרך Claude
│  ├─ admin/
│  │  ├─ TranslationEditor.tsx ← UI עריכת מפתחות
│  │  └─ LocaleAnalytics.tsx   ← דשבורד שימוש לפי שפה
│  └─ emails/{he,en,ar,ru}/order-confirmation.mjml
└─ tests/
   ├─ plurals.test.ts          ← בדיקות one/few/many לפי שפה
   ├─ consistency.test.ts      ← אין מפתח חסר/יתום
   ├─ snapshot.test.ts         ← snapshots לפורמטים
   ├─ detectLanguage.test.ts
   ├─ textDirection.test.ts
   └─ taxonomy.test.ts
```

## התקנה ושימוש

```bash
pnpm add @app/i18n
```

### אתחול בסיסי

```ts
import { initI18n } from '@app/i18n';

const i18n = await initI18n({ lng: 'he', detect: true });
```

### React + RTL

```tsx
import { RTLProvider } from '@app/i18n/rtl';
import { useTranslation } from 'react-i18next';

function App() {
  return (
    <RTLProvider>
      <Welcome />
    </RTLProvider>
  );
}

function Welcome() {
  const { t } = useTranslation('common');
  return <h1>{t('welcome', { name: 'משה' })}</h1>;
}
```

ה-`RTLProvider` מעדכן את `<html dir="rtl">` ו-`<html lang="he">` אוטומטית בכל החלפת שפה.

### פורמטים

```ts
import { formatCurrency, formatDate, formatRelative } from '@app/i18n';

formatCurrency(1500, 'he');           // "1,500.00 ₪"
formatDate(new Date(), 'he');         // "24 במאי 2026"
formatRelative(yesterday, 'he');      // "אתמול"
```

### Plurals (חשוב לרוסית!)

```ts
import { pluralize } from '@app/i18n';

pluralize(1, 'ru', { one: '{{count}} заказ', few: '{{count}} заказа', many: '{{count}} заказов', other: '{{count}} заказа' });
// → "1 заказ"
pluralize(3, 'ru', { ... });  // → "3 заказа"
pluralize(7, 'ru', { ... });  // → "7 заказов"
```

או דרך i18next ישירות (מפתחות `_one`/`_few`/`_many`/`_other`):

```ts
t('orders:orders_count', { count: 7 });  // ברוסית → "7 заказов"
```

### זיהוי שפה

```ts
import { detectLanguage, getBrowserLanguages, parseAcceptLanguage } from '@app/i18n';

// Browser
detectLanguage({
  userPreference: user.preferredLanguage,     // אם יש בDB
  browserLanguages: getBrowserLanguages(),     // navigator.languages
  countryCode: 'IL',                           // מ-GeoIP
});

// Server (Next.js / Express)
detectLanguage({
  browserLanguages: parseAcceptLanguage(req.headers['accept-language']),
  countryCode: req.headers['cf-ipcountry'],
});
```

### חגים יהודיים

```ts
import { getHolidayOnDate, holidayName } from '@app/i18n';

const match = getHolidayOnDate(new Date('2026-04-02'));
if (match?.isErev) {
  // הצג: "סגור עקב ערב פסח. נחזור אחרי החג"
}
```

### כשרות

```ts
import { areCompatibleKinds, meetsKashrutLevel } from '@app/i18n';

areCompatibleKinds('meat', 'dairy');         // false — בשרי+חלבי לא תואם!
meetsKashrutLevel('badatz', 'mehadrin');     // true — בד"ץ ≥ מהדרין
```

## כלי תרגום

```bash
# חילוץ כל t() calls מהקוד
pnpm i18n:extract --src ../../apps --out ./extracted.json

# מציאת מפתחות חסרים
pnpm i18n:missing

# ולידציה מלאה (משמש ב-CI)
pnpm i18n:validate

# תרגום אוטומטי דרך Claude
ANTHROPIC_API_KEY=sk-... pnpm i18n:translate --from he --to ar,ru,en,am
```

ה-`auto-translate` משתמש ב-**prompt caching** של Anthropic על system prompt + glossary, כך שעלות הקריאות הבאות פוחתת משמעותית. הוא שולח batches של ~40 מפתחות בו-זמנית כדי לחסוך זמן.

## RTL CSS

```ts
import { flipCSS } from '@app/i18n';

const ltr = '.box { margin-left: 8px; padding-right: 4px; }';
flipCSS(ltr);
// → '.box { margin-right: 8px; padding-left: 4px; }'
```

או בעבודה עם emotion/styled-components, השתמש ב-`stylis-plugin-rtl` ישירות עם ה-CacheProvider שלך.

## אדמין UI

```tsx
import { TranslationEditor, LocaleAnalytics } from '@app/i18n';

<TranslationEditor
  loadTranslations={(locale, ns) => fetch(`/api/i18n/${locale}/${ns}`).then(r => r.json())}
  saveTranslation={(locale, ns, key, value) =>
    fetch(`/api/i18n/${locale}/${ns}/${key}`, { method: 'PUT', body: value })
  }
/>

<LocaleAnalytics
  usage={[
    { locale: 'he', activeUsers: 5200, orders: 18400, revenueILS: 920000 },
    { locale: 'ar', activeUsers: 1200, orders: 3100, revenueILS: 180000 },
    // ...
  ]}
  completeness={[
    { locale: 'ar', totalKeys: 156, translatedKeys: 142, missingKeys: 14 },
    // ...
  ]}
/>
```

## דוא"ל

תבניות MJML ב-`src/emails/{locale}/`. השתמש בכלי כמו `mjml-react` או `mjml` CLI כדי לקמפל לHTML, אז להזריק משתנים דרך Mustache / Handlebars:

```ts
import mjml from 'mjml';
import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';

const tmpl = readFileSync('emails/he/order-confirmation.mjml', 'utf8');
const html = mjml(Handlebars.compile(tmpl)({
  company: 'Sync Up',
  customer_name: 'משה',
  order_number: '12345',
  items: [{ name: 'פלאפל', quantity: 2, price: 18 }],
  total: 36,
})).html;
```

## בדיקות

```bash
pnpm test
```

הסט כולל:
- **plurals.test.ts** — קטגוריות one/few/many נכונות בכל השפות (כולל המקרים המסובכים ברוסית כמו 21=one, 25=many)
- **consistency.test.ts** — מאמת שאין מפתח חסר/יתום בין השפות
- **snapshot.test.ts** — snapshots לפורמטי מספר/מטבע/תאריך לכל השפות
- **detectLanguage.test.ts** — עדיפויות (user pref > browser > GeoIP > fallback)
- **textDirection.test.ts** — bidi וזיהוי כיוון אוטומטי
- **taxonomy.test.ts** — כשרות, כשרות הלכה (בשרי+חלבי=לא), ערים, חגים

## הערות

- ברירת המחדל לשפה ברחבי החבילה היא **עברית**.
- ערבית ועברית נחשבות **RTL** ומופעלות אוטומטית דרך `RTLProvider`.
- כל פורמטי המספרים/תאריכים/מטבעות נשענים על **Intl** הגלובלי — אין תלות בספריות אקסטרניות לפורמטים.
- ה-`auto-translate` דורש `ANTHROPIC_API_KEY`. בלעדיו אפשר להשתמש ב-`--dry-run` כדי לראות אילו מפתחות יישלחו.
