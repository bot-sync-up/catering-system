// kosherValidator — אימות תפריט מבחינת כשרות
// בודק עירוב בשרי-חלבי, כשרות מצרכים בודדים

import type { MenuItem, KosherLevel } from "../shared/types.js";

// רכיבים שמוגדרים אוטומטית כבשריים
const MEAT_INGREDIENTS = new Set([
  "בשר בקר",
  "בשר עוף",
  "כבד",
  "טלה",
  "הודו",
  "אווז",
  "ברווז",
  "שומן בקר",
  "ז'לטין בקר",
  "ברדק",
]);

// רכיבים חלביים
const DAIRY_INGREDIENTS = new Set([
  "חלב",
  "חמאה",
  "גבינה",
  "יוגורט",
  "שמנת",
  "קצפת",
  "מי גבינה",
  "אבקת חלב",
  "קזאין",
]);

// פסולים מוחלטים (לא כשרים)
const NON_KOSHER = new Set([
  "חזיר",
  "שרימפס",
  "סרטן",
  "צדפות",
  "צלופח",
  "דיונון",
  "ארנב",
  "סוס",
]);

export interface KosherValidation {
  isValid: boolean;
  declaredKosher: KosherLevel;
  actualKosher: KosherLevel;
  issues: Array<{
    severity: "error" | "warning";
    message: string;
    itemId?: string;
  }>;
}

export class KosherValidator {
  /**
   * בודק פריט בודד.
   */
  validateItem(item: MenuItem): KosherValidation {
    const issues: KosherValidation["issues"] = [];
    let actual: KosherLevel = "pareve";
    const hasMeat = item.ingredients.some((i) => MEAT_INGREDIENTS.has(i));
    const hasDairy = item.ingredients.some((i) => DAIRY_INGREDIENTS.has(i));
    const hasNonKosher = item.ingredients.some((i) => NON_KOSHER.has(i));

    if (hasNonKosher) {
      actual = "non_kosher";
      issues.push({
        severity: "error",
        message: `הפריט "${item.name}" מכיל מצרך לא כשר: ${item.ingredients.find((i) => NON_KOSHER.has(i))}`,
        itemId: item.id,
      });
    } else if (hasMeat && hasDairy) {
      actual = "non_kosher";
      issues.push({
        severity: "error",
        message: `הפריט "${item.name}" מערב בשר וחלב — אסור הלכתית`,
        itemId: item.id,
      });
    } else if (hasMeat) {
      actual = "meat";
    } else if (hasDairy) {
      actual = "dairy";
    }

    if (actual !== item.kosher && item.kosher !== "non_kosher") {
      issues.push({
        severity: "warning",
        message: `הפריט "${item.name}" מסומן כ-${item.kosher} אבל המצרכים מצביעים על ${actual}`,
        itemId: item.id,
      });
    }

    return {
      isValid: !issues.some((i) => i.severity === "error"),
      declaredKosher: item.kosher,
      actualKosher: actual,
      issues,
    };
  }

  /**
   * בודק תפריט שלם — לא רק כל פריט בנפרד אלא גם עירוב בין פריטים באותו שירות.
   * (לדוגמה: ארוחה בשרית שמכילה גם פריט חלבי = בעיה).
   */
  validateMenu(items: MenuItem[]): KosherValidation {
    const allIssues: KosherValidation["issues"] = [];
    let hasMeatItem = false;
    let hasDairyItem = false;
    let worstLevel: KosherLevel = "pareve";

    for (const item of items) {
      const r = this.validateItem(item);
      allIssues.push(...r.issues);
      if (r.actualKosher === "meat") hasMeatItem = true;
      if (r.actualKosher === "dairy") hasDairyItem = true;
      if (r.actualKosher === "non_kosher") worstLevel = "non_kosher";
    }

    if (hasMeatItem && hasDairyItem && worstLevel !== "non_kosher") {
      allIssues.push({
        severity: "error",
        message: "התפריט מערב פריטים בשריים וחלביים — חייב להפריד לארוחות נפרדות או לעבור לפרווה",
      });
      worstLevel = "non_kosher";
    } else if (hasMeatItem) {
      worstLevel = "meat";
    } else if (hasDairyItem) {
      worstLevel = "dairy";
    }

    return {
      isValid: !allIssues.some((i) => i.severity === "error"),
      declaredKosher: worstLevel,
      actualKosher: worstLevel,
      issues: allIssues,
    };
  }
}
