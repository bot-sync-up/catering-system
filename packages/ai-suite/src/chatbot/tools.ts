// הגדרת 5 הכלים של ה-chatbot
// תואם למבנה Anthropic.Tool

import type Anthropic from "@anthropic-ai/sdk";

export const CHATBOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_faq",
    description:
      "מחפש במאגר השאלות הנפוצות של החברה. השתמש כשלקוח שואל שאלה כללית על שירותים, מדיניות ביטולים, אזורי משלוח, אופציות תפריט וכו'. החזר את 3 התוצאות הטובות ביותר.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "השאלה או הביטוי המפתח לחיפוש, בעברית",
        },
        category: {
          type: "string",
          enum: ["general", "menu", "pricing", "delivery", "kosher", "policy"],
          description: "(אופציונלי) קטגוריה לסינון",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_order_status",
    description:
      "מחזיר את הסטטוס הנוכחי, פרטי האירוע וסיכום פיננסי של הזמנה לפי מזהה. השתמש כשלקוח שואל על הזמנה ספציפית.",
    input_schema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "מזהה ההזמנה, פורמט ORD-XXXX",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "request_quote",
    description:
      "פותח בקשת הצעת מחיר חדשה. אסוף את כל הפרטים החובה לפני קריאה. הכלי יחזיר quote_id ראשוני שניתן לשתף עם הלקוח.",
    input_schema: {
      type: "object",
      properties: {
        event_date: {
          type: "string",
          description: "תאריך האירוע בפורמט ISO YYYY-MM-DD",
        },
        event_type: {
          type: "string",
          enum: [
            "wedding",
            "bar_mitzvah",
            "bat_mitzvah",
            "brit",
            "corporate",
            "engagement",
            "sheva_brachot",
            "henna",
            "memorial",
            "other",
          ],
        },
        guest_count: { type: "integer", minimum: 10 },
        kosher_level: {
          type: "string",
          enum: ["regular", "mehadrin", "chalak", "none"],
        },
        venue_type: {
          type: "string",
          enum: ["hall", "garden", "home", "office", "other"],
        },
        special_requirements: {
          type: "string",
          description: "(אופציונלי) דרישות מיוחדות — אלרגיות, צמחוני וכו'",
        },
      },
      required: ["event_date", "event_type", "guest_count", "kosher_level"],
    },
  },
  {
    name: "find_menu_item",
    description:
      "מחפש פריט בתפריט החברה. תומך בחיפוש לפי שם, קטגוריה, אלרגנים שיש להימנע מהם, וכשרות.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "שם הפריט או תיאור" },
        category: {
          type: "string",
          description: "(אופציונלי) קטגוריה — מנה ראשונה, עיקרית, קינוח וכו'",
        },
        kosher: {
          type: "string",
          enum: ["meat", "dairy", "pareve"],
        },
        exclude_allergens: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "gluten",
              "lactose",
              "egg",
              "peanut",
              "tree_nut",
              "sesame",
              "soy",
              "fish",
              "shellfish",
            ],
          },
        },
      },
      required: ["query"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "מעביר את השיחה לנציג אנושי. השתמש במקרים: תלונה חמורה, אבל, אירוע >500 איש, בקשה מפורשת של הלקוח, או כשאתה לא בטוח באמינות התשובה.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: [
            "complaint",
            "bereavement",
            "large_event",
            "customer_request",
            "low_confidence",
            "other",
          ],
        },
        summary: {
          type: "string",
          description: "סיכום קצר בעברית עבור הנציג שיקבל את השיחה",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
        },
      },
      required: ["reason", "summary", "priority"],
    },
  },
];

// טיפוסים לתוצאות הכלים — לשימוש בצד שמיישם את ה-tool runners
export interface FaqResult {
  question: string;
  answer: string;
  category: string;
}
export interface OrderStatusResult {
  order_id: string;
  status: string;
  event_date: string;
  guest_count: number;
  total_price: number;
  currency: string;
}
export interface QuoteResult {
  quote_id: string;
  estimated_price: number;
  currency: string;
  valid_until: string;
}
export interface MenuItemResult {
  id: string;
  name: string;
  price_per_guest: number;
  kosher: string;
  allergens: string[];
}
export interface EscalationResult {
  ticket_id: string;
  estimated_response_minutes: number;
}

/**
 * אדפטר מופשט — המטמיע מספק callbacks אמיתיים לעולם הייצור.
 */
export interface ToolRunner {
  search_faq(input: {
    query: string;
    category?: string;
  }): Promise<FaqResult[]>;
  get_order_status(input: { order_id: string }): Promise<OrderStatusResult>;
  request_quote(input: Record<string, unknown>): Promise<QuoteResult>;
  find_menu_item(input: {
    query: string;
    category?: string;
    kosher?: string;
    exclude_allergens?: string[];
  }): Promise<MenuItemResult[]>;
  escalate_to_human(input: {
    reason: string;
    summary: string;
    priority: string;
  }): Promise<EscalationResult>;
}
