/**
 * פורמט JSON אחיד עבור Loki / Datadog / ELK.
 *
 * Loki מעדיף שכל log יהיה JSON שורה אחת עם labels תאומים
 * (service, env, level). Pino כבר מפיק JSON כזה — כאן אנחנו
 * רק נורמלי שדות לסכמה אחידה.
 */

import type { Logger } from "pino";
import { correlationBindings } from "./correlation.js";

/**
 * סכמת לוג סטנדרטית — לפי Elastic Common Schema (ECS) מקוצר.
 */
export interface LogRecord {
  "@timestamp": string;
  level: string;
  message: string;
  service: string;
  env: string;
  trace_id?: string;
  span_id?: string;
  request_id?: string;
  user_id?: string;
  tenant_id?: string;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  http?: {
    method?: string;
    route?: string;
    status_code?: number;
    duration_ms?: number;
  };
  [key: string]: unknown;
}

/**
 * Formatter — מחזיר פונקציה שמקבלת אובייקט pino וממירה ל-LogRecord.
 *
 * שימוש: לא נדרש בד"כ. Pino מפיק JSON תואם Loki כברירת מחדל.
 * הפונקציה הזו ל-transports מותאמים אישית או לבדיקות.
 */
export function jsonFormatter(input: Record<string, unknown>): LogRecord {
  const time =
    typeof input.time === "string"
      ? input.time
      : new Date(typeof input.time === "number" ? input.time : Date.now()).toISOString();

  const error =
    input.err && typeof input.err === "object"
      ? {
          type: (input.err as { type?: string }).type ?? "Error",
          message: (input.err as { message?: string }).message ?? "",
          stack: (input.err as { stack?: string }).stack,
        }
      : undefined;

  return {
    "@timestamp": time,
    level: String(input.level ?? "info"),
    message: String(input.msg ?? input.message ?? ""),
    service: String(input.service ?? "unknown"),
    env: String(input.env ?? "development"),
    trace_id: input.trace_id as string | undefined,
    span_id: input.span_id as string | undefined,
    request_id: input.request_id as string | undefined,
    user_id: input.user_id as string | undefined,
    tenant_id: input.tenant_id as string | undefined,
    error,
    ...stripCoreFields(input),
  };
}

function stripCoreFields(input: Record<string, unknown>) {
  const {
    time,
    msg,
    message,
    level,
    service,
    env,
    trace_id,
    span_id,
    request_id,
    user_id,
    tenant_id,
    err,
    ...rest
  } = input;
  void time;
  void msg;
  void message;
  void level;
  void service;
  void env;
  void trace_id;
  void span_id;
  void request_id;
  void user_id;
  void tenant_id;
  void err;
  return rest;
}

/**
 * עוטף logger כך שכל קריאה משלימה אוטומטית עם correlation IDs.
 *
 * דוגמה:
 *   const log = withCorrelation(baseLogger);
 *   log.info("hello"); // יכלול request_id+trace_id אם זמינים
 */
export function withCorrelation(logger: Logger): Logger {
  return logger.child(correlationBindings());
}
