// churnPredictor — חיזוי נטישה
// מודל לוגיסטי פשוט מבוסס פיצ'רים: recency, frequency trend, monetary trend, complaint count

import type { Order } from "../shared/types.js";

export interface ChurnFeatures {
  recencyDays: number;
  totalOrders: number;
  ordersLast90Days: number;
  avgIntervalDays: number;
  complaintCount: number;
  trendDirection: "growing" | "stable" | "declining";
}

export interface ChurnPrediction {
  probability: number; // 0..1
  risk: "low" | "medium" | "high" | "critical";
  features: ChurnFeatures;
  topReasons: string[];
}

export class ChurnPredictor {
  /**
   * מחשב פיצ'רים מהזמנות + מספר תלונות.
   */
  extractFeatures(
    orders: Order[],
    complaintCount = 0,
    referenceDate: Date = new Date(),
  ): ChurnFeatures {
    if (orders.length === 0) {
      return {
        recencyDays: Infinity,
        totalOrders: 0,
        ordersLast90Days: 0,
        avgIntervalDays: Infinity,
        complaintCount,
        trendDirection: "declining",
      };
    }
    const sorted = [...orders].sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
    );
    const last = sorted[sorted.length - 1];
    const recencyDays = Math.max(
      0,
      Math.round(
        (referenceDate.getTime() - last.eventDate.getTime()) / 86_400_000,
      ),
    );
    const ordersLast90Days = sorted.filter(
      (o) =>
        (referenceDate.getTime() - o.eventDate.getTime()) / 86_400_000 <= 90,
    ).length;
    let totalIntervals = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalIntervals +=
        (sorted[i].eventDate.getTime() - sorted[i - 1].eventDate.getTime()) /
        86_400_000;
    }
    const avgIntervalDays =
      sorted.length > 1 ? totalIntervals / (sorted.length - 1) : Infinity;

    // מגמה: השווה ממוצע 3 אחרונים לממוצע 3 לפניהם
    let trendDirection: ChurnFeatures["trendDirection"] = "stable";
    if (sorted.length >= 6) {
      const recent = sorted
        .slice(-3)
        .reduce((s, o) => s + o.totalPrice, 0) / 3;
      const prior = sorted
        .slice(-6, -3)
        .reduce((s, o) => s + o.totalPrice, 0) / 3;
      if (recent > prior * 1.2) trendDirection = "growing";
      else if (recent < prior * 0.8) trendDirection = "declining";
    }

    return {
      recencyDays,
      totalOrders: sorted.length,
      ordersLast90Days,
      avgIntervalDays,
      complaintCount,
      trendDirection,
    };
  }

  /**
   * חישוב הסתברות נטישה — sigmoid על ציון משוקלל.
   */
  predict(features: ChurnFeatures): ChurnPrediction {
    const reasons: string[] = [];
    let score = 0;

    // משקל recency — הכי חזק
    if (features.recencyDays > 365) {
      score += 3;
      reasons.push("לא הזמין מעל שנה");
    } else if (features.recencyDays > 180) {
      score += 2;
      reasons.push("לא הזמין מעל חצי שנה");
    } else if (features.recencyDays > 90) {
      score += 1;
      reasons.push("לא הזמין מעל 90 ימים");
    }

    // recency חורגת מהממוצע
    if (
      features.avgIntervalDays !== Infinity &&
      features.recencyDays > features.avgIntervalDays * 2
    ) {
      score += 1.5;
      reasons.push("חרגה מקצב ההזמנות הרגיל פי 2");
    }

    if (features.ordersLast90Days === 0 && features.totalOrders > 2) {
      score += 1;
      reasons.push("אין הזמנות ברבעון האחרון");
    }

    if (features.complaintCount >= 2) {
      score += 1.5;
      reasons.push(`${features.complaintCount} תלונות`);
    }

    if (features.trendDirection === "declining") {
      score += 1;
      reasons.push("מגמת ירידה בהיקף הזמנות");
    }

    // sigmoid
    const probability = 1 / (1 + Math.exp(-(score - 2.5)));
    const risk: ChurnPrediction["risk"] =
      probability > 0.75
        ? "critical"
        : probability > 0.5
          ? "high"
          : probability > 0.25
            ? "medium"
            : "low";

    return { probability, risk, features, topReasons: reasons.slice(0, 3) };
  }
}
