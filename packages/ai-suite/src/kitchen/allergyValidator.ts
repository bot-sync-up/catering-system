// allergyValidator — בודק התאמת תפריט לאלרגיות לקוח
// כולל זיהוי אלרגנים נסתרים (לדוגמה: שמן שומשום במג'דרה)

import type { MenuItem, Allergen } from "../shared/types.js";

// מיפוי מצרך => אלרגנים שמכיל (לפי תקנות EU 14 אלרגנים)
const INGREDIENT_ALLERGENS: Record<string, Allergen[]> = {
  קמח: ["gluten"],
  "קמח חיטה": ["gluten"],
  שיפון: ["gluten"],
  שעורה: ["gluten"],
  שיבולת שועל: ["gluten"],
  פתיתים: ["gluten"],
  פסטה: ["gluten"],
  לחם: ["gluten"],
  בורגול: ["gluten"],
  פרקליאלה: ["gluten"],
  סויה: ["soy"],
  טופו: ["soy"],
  אדממה: ["soy"],
  חלב: ["lactose"],
  גבינה: ["lactose"],
  יוגורט: ["lactose"],
  חמאה: ["lactose"],
  קצפת: ["lactose"],
  שמנת: ["lactose"],
  אבקת חלב: ["lactose"],
  ביצה: ["egg"],
  ביצים: ["egg"],
  חלמון: ["egg"],
  חלבון: ["egg"],
  מיונז: ["egg"],
  בוטנים: ["peanut"],
  "חמאת בוטנים": ["peanut"],
  אגוזים: ["tree_nut"],
  שקדים: ["tree_nut"],
  אגוז מלך: ["tree_nut"],
  פקאן: ["tree_nut"],
  קשיו: ["tree_nut"],
  לוז: ["tree_nut"],
  פיסטוק: ["tree_nut"],
  שומשום: ["sesame"],
  טחינה: ["sesame"],
  "שמן שומשום": ["sesame"],
  סלמון: ["fish"],
  טונה: ["fish"],
  בקלה: ["fish"],
  הרינג: ["fish"],
  שרימפס: ["shellfish"],
  סרטן: ["shellfish"],
  צדפות: ["shellfish"],
  חרדל: ["mustard"],
  סלרי: ["celery"],
  סלפיט: ["sulfite"],
  "יין מבושל": ["sulfite"],
};

export interface AllergyCheck {
  safe: boolean;
  detectedAllergens: Allergen[];
  unsafeItems: Array<{
    itemId: string;
    itemName: string;
    foundAllergens: Allergen[];
    triggers: string[]; // המצרכים שגרמו
  }>;
}

export class AllergyValidator {
  /**
   * מחזיר את כל האלרגנים שזוהו ברכיב.
   */
  allergensIn(ingredient: string): Allergen[] {
    return INGREDIENT_ALLERGENS[ingredient.trim()] ?? [];
  }

  /**
   * בודק התאמה לאלרגיה — אם הלקוח רגיש לאחד מהאלרגנים, מסמן כלא בטוח.
   */
  check(items: MenuItem[], customerAllergies: Allergen[]): AllergyCheck {
    const unsafe: AllergyCheck["unsafeItems"] = [];
    const allDetected = new Set<Allergen>();

    for (const item of items) {
      const itemAllergens = new Set<Allergen>(item.allergens);
      const triggers: string[] = [];
      for (const ing of item.ingredients) {
        for (const a of this.allergensIn(ing)) {
          itemAllergens.add(a);
          if (customerAllergies.includes(a) && !triggers.includes(ing)) {
            triggers.push(ing);
          }
        }
      }
      const conflict = customerAllergies.filter((a) => itemAllergens.has(a));
      if (conflict.length > 0) {
        unsafe.push({
          itemId: item.id,
          itemName: item.name,
          foundAllergens: conflict,
          triggers,
        });
      }
      for (const a of itemAllergens) allDetected.add(a);
    }

    return {
      safe: unsafe.length === 0,
      detectedAllergens: Array.from(allDetected),
      unsafeItems: unsafe,
    };
  }
}
