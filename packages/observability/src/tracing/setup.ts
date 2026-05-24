/**
 * אתחול OpenTelemetry SDK עבור Node ו-Browser.
 *
 * Node: שימוש ב-NodeSDK עם BatchSpanProcessor ו-OTLP HTTP exporter.
 * Browser: שימוש ב-WebTracerProvider עם Fetch instrumentation.
 *
 * משתני סביבה:
 *   OTEL_SERVICE_NAME       — שם השירות (חובה)
 *   OTEL_SERVICE_VERSION    — גרסה (ברירת מחדל 0.0.0)
 *   OTEL_DEPLOYMENT_ENV     — production/staging/dev
 *   OTEL_EXPORTER_OTLP_ENDPOINT — בד"כ http://tempo:4318
 *   OTEL_TRACES_SAMPLER_ARG — שיעור דגימה (0.0-1.0)
 */

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import {
  SemanticResourceAttributes,
} from "@opentelemetry/semantic-conventions";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { buildNodeInstrumentations } from "./instrumentations.js";
import { createTraceExporter } from "./exporters.js";

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  endpoint?: string;
  sampleRatio?: number;
  debug?: boolean;
}

let sdkInstance: NodeSDK | null = null;

/**
 * אתחול Tracing בצד שרת. יש לקרוא לפני import של אקספרס/פריזמה.
 */
export function initNodeTracing(opts: TracingOptions): NodeSDK {
  if (sdkInstance) {
    return sdkInstance;
  }

  if (opts.debug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: opts.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]:
      opts.serviceVersion ?? process.env.OTEL_SERVICE_VERSION ?? "0.0.0",
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      opts.environment ?? process.env.OTEL_DEPLOYMENT_ENV ?? "development",
    [SemanticResourceAttributes.HOST_NAME]:
      process.env.HOSTNAME ?? "unknown",
  });

  const exporter = createTraceExporter({
    endpoint:
      opts.endpoint ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
      "http://localhost:4318",
  });

  const sampler = new TraceIdRatioBasedSampler(
    opts.sampleRatio ??
      Number(process.env.OTEL_TRACES_SAMPLER_ARG ?? "1.0"),
  );

  sdkInstance = new NodeSDK({
    resource,
    sampler,
    spanProcessor: new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }),
    instrumentations: buildNodeInstrumentations(),
  });

  sdkInstance.start();

  process.on("SIGTERM", () => {
    sdkInstance?.shutdown().catch(() => undefined);
  });

  return sdkInstance;
}

/**
 * אתחול Tracing בצד דפדפן (React/Vue/Vanilla).
 * מיובא דינמית כדי לא לטעון web SDK בצד שרת.
 */
export async function initBrowserTracing(opts: TracingOptions): Promise<void> {
  // ייבוא דינמי — קוד דפדפן לא יטען בצד שרת
  const { WebTracerProvider } = await import("@opentelemetry/sdk-trace-web");
  const { Resource: WebResource } = await import("@opentelemetry/resources");
  const { BatchSpanProcessor: WebBatch } = await import(
    "@opentelemetry/sdk-trace-base"
  );
  const { OTLPTraceExporter } = await import(
    "@opentelemetry/exporter-trace-otlp-http"
  );

  const provider = new WebTracerProvider({
    resource: new WebResource({
      [SemanticResourceAttributes.SERVICE_NAME]: opts.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]:
        opts.serviceVersion ?? "0.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        opts.environment ?? "production",
    }),
  });

  provider.addSpanProcessor(
    new WebBatch(
      new OTLPTraceExporter({
        url: `${opts.endpoint ?? "/otlp"}/v1/traces`,
      }),
    ),
  );

  provider.register();
}

export function getSdk(): NodeSDK | null {
  return sdkInstance;
}

export async function shutdownTracing(): Promise<void> {
  if (sdkInstance) {
    await sdkInstance.shutdown();
    sdkInstance = null;
  }
}
