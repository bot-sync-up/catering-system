/**
 * מטריקות עסקיות — מה שה-CTO והפרודקט רוצים לראות.
 *
 * orders_total              — מונה הזמנות לפי status/channel
 * revenue_total             — סך הכנסות (גרושים — תמיד שלם)
 * payment_success_rate      — מחושב כיחס בין payment_attempts לפי result
 * ocr_accuracy              — gauge: דיוק OCR אחרון (0..1)
 * delivery_on_time          — מונה משלוחים: on_time | late
 */

import { Counter, Gauge, Histogram } from "prom-client";
import { registry } from "./registry.js";

export const ordersTotal = new Counter({
  name: "orders_total",
  help: "סך ההזמנות שנוצרו",
  labelNames: ["status", "channel", "tenant"] as const,
  registers: [registry],
});

export const revenueTotal = new Counter({
  name: "revenue_total_cents",
  help: "סך הכנסות באגורות (סנט) — תמיד מספר שלם",
  labelNames: ["currency", "channel", "tenant"] as const,
  registers: [registry],
});

export const paymentAttempts = new Counter({
  name: "payment_attempts_total",
  help: "ניסיונות תשלום לפי תוצאה",
  labelNames: ["provider", "result", "tenant"] as const,
  registers: [registry],
});

/**
 * payment_success_rate מחושב ב-Prometheus כ-recording rule:
 *   sum(rate(payment_attempts_total{result="success"}[5m]))
 *   /
 *   sum(rate(payment_attempts_total[5m]))
 *
 * אך אנחנו חושפים gauge עזר ל-snapshot חי לטובת בדיקות.
 */
export const paymentSuccessRate = new Gauge({
  name: "payment_success_rate",
  help: "אחוז הצלחת תשלום (0..1) — snapshot חי",
  labelNames: ["provider", "tenant"] as const,
  registers: [registry],
});

export const ocrAccuracy = new Gauge({
  name: "ocr_accuracy",
  help: "דיוק זיהוי OCR האחרון (0..1)",
  labelNames: ["document_type", "model"] as const,
  registers: [registry],
});

export const ocrConfidence = new Histogram({
  name: "ocr_confidence",
  help: "התפלגות confidence של OCR",
  labelNames: ["document_type", "model"] as const,
  buckets: [0.5, 0.7, 0.8, 0.9, 0.95, 0.99],
  registers: [registry],
});

export const deliveryOnTime = new Counter({
  name: "delivery_on_time_total",
  help: "משלוחים: on_time | late | failed",
  labelNames: ["result", "carrier", "region"] as const,
  registers: [registry],
});

export const deliveryDurationSeconds = new Histogram({
  name: "delivery_duration_seconds",
  help: "זמן משלוח מ-pickup ל-delivered",
  labelNames: ["carrier", "region"] as const,
  // 5m, 15m, 30m, 1h, 2h, 4h, 8h, 1d
  buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
  registers: [registry],
});

/**
 * Helper — רישום הזמנה שהושלמה.
 */
export function recordOrderCompleted(args: {
  channel: string;
  tenant: string;
  revenueCents: number;
  currency: string;
}): void {
  ordersTotal.inc({
    status: "completed",
    channel: args.channel,
    tenant: args.tenant,
  });
  revenueTotal.inc(
    {
      currency: args.currency,
      channel: args.channel,
      tenant: args.tenant,
    },
    args.revenueCents,
  );
}

/**
 * Helper — רישום ניסיון תשלום.
 */
export function recordPaymentAttempt(args: {
  provider: string;
  result: "success" | "failure" | "decline" | "timeout";
  tenant: string;
}): void {
  paymentAttempts.inc(args);
}
