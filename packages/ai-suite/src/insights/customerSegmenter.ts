// customerSegmenter — סגמנטציית RFM קלאסית
// Recency (R), Frequency (F), Monetary (M)

import type { Order } from "../shared/types.js";

export type RFMSegment =
  | "champions" // R גבוה, F גבוה, M גבוה
  | "loyal" // F גבוה, M בינוני-גבוה
  | "potential_loyalist" // R גבוה, F בינוני
  | "new_customer" // R גבוה, F נמוך
  | "at_risk" // R נמוך, F גבוה
  | "cant_lose" // R נמוך, F+M גבוהים
  | "hibernating" // R נמוך, F נמוך
  | "lost"; // R נמוך מאוד

export interface RFMScores {
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number; // 1-5
  fScore: number; // 1-5
  mScore: number; // 1-5
  segment: RFMSegment;
}

const SEGMENT_HE: Record<RFMSegment, string> = {
  champions: "אלופים",
  loyal: "נאמנים",
  potential_loyalist: "פוטנציאל נאמנות",
  new_customer: "לקוח חדש",
  at_risk: "בסיכון נטישה",
  cant_lose: "אסור לאבד",
  hibernating: "רדומים",
  lost: "אבודים",
};

export function segmentLabelHebrew(s: RFMSegment): string {
  return SEGMENT_HE[s];
}

export class CustomerSegmenter {
  /**
   * מחשב RFM scores ללקוח בודד מתוך הזמנותיו.
   * referenceDate: התאריך שביחס אליו מחשבים recency (לרוב היום).
   */
  scoreCustomer(
    customerOrders: Order[],
    referenceDate: Date = new Date(),
  ): RFMScores | null {
    const completed = customerOrders.filter(
      (o) => o.status === "confirmed" || o.status === "delivered",
    );
    if (completed.length === 0) return null;

    const lastOrder = completed.reduce((a, b) =>
      a.eventDate > b.eventDate ? a : b,
    );
    const recencyDays = Math.max(
      0,
      Math.round(
        (referenceDate.getTime() - lastOrder.eventDate.getTime()) /
          86_400_000,
      ),
    );
    const frequency = completed.length;
    const monetary = completed.reduce((s, o) => s + o.totalPrice, 0);

    // ציונים יחסיים — כאן heuristics קבועים (בייצור: לחשב מתוך התפלגות הלקוחות)
    const rScore = recencyDays < 30 ? 5 : recencyDays < 90 ? 4 : recencyDays < 180 ? 3 : recencyDays < 365 ? 2 : 1;
    const fScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
    const mScore = monetary >= 100_000 ? 5 : monetary >= 50_000 ? 4 : monetary >= 20_000 ? 3 : monetary >= 5_000 ? 2 : 1;

    const segment = this.classifySegment(rScore, fScore, mScore);
    return { recencyDays, frequency, monetary, rScore, fScore, mScore, segment };
  }

  private classifySegment(r: number, f: number, m: number): RFMSegment {
    if (r >= 4 && f >= 4 && m >= 4) return "champions";
    if (f >= 4 && m >= 3) return "loyal";
    if (r >= 4 && f >= 2 && f < 4) return "potential_loyalist";
    if (r >= 4 && f <= 2) return "new_customer";
    if (r <= 2 && f >= 4 && m >= 4) return "cant_lose";
    if (r <= 2 && f >= 3) return "at_risk";
    if (r <= 2 && f <= 2) return "hibernating";
    if (r === 1) return "lost";
    return "potential_loyalist";
  }

  /**
   * סגמנטציה אצוותית — מסכמת כמה לקוחות בכל סגמנט.
   */
  segmentAll(
    customerToOrders: Map<string, Order[]>,
    referenceDate?: Date,
  ): Map<string, RFMScores> {
    const out = new Map<string, RFMScores>();
    for (const [cid, orders] of customerToOrders) {
      const s = this.scoreCustomer(orders, referenceDate);
      if (s) out.set(cid, s);
    }
    return out;
  }
}
