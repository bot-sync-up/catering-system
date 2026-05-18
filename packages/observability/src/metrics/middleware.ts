/**
 * Express middleware למדידת RED metrics אוטומטית.
 *
 * שימוש:
 *   app.use(metricsMiddleware());
 *   app.get("/metrics", metricsEndpoint());
 */

import type { Request, Response, NextFunction, Handler } from "express";
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInFlight,
} from "./system-metrics.js";
import { getMetrics, getContentType } from "./registry.js";

export interface MetricsMiddlewareOptions {
  /** מסלולים להחריג ממדידה */
  excludePaths?: (string | RegExp)[];
  /** פונקציה לנרמול route — בלי, לפי req.path (יוצר high cardinality!) */
  routeResolver?: (req: Request) => string;
}

const DEFAULT_EXCLUDES: (string | RegExp)[] = [
  "/metrics",
  "/health",
  "/healthz",
  "/ready",
  "/favicon.ico",
];

export function metricsMiddleware(
  opts: MetricsMiddlewareOptions = {},
): Handler {
  const excludes = opts.excludePaths ?? DEFAULT_EXCLUDES;

  return function metricsHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const path = req.path;
    const isExcluded = excludes.some((p) =>
      typeof p === "string" ? path === p : p.test(path),
    );

    if (isExcluded) {
      return next();
    }

    const method = req.method;
    const inFlightLabel = { method };
    httpRequestsInFlight.inc(inFlightLabel);

    const startTime = process.hrtime.bigint();

    res.on("finish", () => {
      const durationNs = Number(process.hrtime.bigint() - startTime);
      const durationSec = durationNs / 1e9;

      // נרמול route: עדיפות ל-req.route.path (Express) או resolver מותאם
      const route =
        opts.routeResolver?.(req) ??
        (req.route as { path?: string } | undefined)?.path ??
        normalizeRoute(path);

      const status = String(res.statusCode);
      const labels = { method, route, status_code: status };

      httpRequestDuration.observe(labels, durationSec);
      httpRequestsTotal.inc(labels);
      httpRequestsInFlight.dec(inFlightLabel);
    });

    res.on("close", () => {
      // הגנה למקרה שה-response נסגר בלי finish
      if (!res.writableEnded) {
        httpRequestsInFlight.dec(inFlightLabel);
      }
    });

    next();
  };
}

/**
 * נרמול נתיב — מחליף UUIDים ומספרים ב-:id כדי לא לפוצץ cardinality.
 */
function normalizeRoute(path: string): string {
  return path
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    )
    .replace(/\/\d+/g, "/:id");
}

/**
 * Handler ל-/metrics — מחזיר את כל הרישום בפורמט Prometheus.
 */
export function metricsEndpoint(): Handler {
  return async function metricsRoute(_req: Request, res: Response) {
    try {
      res.set("Content-Type", getContentType());
      res.send(await getMetrics());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}
