// ContractDrafter — ניסוח חוזה קייטרינג בעברית משפטית
// מבוסס תבנית קבועה + סעיפים דינמיים. Claude מנסח רק את ה-preamble וההתאמות.

import { createMessage, extractText } from "../shared/anthropicClient.js";
import type { Customer, EventType } from "../shared/types.js";

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

export interface ContractRequest {
  contractNumber: string;
  customer: Customer;
  customerIdNumber: string; // ת.ז. / ח.פ.
  customerAddress: string;
  eventType: EventType;
  eventDate: Date;
  eventVenue: string;
  guestCount: number;
  totalPrice: number;
  depositPercent?: number; // ברירת מחדל 25
  cancellationPolicy?: "standard" | "strict" | "flexible";
  specialClauses?: string[];
}

export interface Contract {
  contractNumber: string;
  markdown: string;
  effectiveDate: Date;
}

export class ContractDrafter {
  async draft(req: ContractRequest): Promise<Contract> {
    const deposit = req.depositPercent ?? 25;
    const policy = req.cancellationPolicy ?? "standard";
    const effectiveDate = new Date();

    const cancellationClause = this.cancellationClauseFor(policy, req.eventDate);
    const specialClauses = req.specialClauses?.length
      ? req.specialClauses.map((c, i) => `${10 + i}. ${c}`).join("\n")
      : "";

    const markdown = `# הסכם שירותי קייטרינג מס' ${req.contractNumber}

**תאריך עריכה:** ${effectiveDate.toLocaleDateString("he-IL")}

## בין הצדדים

**הספק:** Sync Up Catering בע"מ
ח.פ. 516000000
כתובת: רחוב יפו 99, ירושלים

**הלקוח:** ${req.customer.name}
ת.ז./ח.פ.: ${req.customerIdNumber}
כתובת: ${req.customerAddress}
טלפון: ${req.customer.phone}

## מבוא והגדרות
1. הסכם זה מסדיר את אספקת שירותי הקייטרינג לאירוע ${EVENT_LABEL_HE[req.eventType]} של הלקוח.
2. "האירוע" — האירוע המתקיים בתאריך ${req.eventDate.toLocaleDateString("he-IL")} במקום: ${req.eventVenue}.
3. "השירות" — אספקת מזון, משקאות, צוות הגשה והפעלה כמפורט בנספח התפריט.

## סעיפים עיקריים
4. **היקף השירות:** הספק יספק קייטרינג ל-${req.guestCount} אורחים בתפריט המאושר בנספח א'.
5. **מחיר ותשלום:**
   - סה"כ ההסכם: ₪${req.totalPrice.toLocaleString("he-IL")} (כולל מע"מ)
   - מקדמה בסך ${deposit}% — ₪${Math.round((req.totalPrice * deposit) / 100).toLocaleString("he-IL")} — תשולם בעת חתימת ההסכם.
   - יתרה — 7 ימים לפני האירוע.
6. **שינויים במספר אורחים:** ניתן לעדכן עד 7 ימים לפני האירוע. שינוי של מעל 10% כפוף לאישור הספק ועדכון מחיר.
7. **כשרות:** הספק מתחייב לכשרות ${req.eventType === "memorial" ? "רגילה" : "מהדרין"} עם תעודה של רבנות מקומית.
8. **ביטול:** ${cancellationClause}
9. **כוח עליון:** במקרה של מצב חירום לאומי, מגיפה, מבצע צבאי או הוראה ממשלתית שמונעת קיום האירוע — הצדדים יידחו את האירוע ללא קנס.

${specialClauses ? `## סעיפים מיוחדים\n${specialClauses}\n` : ""}

## חתימות

**הלקוח:** _______________________ תאריך: __________

**הספק:** _______________________ תאריך: __________
Sync Up Catering בע"מ

---
*נספחים: א' — תפריט מאושר; ב' — תוכנית פריסה.*
`;
    return {
      contractNumber: req.contractNumber,
      markdown,
      effectiveDate,
    };
  }

  /**
   * סעיף ביטול דינמי — תלוי בקרבת התאריך ובמדיניות.
   */
  private cancellationClauseFor(
    policy: "standard" | "strict" | "flexible",
    eventDate: Date,
  ): string {
    const daysToEvent = Math.round(
      (eventDate.getTime() - Date.now()) / 86_400_000,
    );
    if (policy === "flexible") {
      return `ניתן לבטל עד 30 ימים לפני האירוע ללא קנס. בין 30 ל-7 ימים — 25% מהסכום. פחות מ-7 ימים — 50%.`;
    }
    if (policy === "strict") {
      return `ביטול חייב להתבצע בכתב. עד 90 ימים — החזר מלא של המקדמה. 90-30 ימים — 50% מהמקדמה. פחות מ-30 ימים — מלוא ההסכם.`;
    }
    // standard
    return `ביטול עד 60 ימים — החזר מלא של המקדמה. 60-14 ימים — 50% מהמקדמה. פחות מ-14 ימים — מלוא המקדמה ותשלום של 50% מהיתרה. כיום נותרו ${daysToEvent} ימים לאירוע.`;
  }

  /**
   * שיקול דעת — מבקש מ-Claude לבחון את הטיוטה לבעיות משפטיות בולטות.
   * אינו מחליף עו"ד, אבל מועיל ל-pre-screening.
   */
  async reviewDraft(contractMarkdown: string): Promise<string> {
    const response = await createMessage({
      callerTag: "contract_review",
      maxTokens: 800,
      temperature: 0.2,
      system:
        "אתה עוזר משפטי-אדמיניסטרטיבי לחברת קייטרינג. בודק חוזים לבעיות נפוצות: סעיפים חסרים, ניסוח לא ברור, מספרים שלא מסתדרים. הצע שיפורים בעברית. אינך עו\"ד — סייג זאת בסוף.",
      messages: [
        {
          role: "user",
          content: `סקור את החוזה הזה ותן רשימת הערות:\n\n${contractMarkdown}`,
        },
      ],
    });
    return extractText(response);
  }
}
