/**
 * OTLP HTTP exporter — שולח ל-Tempo / Jaeger / Collector.
 *
 * Tempo: HTTP על פורט 4318, נתיב /v1/traces.
 * Jaeger (4.x+): תומך OTLP על אותו פורט.
 *
 * דוגמה: OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import type { SpanExporter } from "@opentelemetry/sdk-trace-base";

export interface ExporterOptions {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMillis?: number;
}

/**
 * יצירת trace exporter ל-OTLP HTTP.
 * אם endpoint כבר כולל /v1/traces — לא מוסיף שוב.
 */
export function createTraceExporter(opts: ExporterOptions): SpanExporter {
  const url = opts.endpoint.endsWith("/v1/traces")
    ? opts.endpoint
    : `${opts.endpoint.replace(/\/$/, "")}/v1/traces`;

  return new OTLPTraceExporter({
    url,
    headers: opts.headers,
    timeoutMillis: opts.timeoutMillis ?? 10_000,
  });
}

/**
 * יצירת metrics exporter ל-OTLP HTTP — אופציונלי,
 * רוב הפריסות שלנו משתמשות ב-Prometheus scrape ולא ב-push.
 */
export function createMetricExporter(opts: ExporterOptions) {
  const url = opts.endpoint.endsWith("/v1/metrics")
    ? opts.endpoint
    : `${opts.endpoint.replace(/\/$/, "")}/v1/metrics`;

  return new OTLPMetricExporter({
    url,
    headers: opts.headers,
    timeoutMillis: opts.timeoutMillis ?? 10_000,
  });
}

/**
 * מיפוי backend → endpoint ברירת מחדל.
 */
export const DEFAULT_ENDPOINTS = {
  tempo: "http://tempo:4318",
  jaeger: "http://jaeger:4318",
  collector: "http://otel-collector:4318",
  localhost: "http://localhost:4318",
} as const;
