# @syncup/ai-suite

חבילת AI מקיפה לפלטפורמת הקייטרינג של Sync Up. שמונה מודולים מתואמים זה לזה — מצ'אטבוט שירות לקוחות ועד חיזוי ביקוש, תמחור דינמי, ניתוח רגשות, אימות כשרות ואלרגיות, סגמנטציית לקוחות ויצירת מסמכים.

---

## תכולה

| מודול | תיאור | קובץ ראשי |
|-------|--------|------------|
| Chatbot | בוט שירות לקוחות עם 5 כלים, RAG, handoff לאדם | `src/chatbot/CateringChatbot.ts` |
| Demand Forecasting | חיזוי הזמנות ומצרכים — seasonal decomposition + חגים | `src/forecasting/DemandForecaster.ts` |
| Dynamic Pricing | מנוע תמחור עם 6 גורמים והסבר בעברית | `src/pricing/DynamicPricer.ts` |
| Sentiment | ניתוח רגש + חילוץ נושאים + התראות | `src/sentiment/SentimentAnalyzer.ts` |
| Smart Kitchen | תחליפי רכיבים, אימות כשרות, סינון אלרגנים | `src/kitchen/*` |
| Customer Insights | RFM, churn, upsell, LTV | `src/insights/*` |
| Document Generation | הצעות מחיר, חוזים, קופי שיווקי | `src/docs/*` |
| Cost Control | מעקב עלויות, rate limiting, Redis cache | `src/cost/*` |

---

## התקנה

```bash
npm install @syncup/ai-suite
```

דרישות סביבה:
- `ANTHROPIC_API_KEY` — חובה לכל מודול שמשתמש ב-Claude
- `REDIS_URL` — אופציונלי. אם חסר, נופל ל-in-memory cache
- `ANTHROPIC_MODEL` — אופציונלי. ברירת מחדל: `claude-opus-4-7`

---

## שימוש מהיר

### Chatbot

```typescript
import { CateringChatbot, KnowledgeBase } from "@syncup/ai-suite/chatbot";

const kb = new KnowledgeBase();
kb.add({
  id: "1",
  title: "מדיניות ביטולים",
  content: "ניתן לבטל עד 14 ימים לפני האירוע ללא קנס.",
});

const bot = new CateringChatbot({
  toolRunner: myToolRunner, // ממשק שמחבר ל-DB שלך
  knowledgeBase: kb,
  handoffSink: { submit: async (ticket) => zendeskClient.createTicket(ticket) },
});

const response = await bot.sendMessage("מה הסטטוס של ההזמנה ORD-4421?");
console.log(response.reply);
```

### Demand Forecasting

```typescript
import { DemandForecaster } from "@syncup/ai-suite/forecasting";

const forecaster = new DemandForecaster(historicalOrders);
const forecast = forecaster.forecastOrders({
  startDate: new Date("2026-06-01"),
  endDate: new Date("2026-06-30"),
  eventType: "wedding",
});

// כל יום מקבל: predictedOrders, confidence band, drivers (seasonal/holiday/dow)
```

### Dynamic Pricing

```typescript
import { DynamicPricer } from "@syncup/ai-suite/pricing";
import { explainDeterministic } from "@syncup/ai-suite/pricing/explain";

const pricer = new DynamicPricer();
const breakdown = pricer.price({
  basePrice: 50000,
  eventDate: new Date("2026-04-02"),  // פסח, חמישי
  quoteDate: new Date(),
  customer: { ...customer, segment: "vip" },
});

console.log(explainDeterministic(breakdown));
// מציג: יום חמישי +20%, פסח +30%, לקוח VIP -8%, הזמנה מוקדמת -10% ...
```

### Sentiment + Alerts

```typescript
import { SentimentAnalyzer, TopicExtractor, AlertEngine } from "@syncup/ai-suite/sentiment";

const analyzer = new SentimentAnalyzer();
const topics = new TopicExtractor();
const alerts = new AlertEngine();

for (const feedback of incomingFeedbacks) {
  const sentiment = await analyzer.analyze(feedback.text);
  const topicResult = await topics.extract(feedback.text);
  const triggered = alerts.ingest({
    timestamp: feedback.date,
    sentiment,
    topics: topicResult,
  });
  for (const a of triggered) notifyManager(a);
}
```

### Kosher + Allergy

```typescript
import { KosherValidator, AllergyValidator } from "@syncup/ai-suite/kitchen";

const ko = new KosherValidator().validateMenu(menuItems);
if (!ko.isValid) throw new Error("תפריט לא תקני: " + ko.issues[0].message);

const al = new AllergyValidator().check(menuItems, customer.allergens);
if (!al.safe) alertCustomer(al.unsafeItems);
```

### Customer Insights

```typescript
import {
  CustomerSegmenter,
  ChurnPredictor,
  UpsellRecommender,
  LifetimeValueEstimator,
} from "@syncup/ai-suite/insights";

const segmenter = new CustomerSegmenter();
const churn = new ChurnPredictor();
const ltv = new LifetimeValueEstimator();

const rfm = segmenter.scoreCustomer(orders);
const churnFeatures = churn.extractFeatures(orders, complaintCount);
const churnRisk = churn.predict(churnFeatures);
const lifetimeValue = ltv.estimate(orders, {
  churnProbability: churnRisk.probability,
});
```

### Document Generation

```typescript
import { QuoteGenerator, ContractDrafter, MarketingCopy } from "@syncup/ai-suite/docs";

const quote = await new QuoteGenerator().generate({
  customer,
  eventType: "wedding",
  eventDate: new Date("2026-08-15"),
  guestCount: 250,
  items: selectedItems.map((item) => ({ menuItem: item, quantity: 250 })),
  pricing: pricingBreakdown,
});

const contract = await new ContractDrafter().draft({
  contractNumber: "K-2026-0142",
  customer,
  customerIdNumber: "312345678",
  customerAddress: "...",
  eventType: "wedding",
  eventDate: new Date("2026-08-15"),
  eventVenue: "גן האירועים, רעננה",
  guestCount: 250,
  totalPrice: quote.totalPrice,
});

const broadcast = await new MarketingCopy().generate({
  channel: "whatsapp_broadcast",
  campaign: "promo_passover_2026",
  audience: "לקוחות שהזמינו חתונה אשתקד",
  goal: "winback",
});
```

---

## מעקב עלויות

החבילה עוקבת אוטומטית אחרי כל קריאה ל-API:

```typescript
import { getUsageSummary } from "@syncup/ai-suite/cost";

const summary = getUsageSummary({ since: new Date(Date.now() - 86400000) });
console.log(`עלות יומית: $${summary.totalCallsUSD.toFixed(2)}`);
console.log(`Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
console.log(`לפי מודול:`, summary.byTag);
```

---

## בדיקות

```bash
npm test
```

כל הבדיקות רצות עם mock של Anthropic — לא דורש מפתח API.

---

## ארכיטקטורה

- כל מודול עצמאי וניתן לייבוא בנפרד.
- `shared/anthropicClient.ts` מרכז את כל הקריאות ל-Claude כדי שיהיה caching, מעקב עלויות ו-rate limiting אחידים.
- Prompt caching אוטומטי על כל system prompt + tool definitions.
- כל הטקסט המופנה ללקוח — בעברית.

ראה `PROMPT-LIBRARY.md` עבור התבניות המלאות.
