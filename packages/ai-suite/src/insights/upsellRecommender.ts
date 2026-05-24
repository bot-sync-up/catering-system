// upsellRecommender — המלצות upsell ו-cross-sell
// market basket — אילו פריטים מופיעים ביחד בהזמנות

import type { Order, MenuItem } from "../shared/types.js";

export interface Recommendation {
  itemId: string;
  itemName?: string;
  reason: "frequently_paired" | "upsell_price" | "complete_meal" | "popular_in_segment";
  score: number; // 0..1
  explanation: string;
}

export class UpsellRecommender {
  private pairCounts = new Map<string, Map<string, number>>();
  private itemCounts = new Map<string, number>();
  private menu = new Map<string, MenuItem>();

  /**
   * אימון על היסטוריית הזמנות.
   */
  train(orders: Order[], menu: MenuItem[] = []): void {
    for (const m of menu) this.menu.set(m.id, m);
    for (const order of orders) {
      const ids = order.items.map((i) => i.menuItemId);
      for (const id of ids) {
        this.itemCounts.set(id, (this.itemCounts.get(id) ?? 0) + 1);
      }
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          this.addPair(ids[i], ids[j]);
          this.addPair(ids[j], ids[i]);
        }
      }
    }
  }

  private addPair(a: string, b: string): void {
    let m = this.pairCounts.get(a);
    if (!m) {
      m = new Map();
      this.pairCounts.set(a, m);
    }
    m.set(b, (m.get(b) ?? 0) + 1);
  }

  /**
   * המלצות לסל קיים.
   */
  recommendForBasket(currentItemIds: string[], topK = 5): Recommendation[] {
    const scores = new Map<string, number>();
    const explanations = new Map<string, string>();

    for (const cur of currentItemIds) {
      const partners = this.pairCounts.get(cur);
      if (!partners) continue;
      const curCount = this.itemCounts.get(cur) ?? 1;
      for (const [other, pairCount] of partners) {
        if (currentItemIds.includes(other)) continue;
        // confidence = P(other | cur)
        const confidence = pairCount / curCount;
        const otherCount = this.itemCounts.get(other) ?? 1;
        const totalOrders = Array.from(this.itemCounts.values()).reduce(
          (s, n) => s + n,
          1,
        );
        const lift = confidence / (otherCount / totalOrders);
        const score = Math.min(1, confidence * Math.min(lift, 3) / 3);
        const prev = scores.get(other) ?? 0;
        if (score > prev) {
          scores.set(other, score);
          const otherName = this.menu.get(other)?.name ?? other;
          const curName = this.menu.get(cur)?.name ?? cur;
          explanations.set(
            other,
            `לקוחות שהזמינו "${curName}" הזמינו גם "${otherName}" ב-${Math.round(confidence * 100)}% מהמקרים`,
          );
        }
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([itemId, score]) => ({
        itemId,
        itemName: this.menu.get(itemId)?.name,
        reason: "frequently_paired",
        score,
        explanation: explanations.get(itemId)!,
      }));
  }

  /**
   * upsell לפי מחיר — מציע פריטים יקרים יותר באותה קטגוריה.
   */
  recommendUpsell(currentItemId: string, topK = 3): Recommendation[] {
    const current = this.menu.get(currentItemId);
    if (!current) return [];
    const candidates = Array.from(this.menu.values()).filter(
      (m) =>
        m.category === current.category &&
        m.kosher === current.kosher &&
        m.pricePerGuest > current.pricePerGuest &&
        m.pricePerGuest <= current.pricePerGuest * 1.5,
    );
    return candidates
      .sort((a, b) => a.pricePerGuest - b.pricePerGuest)
      .slice(0, topK)
      .map((m) => ({
        itemId: m.id,
        itemName: m.name,
        reason: "upsell_price",
        score: 1 - (m.pricePerGuest - current.pricePerGuest) / current.pricePerGuest,
        explanation: `שדרוג מ-"${current.name}" ל-"${m.name}" בתוספת ₪${Math.round(m.pricePerGuest - current.pricePerGuest)} למנה`,
      }));
  }
}
