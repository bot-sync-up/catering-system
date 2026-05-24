/**
 * Correlation IDs — request_id + trace_id propagation.
 *
 * - מוציא request_id מ-header x-request-id (אם קיים) או יוצר חדש.
 * - חוטף את trace_id הנוכחי מ-OpenTelemetry (אם פעיל).
 * - חושף לכל הקריאות הבאות באותו request דרך AsyncLocalStorage.
 * - מוסיף לכל log את ה-IDs האלה אוטומטית כש-bindings מתבצע.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { nanoid } from "nanoid";
import type { Request, Response, NextFunction, Handler } from "express";
import { currentTraceId, currentSpanId } from "../tracing/span-helpers.js";

export interface CorrelationContext {
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
}

const als = new AsyncLocalStorage<CorrelationContext>();

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_HEADER_ALT = "x-correlation-id";

/**
 * Express middleware — מקים context לכל request.
 */
export function correlationMiddleware(): Handler {
  return function correlation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const incoming =
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ??
      (req.headers[REQUEST_ID_HEADER_ALT] as string | undefined);

    const requestId = incoming ?? nanoid(16);

    const ctx: CorrelationContext = {
      requestId,
      traceId: currentTraceId(),
      spanId: currentSpanId(),
    };

    // מוסיף ל-response כדי שלקוחות יוכלו לעקוב
    res.setHeader(REQUEST_ID_HEADER, requestId);

    // חושף ב-req לנוחות
    (req as Request & { correlation?: CorrelationContext }).correlation = ctx;

    als.run(ctx, () => next());
  };
}

/**
 * שליפת ה-context הנוכחי — מחזיר undefined אם מחוץ ל-request.
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return als.getStore();
}

export function getCorrelationId(): string | undefined {
  return als.getStore()?.requestId;
}

/**
 * מאפשר לעדכן את ה-context באמצע request (למשל לאחר auth).
 */
export function setCorrelationFields(fields: Partial<CorrelationContext>): void {
  const ctx = als.getStore();
  if (ctx) {
    Object.assign(ctx, fields);
  }
}

/**
 * עוטף callback ב-context קיים — שימושי ל-BullMQ workers.
 */
export function runWithCorrelation<T>(
  ctx: CorrelationContext,
  fn: () => T,
): T {
  return als.run(ctx, fn);
}

/**
 * bindings ל-pino child logger — שימוש:
 *   logger.child(correlationBindings())
 */
export function correlationBindings(): Record<string, string | undefined> {
  const ctx = als.getStore();
  if (!ctx) return {};
  return {
    request_id: ctx.requestId,
    trace_id: ctx.traceId ?? currentTraceId(),
    span_id: ctx.spanId ?? currentSpanId(),
    user_id: ctx.userId,
    tenant_id: ctx.tenantId,
  };
}
