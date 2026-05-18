/**
 * Sentry — server + browser.
 *
 * Server (Node):
 *   - error capture
 *   - performance monitoring (transactions)
 *   - profiling (CPU sampler)
 *
 * Browser:
 *   - error capture
 *   - performance (Web Vitals: LCP, CLS, FID, INP)
 *   - replay (אופציונלי, מודע ל-PII)
 *
 * Source maps:
 *   - מעלים בזמן build דרך sentry-cli או @sentry/webpack-plugin.
 *   - SENTRY_AUTH_TOKEN ו-SENTRY_ORG/SENTRY_PROJECT בסביבת ה-CI.
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export interface SentryServerOptions {
  dsn: string;
  environment?: string;
  release?: string;
  /** 0..1 — ברירת מחדל 0.1 בפרודקשן */
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  /** רשימת dependencies לכלול ב-stack frames */
  attachStacktrace?: boolean;
  /** debug logging */
  debug?: boolean;
}

let initialized = false;

/**
 * אתחול Sentry בצד שרת. יש לקרוא לפני שאר ה-imports.
 */
export function initSentryServer(opts: SentryServerOptions): void {
  if (initialized) return;
  if (!opts.dsn) {
    console.warn("[sentry] no DSN provided — skipping init");
    return;
  }

  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment ?? process.env.OTEL_DEPLOYMENT_ENV ?? "development",
    release: opts.release ?? process.env.SENTRY_RELEASE,
    tracesSampleRate: opts.tracesSampleRate ?? 0.1,
    profilesSampleRate: opts.profilesSampleRate ?? 0.1,
    attachStacktrace: opts.attachStacktrace ?? true,
    debug: opts.debug ?? false,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      Sentry.prismaIntegration(),
    ],
    beforeSend(event) {
      // הסרת cookies וכותרות sensitive
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },
  });

  initialized = true;
}

/**
 * Browser init — דינמי כדי לא לטעון בצד שרת.
 */
export async function initSentryBrowser(opts: {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}): Promise<void> {
  const Browser = await import("@sentry/browser");

  Browser.init({
    dsn: opts.dsn,
    environment: opts.environment ?? "production",
    release: opts.release,
    tracesSampleRate: opts.tracesSampleRate ?? 0.1,
    replaysSessionSampleRate: opts.replaysSessionSampleRate ?? 0.1,
    replaysOnErrorSampleRate: opts.replaysOnErrorSampleRate ?? 1.0,
    integrations: [
      Browser.browserTracingIntegration(),
      Browser.replayIntegration({
        // הסתרת inputs רגישים
        maskAllInputs: true,
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
}

export { Sentry };

/**
 * עזר — דיווח שגיאה ידני עם context.
 */
export function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.captureException(err, {
    extra: context,
  });
}

export async function flushSentry(timeoutMs = 5000): Promise<void> {
  await Sentry.flush(timeoutMs);
}
