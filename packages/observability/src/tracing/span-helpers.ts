/**
 * Span helpers — APIs נוחים סביב OpenTelemetry trace API.
 *
 * withSpan(name, fn): פותח span, מריץ fn, סוגר. תופס שגיאות
 * ומסמן את ה-span כשגיאה אוטומטית.
 */

import { trace, context, SpanStatusCode, SpanKind } from "@opentelemetry/api";
import type { Span, Tracer, Attributes } from "@opentelemetry/api";

const DEFAULT_TRACER_NAME = "@syncup/observability";

export function getTracer(name = DEFAULT_TRACER_NAME): Tracer {
  return trace.getTracer(name);
}

export interface SpanOptions {
  attributes?: Attributes;
  kind?: SpanKind;
  tracerName?: string;
}

/**
 * עוטף פונקציה אסינכרונית ב-span. שגיאות מסמנות את ה-span כ-ERROR.
 *
 * @example
 *   await withSpan("payment.charge", async () => {
 *     await stripe.charges.create(...);
 *   }, { attributes: { "payment.provider": "stripe" } });
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options: SpanOptions = {},
): Promise<T> {
  const tracer = getTracer(options.tracerName);
  return tracer.startActiveSpan(
    name,
    {
      kind: options.kind ?? SpanKind.INTERNAL,
      attributes: options.attributes,
    },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (err as Error).message,
        });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * גרסה סינכרונית של withSpan.
 */
export function withSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  options: SpanOptions = {},
): T {
  const tracer = getTracer(options.tracerName);
  return tracer.startActiveSpan(
    name,
    {
      kind: options.kind ?? SpanKind.INTERNAL,
      attributes: options.attributes,
    },
    (span) => {
      try {
        const result = fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (err as Error).message,
        });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * מחזיר את ה-trace ID של ה-span הפעיל (לקישור בלוגים).
 */
export function currentTraceId(): string | undefined {
  return trace.getSpan(context.active())?.spanContext().traceId;
}

export function currentSpanId(): string | undefined {
  return trace.getSpan(context.active())?.spanContext().spanId;
}

/**
 * הוספת attributes ל-span הנוכחי (אם קיים).
 */
export function addAttributes(attrs: Attributes): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttributes(attrs);
  }
}

/**
 * הוספת אירוע ל-span הנוכחי.
 */
export function addEvent(name: string, attrs?: Attributes): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.addEvent(name, attrs);
  }
}

export { SpanKind, SpanStatusCode };
