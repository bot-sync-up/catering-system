# Sentry Integration Guide

מדריך אינטגרציה ל-Sentry בכל אפליקציה ב-monorepo.

## 1. התקנה
```bash
pnpm add @sentry/nextjs @sentry/profiling-node
pnpm dlx @sentry/wizard@latest -i nextjs
```

## 2. `sentry.client.config.ts` (לכל אפליקציה)
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
  release: process.env.NEXT_PUBLIC_RELEASE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    Sentry.browserTracingIntegration(),
  ],
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.user?.ip_address) delete event.user.ip_address;
    return event;
  },
});
```

## 3. `sentry.server.config.ts`
```ts
import * as Sentry from "@sentry/nextjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.RELEASE_TAG,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [nodeProfilingIntegration()],
  ignoreErrors: [/^AbortError/, /ECONNRESET/],
});
```

## 4. `sentry.edge.config.ts`
```ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.05,
});
```

## 5. Source-maps upload (CI)
ב-`deploy-prod.yml` הוסיפו:
```yaml
- run: pnpm dlx @sentry/cli releases new ${{ inputs.release_tag }}
  env: { SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }} }
- run: pnpm dlx @sentry/cli releases files ${{ inputs.release_tag }} upload-sourcemaps .next
- run: pnpm dlx @sentry/cli releases finalize ${{ inputs.release_tag }}
```

## 6. PII / GDPR
- `maskAllText`, `blockAllMedia` ב-Replay
- `beforeSend` מסיר cookies, IP
- Data Scrubbing מופעל ב-project settings (Default rules + Israeli ID custom rule)

## 7. Alert rules
- New issue (any) -> Slack #incidents
- Error count > 100/h -> PagerDuty critical
- Performance regression p95 > 1s -> Slack #perf
