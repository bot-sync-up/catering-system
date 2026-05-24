// QuoteGenerator — יצירת הצעות מחיר מפורטות בעברית
// מבוסס Claude + תבנית קבועה. החזרת Markdown + סיכום JSON

import { createMessage, extractText } from "../shared/anthropicClient.js";
import type { MenuItem, EventType, Customer } from "../shared/types.js";
import type { PriceBreakdown } from "../pricing/DynamicPricer.js";

export interface QuoteRequest {
  customer: Customer;
  eventType: EventType;
  eventDate: Date;
  guestCount: number;
  items: Array<{ menuItem: MenuItem; quantity: number }>;
  pricing?: PriceBreakdown;
  notes?: string;
}

export interface Quote {
  quoteId: string;
  markdown: string;
  totalPrice: number;
  validUntil: Date;
}

const EVENT_LABEL_HE: Record<EventType, string> = {
  wedding: "חתונה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  brit: "ברית",
  corporate: "אירוע חברה",
  engagement: "אירוסין",
  sheva_brachot: "שבע ברכות",
  henna: "חינה",
  memorial: "אזכרה",
  other: "אירוע",
};

let _quoteCounter = 5000;

export class QuoteGenerator {
  /**
   * יוצר הצעת מחיר Markdown מלאה עם פסקה אישית מותאמת ע"י Claude.
   */
  async generate(req: QuoteRequest): Promise<Quote> {
    const quoteId = `QUO-${_quoteCounter++}`;
    const subtotal = req.items.reduce(
      (s, i) => s + i.menuItem.pricePerGuest * req.guestCount,
      0,
    );
    const total = req.pricing?.finalPrice ?? subtotal;
    const validUntil = new Date(Date.now() + 14 * 86_400_000);

    // פסקת פתיחה אישית
    const opening = await this.generateOpening(req);

    const itemsTable = req.items
      .map(
        (i) =>
          `| ${i.menuItem.name} | ${req.guestCount} | ₪${i.menuItem.pricePerGuest} | ₪${i.menuItem.pricePerGuest * req.guestCount} |`,
      )
      .join("\n");

    const adjustments =
      req.pricing && req.pricing.applied.length > 0
        ? req.pricing.applied
            .map(
              (a) =>
                `- ${a.reason}: ${a.factor > 1 ? "+" : ""}${Math.round((a.factor - 1) * 100)}%`,
            )
            .join("\n")
        : "ללא התאמות נוספות";

    const markdown = `# הצעת מחיר ${quoteId}
**ללקוח:** ${req.customer.name}
**תאריך הצעה:** ${new Date().toLocaleDateString("he-IL")}
**תוקף:** עד ${validUntil.toLocaleDateString("he-IL")}

---

${opening}

## פרטי האירוע
- **סוג אירוע:** ${EVENT_LABEL_HE[req.eventType]}
- **תאריך:** ${req.eventDate.toLocaleDateString("he-IL")}
- **מספר אורחים:** ${req.guestCount}

## פירוט תפריט
| פריט | כמות (אורחים) | מחיר למנה | סה"כ |
|------|----------------|------------|-------|
${itemsTable}

**סך תפריט:** ₪${subtotal}

## התאמות מחיר
${adjustments}

## סיכום פיננסי
- **מחיר בסיס:** ₪${subtotal}
- **מחיר סופי:** **₪${total}** (כולל מע"מ)
- **מקדמת אישור:** 25% (₪${Math.round(total * 0.25)})

${req.notes ? `## הערות\n${req.notes}\n` : ""}

---
*Sync Up Catering — חוויה קולינרית בלתי נשכחת.*
`;

    return { quoteId, markdown, totalPrice: total, validUntil };
  }

  private async generateOpening(req: QuoteRequest): Promise<string> {
    const response = await createMessage({
      callerTag: "quote_opening",
      maxTokens: 200,
      temperature: 0.7,
      system:
        "אתה כותב פסקאות פתיחה אישיות להצעות מחיר של חברת קייטרינג ישראלית מובילה. כתוב בעברית, חמה ומקצועית, 2-3 משפטים שמתייחסים לסוג האירוע הספציפי.",
      messages: [
        {
          role: "user",
          content: `כתוב פסקת פתיחה להצעת מחיר ל${EVENT_LABEL_HE[req.eventType]} של ${req.customer.name}, ${req.guestCount} אורחים, בתאריך ${req.eventDate.toLocaleDateString("he-IL")}.`,
        },
      ],
    });
    return extractText(response);
  }
}
