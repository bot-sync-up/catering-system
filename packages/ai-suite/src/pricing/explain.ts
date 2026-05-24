// יצירת הסבר בעברית למחיר דינמי — עבור לקוחות ומכירות
// אופציה 1: שורות bullet דטרמיניסטיות (מהיר וזול)
// אופציה 2: ניסוח טבעי דרך Claude (למצגות ולחוזים)

import { createMessage, extractText } from "../shared/anthropicClient.js";
import type { PriceBreakdown } from "./DynamicPricer.js";

/**
 * הסבר דטרמיניסטי — אין קריאה ל-LLM, מהיר.
 */
export function explainDeterministic(breakdown: PriceBreakdown): string {
  if (breakdown.applied.length === 0) {
    return `המחיר הסופי: ₪${breakdown.finalPrice} (מחיר בסיס ללא התאמות).`;
  }
  const lines = breakdown.applied.map(
    (a) =>
      `• ${a.reason}: ${a.factor > 1 ? "+" : ""}${Math.round((a.factor - 1) * 100)}%`,
  );
  const diff = breakdown.finalPrice - breakdown.basePrice;
  const direction =
    diff > 0 ? "תוספת" : diff < 0 ? "הנחה" : "ללא שינוי";
  return [
    `מחיר בסיס: ₪${breakdown.basePrice}`,
    `התאמות שהוחלו (סה"כ מקדם ${breakdown.multiplier}):`,
    ...lines,
    `מחיר סופי: ₪${breakdown.finalPrice} (${direction} של ₪${Math.abs(Math.round(diff * 100) / 100)})`,
  ].join("\n");
}

/**
 * הסבר טבעי דרך Claude — מתאים לתקשורת לקוחות יוקרתית.
 */
export async function explainNaturalLanguage(
  breakdown: PriceBreakdown,
  context: { customerName?: string; eventType?: string } = {},
): Promise<string> {
  const deterministic = explainDeterministic(breakdown);
  const response = await createMessage({
    callerTag: "pricing_explain",
    maxTokens: 350,
    temperature: 0.5,
    system:
      "אתה כותב הסברים ידידותיים למחיר של חברת קייטרינג ישראלית. כתוב בעברית, בטון מקצועי-חם, ובלי לחשוף לוגיקה פנימית כמו 'מקדם' או 'מכפילים'. השתמש בניסוחים כמו 'בשל קרבה לחג', 'הזמנה מוקדמת זיכתה בהנחה'.",
    messages: [
      {
        role: "user",
        content: `נתח את ההצעה הבאה וכתוב פסקה קצרה אחת ללקוח${
          context.customerName ? ` (${context.customerName})` : ""
        }${context.eventType ? ` עבור אירוע מסוג ${context.eventType}` : ""}:\n\n${deterministic}`,
      },
    ],
  });
  return extractText(response);
}
