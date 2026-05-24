/**
 * תבניות פרומפט בעברית להזרקה ל-Stable Diffusion / DALL-E.
 * כל תבנית מקבלת `MenuItemContext` ומחזירה פרומפט EN (לטובת המודל) + תיאור HE.
 */

import type { MenuItemContext } from "./types.js";

export type PromptStyle =
  | "studio"
  | "rustic"
  | "minimalist"
  | "luxury"
  | "street-food"
  | "kosher-shabbat";

const STYLE_DESCRIPTORS_EN: Record<PromptStyle, string> = {
  studio:
    "professional studio food photography, soft diffused lighting, white seamless backdrop, 85mm lens, shallow depth of field, top-down or 45-degree angle",
  rustic:
    "rustic wooden table, natural daylight, linen napkin, hand-thrown ceramic plate, moody warm tones",
  minimalist:
    "minimalist composition, single light source, negative space, monochrome backdrop, editorial magazine style",
  luxury:
    "fine dining presentation, marble surface, gold cutlery, dramatic side light, Michelin-star plating",
  "street-food":
    "vibrant street-food vibe, colorful background, kraft paper, hands holding the dish, slightly motion-blurred crowd behind",
  "kosher-shabbat":
    "Shabbat table setting, silver candlesticks softly out of focus, white tablecloth, challah on the side, warm candlelight, traditional Jewish festive atmosphere",
};

const STYLE_DESCRIPTORS_HE: Record<PromptStyle, string> = {
  studio: "צילום סטודיו מקצועי, תאורה רכה, רקע לבן",
  rustic: "שולחן עץ כפרי, אור יום, מפית פשתן",
  minimalist: "מינימליסטי, מקור אור אחד, מרחב נשימה",
  luxury: "הגשה יוקרתית, שיש, סכו\"ם זהב, פלייטינג ברמת מישלן",
  "street-food": "וייב סטריט פוד, צבעוני, נייר חום",
  "kosher-shabbat": "שולחן שבת, פמוטים, חלות, אווירה מסורתית חמה",
};

export interface PromptResult {
  /** פרומפט באנגלית להזרקה למודל יצירת תמונה. */
  prompt: string;
  /** Negative prompt — מה לא רוצים שיופיע. */
  negativePrompt: string;
  /** תיאור עברי קצר של הכוונה — לתצוגה בממשק. */
  descriptionHe: string;
  /** Aspect ratio מומלץ. */
  aspectRatio: "1:1" | "4:3" | "16:9";
}

export function buildMenuImagePrompt(
  item: MenuItemContext,
  style: PromptStyle = "studio",
): PromptResult {
  const ingredientsEn = item.ingredientsEn?.join(", ") || item.ingredientsHe?.join(", ") || "";
  const ingredientsHe = item.ingredientsHe?.join(", ") || "";

  const prompt = [
    `High-end food photography of ${item.nameEn ?? item.nameHe}`,
    ingredientsEn ? `made of ${ingredientsEn}` : "",
    STYLE_DESCRIPTORS_EN[style],
    "appetizing, hyper-realistic, sharp focus, 4k",
  ]
    .filter(Boolean)
    .join(", ");

  const negativePrompt = [
    "blurry",
    "low quality",
    "watermark",
    "text",
    "logo",
    "deformed",
    "cartoon",
    "plastic",
    "fake",
    "uncooked",
    "burned",
    "people faces",
  ].join(", ");

  const descriptionHe = [
    `תמונה איכותית של "${item.nameHe}"`,
    ingredientsHe ? `(${ingredientsHe})` : "",
    `בסגנון: ${STYLE_DESCRIPTORS_HE[style]}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt,
    negativePrompt,
    descriptionHe,
    aspectRatio: item.preferredAspect ?? "1:1",
  };
}

export const TEMPLATES = {
  MAIN_DISH: (item: MenuItemContext) => buildMenuImagePrompt(item, "studio"),
  STARTER: (item: MenuItemContext) => buildMenuImagePrompt(item, "minimalist"),
  DESSERT: (item: MenuItemContext) => buildMenuImagePrompt(item, "luxury"),
  SHABBAT_DISH: (item: MenuItemContext) => buildMenuImagePrompt(item, "kosher-shabbat"),
  STREET_FOOD: (item: MenuItemContext) => buildMenuImagePrompt(item, "street-food"),
} as const;
