// MarketingCopy — יצירת קופי שיווקי בעברית לערוצים שונים
// תומך: WhatsApp Broadcast, Instagram, Facebook, Email, SMS

import { createMessage, extractText } from "../shared/anthropicClient.js";

export type MarketingChannel =
  | "whatsapp_broadcast"
  | "instagram"
  | "facebook"
  | "email_subject"
  | "email_body"
  | "sms"
  | "landing_page";

export interface CopyRequest {
  channel: MarketingChannel;
  campaign: string; // לדוגמה "promo_passover_2026"
  audience: string; // לדוגמה "לקוחות שהזמינו בעבר חתונה"
  goal: "awareness" | "lead_gen" | "booking" | "upsell" | "winback";
  toneOverride?: "premium" | "warm" | "playful" | "urgent";
  cta?: string; // call to action
  productHighlight?: string;
  maxLength?: number;
}

const CHANNEL_RULES: Record<MarketingChannel, { maxChars: number; style: string }> = {
  whatsapp_broadcast: {
    maxChars: 400,
    style: "אישי, ידידותי, אמוג'י אחד לכל היותר, לכלול שאלת המשך",
  },
  instagram: {
    maxChars: 220,
    style: "ויזואלי, אופטימי, 2-3 האשטגים, אמוג'י 1-2",
  },
  facebook: {
    maxChars: 600,
    style: "סיפורי, מתחיל בוו הצמדה, מסיים בקריאה לפעולה ברורה",
  },
  email_subject: {
    maxChars: 60,
    style: "קצר, סקרני, ללא מילים כמו 'חינם' שמפעילות ספאם",
  },
  email_body: {
    maxChars: 1500,
    style: "מבנה: כותרת, פסקת פתיחה, בולטים של ערך, CTA, פתיחה לדיאלוג",
  },
  sms: {
    maxChars: 160,
    style: "ישיר ביותר, ללא קישוטים, רק CTA + לינק",
  },
  landing_page: {
    maxChars: 2500,
    style: "כותרות + פסקאות קצרות, hero headline, 3-5 benefits, social proof, CTA",
  },
};

export class MarketingCopy {
  async generate(req: CopyRequest): Promise<string> {
    const rules = CHANNEL_RULES[req.channel];
    const maxLen = req.maxLength ?? rules.maxChars;

    const response = await createMessage({
      callerTag: "marketing_copy",
      maxTokens: Math.min(2000, Math.ceil(maxLen / 2) + 200),
      temperature: 0.85,
      system: `אתה כותב קופי שיווקי מנצח עבור Sync Up — חברת קייטרינג ישראלית מובילה.
כללי כתיבה:
- עברית רהוטה ועדכנית
- ללא קלישאות שחוקות ("בני ברק 1", "מספר 1 בארץ")
- אל תמציא נתונים סטטיסטיים
- כללי הערוץ: ${rules.style}
- אורך מקסימלי: ${maxLen} תווים
- תן ערך אמיתי לקורא — סיבה אמיתית לפנות, לא רק יח"צ`,
      messages: [
        {
          role: "user",
          content: `כתוב טקסט שיווקי:
- ערוץ: ${req.channel}
- מסע פרסום: ${req.campaign}
- קהל יעד: ${req.audience}
- מטרה: ${req.goal}${req.toneOverride ? `\n- טון מועדף: ${req.toneOverride}` : ""}${req.cta ? `\n- CTA: ${req.cta}` : ""}${req.productHighlight ? `\n- מה להבליט: ${req.productHighlight}` : ""}

החזר רק את הטקסט עצמו, ללא הסברים.`,
        },
      ],
    });
    return extractText(response).trim();
  }

  /**
   * מייצר 3 וריאציות לבדיקת A/B.
   */
  async generateVariations(req: CopyRequest, count = 3): Promise<string[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.generate(req)),
    );
  }
}
