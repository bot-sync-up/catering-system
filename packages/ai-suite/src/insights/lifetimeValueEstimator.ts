// lifetimeValueEstimator — חיזוי LTV (Customer Lifetime Value)
// מודל: BG/NBD inspired לייט — מחושב מ-frequency, recency, monetary

import type { Order } from "../shared/types.js";

export interface LTVEstimate {
  predictedLifetimeMonths: number;
  expectedFutureOrders: number;
  avgOrderValue: number;
  ltvILS: number;
  confidence: "low" | "medium" | "high";
}

export class LifetimeValueEstimator {
  /**
   * אומדן LTV ל-3 שנים קדימה.
   */
  estimate(
    orders: Order[],
    options: {
      churnProbability?: number; // אם ידוע מ-ChurnPredictor
      horizonMonths?: number;
    } = {},
  ): LTVEstimate {
    const horizonMonths = options.horizonMonths ?? 36;
    const churn = options.churnProbability ?? 0.3;
    const completed = orders.filter(
      (o) => o.status === "confirmed" || o.status === "delivered",
    );
    if (completed.length === 0) {
      return {
        predictedLifetimeMonths: 0,
        expectedFutureOrders: 0,
        avgOrderValue: 0,
        ltvILS: 0,
        confidence: "low",
      };
    }

    const sorted = [...completed].sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
    );
    const first = sorted[0].eventDate;
    const last = sorted[sorted.length - 1].eventDate;
    const tenureMonths = Math.max(
      1,
      (last.getTime() - first.getTime()) / (86_400_000 * 30),
    );
    const ordersPerMonth = sorted.length / tenureMonths;
    const avgOrderValue =
      sorted.reduce((s, o) => s + o.totalPrice, 0) / sorted.length;

    // אורך חיים מצופה: 1 / churn (אם churn=0.3 לשנה => כ-3.3 שנים)
    const expectedLifetimeMonths = Math.min(
      horizonMonths,
      (1 / Math.max(0.05, churn)) * 12,
    );
    const expectedFutureOrders = ordersPerMonth * expectedLifetimeMonths;
    const ltvILS = expectedFutureOrders * avgOrderValue;

    const confidence: LTVEstimate["confidence"] =
      sorted.length >= 5
        ? "high"
        : sorted.length >= 3
          ? "medium"
          : "low";

    return {
      predictedLifetimeMonths: Math.round(expectedLifetimeMonths * 10) / 10,
      expectedFutureOrders: Math.round(expectedFutureOrders * 10) / 10,
      avgOrderValue: Math.round(avgOrderValue),
      ltvILS: Math.round(ltvILS),
      confidence,
    };
  }
}
