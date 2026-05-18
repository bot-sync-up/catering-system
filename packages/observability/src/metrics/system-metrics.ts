/**
 * מטריקות מערכת — RED + USE:
 *
 * http_request_duration_seconds — Rate, Errors, Duration
 * db_query_duration_seconds      — Prisma/pg
 * queue_depth                    — BullMQ
 * queue_processing_duration      — זמן עיבוד job
 * sse_connections                — מספר חיבורי SSE פתוחים
 */

import { Counter, Gauge, Histogram } from "prom-client";
import { registry } from "./registry.js";

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "משך request HTTP בשניות",
  labelNames: ["method", "route", "status_code"] as const,
  // 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "סך requests לפי method/route/status",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "requests פעילים כרגע",
  labelNames: ["method"] as const,
  registers: [registry],
});

export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "משך שאילתת DB בשניות",
  labelNames: ["operation", "model"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: "db_connections_active",
  help: "חיבורי DB פעילים בפול",
  labelNames: ["pool"] as const,
  registers: [registry],
});

export const queueDepth = new Gauge({
  name: "queue_depth",
  help: "מספר jobs בתור (waiting + delayed)",
  labelNames: ["queue", "state"] as const,
  registers: [registry],
});

export const queueProcessingDuration = new Histogram({
  name: "queue_processing_duration_seconds",
  help: "זמן עיבוד job",
  labelNames: ["queue", "job_name", "result"] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const queueJobsTotal = new Counter({
  name: "queue_jobs_total",
  help: "סך jobs לפי תוצאה",
  labelNames: ["queue", "job_name", "result"] as const,
  registers: [registry],
});

export const sseConnections = new Gauge({
  name: "sse_connections",
  help: "חיבורי SSE פתוחים כרגע",
  labelNames: ["endpoint"] as const,
  registers: [registry],
});

export const sseMessagesSent = new Counter({
  name: "sse_messages_sent_total",
  help: "סך הודעות SSE שנשלחו",
  labelNames: ["endpoint", "event"] as const,
  registers: [registry],
});

export const cacheHits = new Counter({
  name: "cache_hits_total",
  help: "פגיעות cache",
  labelNames: ["cache", "result"] as const,
  registers: [registry],
});
