// SubstitutionEngine — מנוע תחליפים לרכיבים
// משלב טבלת בסיס דטרמיניסטית + Claude למקרים שאינם בטבלה

import { createMessage, extractText } from "../shared/anthropicClient.js";
import type { Allergen, KosherLevel } from "../shared/types.js";

export interface Substitution {
  original: string;
  substitute: string;
  ratio: number; // לדוגמה 1 ביצה = 1/4 כוס יוגורט סויה => ratio=0.25 (לכמות שונה)
  reason: string;
  preservesKosher: boolean;
  preservesTexture: "yes" | "mostly" | "no";
  notes?: string;
}

// טבלת תחליפים נפוצים (לקייטרינג כשר ישראלי)
export const SUBSTITUTION_TABLE: Substitution[] = [
  {
    original: "ביצה",
    substitute: "טופו רך מעוך",
    ratio: 0.25, // 1 ביצה = רבע כוס טופו
    reason: "אלרגיה לביצים / פרווה במנה בשרית",
    preservesKosher: true,
    preservesTexture: "mostly",
    notes: "מתאים למאפים אפויים, פחות לקצף",
  },
  {
    original: "ביצה",
    substitute: "פשתן טחון + מים (1 כפית + 3 כפיות מים)",
    ratio: 1,
    reason: "טבעוני",
    preservesKosher: true,
    preservesTexture: "mostly",
  },
  {
    original: "חמאה",
    substitute: "מרגרינה פרווה",
    ratio: 1,
    reason: "פרווה במנה בשרית",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "חמאה",
    substitute: "שמן קוקוס",
    ratio: 0.75,
    reason: "טבעוני / פרווה",
    preservesKosher: true,
    preservesTexture: "mostly",
  },
  {
    original: "חלב",
    substitute: "משקה שקדים",
    ratio: 1,
    reason: "אלרגיה ללקטוז / פרווה",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "חלב",
    substitute: "משקה סויה",
    ratio: 1,
    reason: "פרווה",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "שמנת",
    substitute: "שמנת קוקוס",
    ratio: 1,
    reason: "פרווה",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "קמח חיטה",
    substitute: "תערובת ללא גלוטן (כוסמת+תפו\"א+אורז)",
    ratio: 1,
    reason: "צליאק",
    preservesKosher: true,
    preservesTexture: "mostly",
    notes: "להוסיף 1 כפית גואר/קסנטן ל-200 גרם",
  },
  {
    original: "סוכר לבן",
    substitute: "סילאן (תמרים)",
    ratio: 0.75,
    reason: "ללא סוכר מעובד",
    preservesKosher: true,
    preservesTexture: "mostly",
  },
  {
    original: "שומשום",
    substitute: "גרעיני חמנייה",
    ratio: 1,
    reason: "אלרגיה לשומשום",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "בוטנים",
    substitute: "אגוזי קשיו",
    ratio: 1,
    reason: "אלרגיה לבוטנים בלבד (לא לאגוזים)",
    preservesKosher: true,
    preservesTexture: "yes",
  },
  {
    original: "סויה",
    substitute: "חומוס",
    ratio: 1,
    reason: "אלרגיה לסויה",
    preservesKosher: true,
    preservesTexture: "mostly",
  },
];

export interface SubstitutionRequest {
  ingredient: string;
  reason:
    | "allergy"
    | "kosher_meat_to_pareve"
    | "kosher_dairy_to_pareve"
    | "vegan"
    | "vegetarian"
    | "gluten_free"
    | "sugar_free"
    | "other";
  context?: string;
  targetKosher?: KosherLevel;
  forbiddenAllergens?: Allergen[];
}

export class SubstitutionEngine {
  /**
   * חיפוש דטרמיניסטי בטבלה. מחזיר את ההתאמה הטובה ביותר אם קיימת.
   */
  findInTable(ingredient: string): Substitution[] {
    const norm = ingredient.trim();
    return SUBSTITUTION_TABLE.filter((s) => s.original === norm);
  }

  /**
   * מנסה קודם טבלה, ואם אין מתאים — מבקש מ-Claude.
   */
  async suggest(req: SubstitutionRequest): Promise<Substitution[]> {
    const fromTable = this.findInTable(req.ingredient);
    if (fromTable.length > 0) return fromTable;
    return this.suggestViaLLM(req);
  }

  private async suggestViaLLM(
    req: SubstitutionRequest,
  ): Promise<Substitution[]> {
    const response = await createMessage({
      callerTag: "substitution",
      maxTokens: 600,
      temperature: 0.3,
      system: `אתה שף-ראשי במטבח קייטרינג כשר בישראל. כשמבקשים תחליף לרכיב — החזר JSON array של עד 3 תחליפים מעשיים. שדות חובה: original, substitute, ratio (מספר), reason (עברית), preservesKosher (boolean), preservesTexture ("yes"/"mostly"/"no"). החזר JSON בלבד.`,
      messages: [
        {
          role: "user",
          content: `מצא תחליפים ל-"${req.ingredient}". סיבה: ${req.reason}.${req.context ? ` הקשר: ${req.context}` : ""}${req.targetKosher ? ` כשרות יעד: ${req.targetKosher}` : ""}${req.forbiddenAllergens?.length ? ` יש להימנע מ: ${req.forbiddenAllergens.join(", ")}` : ""}`,
        },
      ],
    });
    const raw = extractText(response)
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "");
    try {
      return JSON.parse(raw) as Substitution[];
    } catch {
      return [];
    }
  }
}
