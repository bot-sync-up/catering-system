# @syncup/observability

חבילת Observability + Telemetry מלאה: OpenTelemetry traces, Prometheus metrics, Pino logs, Sentry errors, Grafana dashboards, התראות, SLOs ו-status page.

## מבט-על

```
┌─────────────────────────────────────────────────────────────────┐
│                       האפליקציה שלך                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Tracing  │  │ Metrics  │  │ Logging  │  │  Sentry  │         │
│  │  (OTel)  │  │  (Prom)  │  │ (Pino)   │  │          │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
     Tempo       Prometheus       Loki         Sentry
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             ▼
                          Grafana ──── Alertmanager ──► PagerDuty/Slack/Email
                             │
                             ▼
                         Status Page (Statping)
```

## התקנה

```bash
pnpm add @syncup/observability
```

### Peer dependencies

```bash
pnpm add express
```

## אתחול — צד שרת (Node)

**חשוב**: יש לאתחל את ה-tracing **לפני** שאר ה-imports. דרך הכי בטוחה — לעשות זאת בקובץ `instrumentation.ts` שמיובא ראשון ב-entry point.

```ts
// src/instrumentation.ts
import { tracing, sentryServer } from "@syncup/observability";

tracing.initNodeTracing({
  serviceName: "syncup-api",
  serviceVersion: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  sampleRatio: 0.1,
});

sentryServer.initSentryServer({
  dsn: process.env.SENTRY_DSN!,
  release: process.env.SENTRY_RELEASE,
});
```

```ts
// src/index.ts
import "./instrumentation.js";   // חייב להיות ראשון!
import express from "express";
import {
  correlationMiddleware,
  metricsMiddleware,
  sentryRequestHandler,
  sentryErrorHandler,
  createLogger,
} from "@syncup/observability";
import { metricsEndpoint } from "@syncup/observability/metrics/middleware";

const logger = createLogger({ serviceName: "syncup-api", pretty: true });
const app = express();

app.use(sentryRequestHandler());
app.use(correlationMiddleware());
app.use(metricsMiddleware());

// ה-routes שלך כאן

app.get("/metrics", metricsEndpoint());
app.use(sentryErrorHandler());

app.listen(3000, () => logger.info("server up"));
```

## אתחול — צד דפדפן

```ts
import { tracing, sentryServer } from "@syncup/observability";

await tracing.initBrowserTracing({
  serviceName: "syncup-web",
  endpoint: "/otlp",
  sampleRatio: 0.05,
});

await sentryServer.initSentryBrowser({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_RELEASE,
});
```

## שימוש במטריקות עסקיות

```ts
import {
  businessMetrics,
} from "@syncup/observability";

// בעת השלמת הזמנה
businessMetrics.recordOrderCompleted({
  channel: "web",
  tenant: "default",
  revenueCents: 12990,
  currency: "ILS",
});

// בעת ניסיון תשלום
businessMetrics.recordPaymentAttempt({
  provider: "stripe",
  result: "success",
  tenant: "default",
});

// OCR
businessMetrics.ocrAccuracy.set({ document_type: "invoice", model: "v2" }, 0.94);
businessMetrics.ocrConfidence.observe({ document_type: "invoice", model: "v2" }, 0.91);
```

## שימוש ב-spans ידניים

```ts
import { spanHelpers } from "@syncup/observability";

await spanHelpers.withSpan("payment.charge", async () => {
  await stripe.charges.create({ amount: 1000, currency: "ils" });
}, {
  attributes: {
    "payment.provider": "stripe",
    "payment.amount": 1000,
  },
});
```

## משתני סביבה

| משתנה | תיאור | ברירת מחדל |
|-------|-------|------------|
| `OTEL_SERVICE_NAME` | שם השירות | חובה |
| `OTEL_SERVICE_VERSION` | גרסה | `0.0.0` |
| `OTEL_DEPLOYMENT_ENV` | סביבה | `development` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | יעד Tempo/Collector | `http://localhost:4318` |
| `OTEL_TRACES_SAMPLER_ARG` | שיעור דגימה (0-1) | `1.0` |
| `LOG_LEVEL` | רמת לוג | `info` |
| `SENTRY_DSN` | DSN של Sentry | — |
| `SENTRY_RELEASE` | תג release | — |

## פריסה — תשתית

### Prometheus scrape

```yaml
scrape_configs:
  - job_name: syncup-api
    metrics_path: /metrics
    static_configs:
      - targets: ["api:3000"]
```

### Alertmanager — טעינת חוקים

```bash
cp packages/observability/alerts/*.yml /etc/prometheus/rules/
promtool check rules /etc/prometheus/rules/*.yml
```

### Grafana — ייבוא לוחות מחוונים

```bash
curl -X POST -H "Authorization: Bearer $GRAFANA_TOKEN" \
     -H "Content-Type: application/json" \
     -d @dashboards/business.json \
     https://grafana.syncup.co.il/api/dashboards/db
```

או דרך provisioning ב-`grafana/provisioning/dashboards/`.

### Status page

```bash
cd packages/observability/status-page
docker compose up -d
```

## SLOs

החבילה כוללת 3 SLOs רשמיים:

- [`slo/availability.md`](./slo/availability.md) — 99.9% זמינות
- [`slo/payment-latency.md`](./slo/payment-latency.md) — p95 תשלום < 800ms
- [`slo/ocr-turnaround.md`](./slo/ocr-turnaround.md) — p95 OCR < 10s

## Redactions בלוגים

הספרייה מסיתרת אוטומטית את השדות הבאים בכל ענפי האובייקט (כולל `req.headers.authorization`):

- `password`, `passwordHash`
- `token`, `accessToken`, `refreshToken`, `apiKey`, `secret`
- `card`, `cardNumber`, `pan`, `cvv`, `cvc`
- `ssn`, `nationalId`
- `authorization`, `cookie` בכותרות HTTP

אפשר להוסיף שדות נוספים דרך `extraRedact`:

```ts
const logger = createLogger({
  serviceName: "api",
  extraRedact: ["internalSecret", "*.privateKey"],
});
```

## בדיקת תקינות לוקאלית

```bash
# הרצת Prometheus + Grafana + Tempo + Loki לוקאלית
docker compose -f docker-compose.observability.yml up -d

# הצגת לוחות מחוונים
open http://localhost:3000  # Grafana (admin/admin)
```

## תרומה

כל מטריקה חדשה חייבת:
1. להירשם ב-`business-metrics.ts` או `system-metrics.ts`.
2. להוסיף label `tenant` אם רלוונטי לבידוד מטמיעים.
3. לא ליצור high cardinality (אסור: user_id, email, IP בלייבל).
4. דאשבורד תואם אם זה KPI עסקי.
