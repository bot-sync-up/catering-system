/**
 * Sentry Express middlewares.
 *
 * Sentry SDK v8+ עוטף את Express אוטומטית כש-expressIntegration
 * מופעל. הקבצים פה הם wrappers נוחים שמייצאים גם
 * RequestHandler וגם ErrorHandler עם defaults.
 */

import * as Sentry from "@sentry/node";
import type { Handler, ErrorRequestHandler, Request } from "express";

/**
 * Request handler — מוסיף scope ו-tags לכל request.
 * חייב להירשם לפני כל route.
 */
export function sentryRequestHandler(): Handler {
  return function sentryRequest(req, _res, next) {
    Sentry.withScope((scope) => {
      scope.setTag("http.method", req.method);
      scope.setTag("http.route", req.path);

      const requestId = req.headers["x-request-id"] as string | undefined;
      if (requestId) {
        scope.setTag("request_id", requestId);
      }

      const userId = (
        req as Request & { user?: { id?: string } }
      ).user?.id;
      if (userId) {
        scope.setUser({ id: userId });
      }

      next();
    });
  };
}

/**
 * Error handler — חייב להיות אחרון בשרשרת ה-middleware.
 * מסנן 4xx (לקוח אשם), שולח רק 5xx.
 */
export function sentryErrorHandler(): ErrorRequestHandler {
  return function sentryError(err, req, res, next) {
    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode ??
      500;

    if (status >= 500) {
      Sentry.captureException(err, {
        tags: {
          "http.method": req.method,
          "http.route": req.path,
          "http.status_code": String(status),
        },
      });
    }

    next(err);
  };
}
