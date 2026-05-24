import { describe, it, expect, afterEach } from "vitest";
import { SubstitutionEngine } from "../src/kitchen/SubstitutionEngine.js";
import { KosherValidator } from "../src/kitchen/kosherValidator.js";
import { AllergyValidator } from "../src/kitchen/allergyValidator.js";
import type { MenuItem } from "../src/shared/types.js";
import { installAnthropicMock, clearAnthropicMock } from "./anthropicMock.js";

afterEach(() => clearAnthropicMock());

describe("SubstitutionEngine", () => {
  it("מחזיר תחליף מהטבלה עבור ביצה", async () => {
    const e = new SubstitutionEngine();
    const r = await e.suggest({ ingredient: "ביצה", reason: "allergy" });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].original).toBe("ביצה");
  });

  it("פונה ל-LLM כשהרכיב לא בטבלה", async () => {
    installAnthropicMock([
      {
        text: '[{"original":"קוויאר","substitute":"זרעי צ\'יה שחורים","ratio":1,"reason":"חסכון","preservesKosher":true,"preservesTexture":"mostly"}]',
      },
    ]);
    const e = new SubstitutionEngine();
    const r = await e.suggest({ ingredient: "קוויאר", reason: "other" });
    expect(r[0].substitute).toContain("צ'יה");
  });
});

describe("KosherValidator", () => {
  const item: MenuItem = {
    id: "1",
    name: "שניצל",
    category: "main",
    pricePerGuest: 50,
    currency: "ILS",
    kosher: "meat",
    allergens: ["gluten", "egg"],
    ingredients: ["בשר עוף", "קמח", "ביצה"],
  };

  it("מאמת פריט בשרי תקין", () => {
    const v = new KosherValidator();
    const r = v.validateItem(item);
    expect(r.isValid).toBe(true);
    expect(r.actualKosher).toBe("meat");
  });

  it("מזהה ערבוב בשר וחלב", () => {
    const v = new KosherValidator();
    const bad: MenuItem = { ...item, ingredients: ["בשר עוף", "חלב"] };
    const r = v.validateItem(bad);
    expect(r.isValid).toBe(false);
  });

  it("מזהה תפריט שלם עם ערבוב בשרי-חלבי בין פריטים", () => {
    const v = new KosherValidator();
    const meatItem: MenuItem = { ...item };
    const dairyItem: MenuItem = {
      ...item,
      id: "2",
      name: "פיצה",
      kosher: "dairy",
      ingredients: ["קמח", "גבינה"],
    };
    const r = v.validateMenu([meatItem, dairyItem]);
    expect(r.isValid).toBe(false);
  });
});

describe("AllergyValidator", () => {
  it("מסמן פריט שמכיל אלרגן נסתר דרך מרכיביו", () => {
    const v = new AllergyValidator();
    const item: MenuItem = {
      id: "1",
      name: "סלט קינואה",
      category: "salad",
      pricePerGuest: 30,
      currency: "ILS",
      kosher: "pareve",
      allergens: [], // הצהרה ריקה
      ingredients: ["קינואה", "טחינה", "לימון"], // טחינה => sesame
    };
    const r = v.check([item], ["sesame"]);
    expect(r.safe).toBe(false);
    expect(r.unsafeItems[0].triggers).toContain("טחינה");
  });

  it("בטוח אם אין אלרגנים תואמים", () => {
    const v = new AllergyValidator();
    const item: MenuItem = {
      id: "1",
      name: "תפוח",
      category: "fruit",
      pricePerGuest: 5,
      currency: "ILS",
      kosher: "pareve",
      allergens: [],
      ingredients: ["תפוח עץ"],
    };
    expect(v.check([item], ["gluten"]).safe).toBe(true);
  });
});
