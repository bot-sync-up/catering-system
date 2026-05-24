/**
 * @syncup/observability — נקודת כניסה ראשית
 *
 * חבילה זו אוספת Telemetry מלא: Traces, Metrics, Logs, Errors.
 * שימוש: ייבא רק את מה שצריך — אין side-effects ברמת המודול הזה.
 */

export * as tracing from "./tracing/setup.js";
export * as tracingExporters from "./tracing/exporters.js";
export * as spanHelpers from "./tracing/span-helpers.js";

export * as metricsRegistry from "./metrics/registry.js";
export * as businessMetrics from "./metrics/business-metrics.js";
export * as systemMetrics from "./metrics/system-metrics.js";
export { metricsMiddleware } from "./metrics/middleware.js";

export { createLogger, redactPaths } from "./logging/pino.js";
export { correlationMiddleware, getCorrelationId } from "./logging/correlation.js";
export { jsonFormatter } from "./logging/json-format.js";

export * as sentryServer from "./sentry/setup.js";
export { sentryRequestHandler, sentryErrorHandler } from "./sentry/middleware.js";
