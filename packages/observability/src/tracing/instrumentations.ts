/**
 * רישום auto-instrumentations עבור הספריות הנפוצות.
 *
 * Express, HTTP, Prisma, axios (דרך HTTP), BullMQ (דרך ioredis),
 * ioredis, pg.
 *
 * BullMQ: אין auto-instrumentation רשמי. אנחנו מסתמכים על
 * ioredis instrumentation שתופס את כל פקודות הרדיס שלה,
 * ובנוסף אפשר לעטוף job processors ב-withSpan ידנית.
 */

import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import type { Instrumentation } from "@opentelemetry/instrumentation";

export interface InstrumentationOptions {
  /** מסלולים בהם לא ליצור span (למשל /health) */
  ignoreIncomingPaths?: (string | RegExp)[];
  /** hosts יוצאים להתעלם מהם (למשל metrics push) */
  ignoreOutgoingHosts?: (string | RegExp)[];
}

export function buildNodeInstrumentations(
  opts: InstrumentationOptions = {},
): Instrumentation[] {
  const ignoreIncoming = opts.ignoreIncomingPaths ?? [
    "/health",
    "/healthz",
    "/metrics",
    "/ready",
    "/favicon.ico",
  ];

  return [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) => {
        const url = req.url ?? "";
        return ignoreIncoming.some((p) =>
          typeof p === "string" ? url.startsWith(p) : p.test(url),
        );
      },
      ignoreOutgoingRequestHook: (req) => {
        const host = req.hostname ?? "";
        return (opts.ignoreOutgoingHosts ?? []).some((p) =>
          typeof p === "string" ? host === p : p.test(host),
        );
      },
      requestHook: (span, request) => {
        // axios משתמש ב-http מתחת — לכן זה תופס גם אותו
        const ua =
          "getHeader" in request
            ? (request as { getHeader: (n: string) => string }).getHeader(
                "user-agent",
              )
            : undefined;
        if (ua) {
          span.setAttribute("http.user_agent", ua);
        }
      },
    }),

    new ExpressInstrumentation({
      ignoreLayersType: ["middleware"] as never,
    }),

    new PgInstrumentation({
      enhancedDatabaseReporting: true,
      requireParentSpan: false,
    }),

    new IORedisInstrumentation({
      requireParentSpan: false,
      dbStatementSerializer: (cmdName, cmdArgs) => {
        // לא לחשוף ערכים — רק שם הפקודה ומספר הארגומנטים
        return `${cmdName} [${cmdArgs.length} args]`;
      },
    }),

    new PrismaInstrumentation({
      middleware: true,
    }),
  ];
}
