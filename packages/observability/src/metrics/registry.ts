/**
 * Prometheus registry — singleton.
 *
 * כל המטריקות נרשמות לרישום הזה. ה-handler ב-/metrics יציג את כולן.
 */

import client from "prom-client";

const registry = new client.Registry();

// תוויות גלובליות לכל המטריקות (service, env)
registry.setDefaultLabels({
  service: process.env.OTEL_SERVICE_NAME ?? "unknown",
  env: process.env.OTEL_DEPLOYMENT_ENV ?? "development",
});

// מטריקות ברירת מחדל של Node (CPU, RAM, GC, event loop lag)
client.collectDefaultMetrics({
  register: registry,
  prefix: "node_",
});

export { registry, client };

/**
 * החזרת ה-output של Prometheus בפורמט text exposition.
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

export function getContentType(): string {
  return registry.contentType;
}

/**
 * איפוס מלא — שימושי לבדיקות בלבד.
 */
export function resetRegistry(): void {
  registry.resetMetrics();
}
