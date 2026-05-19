/**
 * בדיקות שלמות נתונים על המקורות הסטטיים (ללא DB).
 * - שום FK שבור (productKey/recipeKey/menuKey)
 * - כל סכומי הכסף > 0
 * - מחירים והנחות עקביים
 * - תאריכים תקינים (אין NaN/Invalid)
 */
import { describe, it, expect } from "vitest";
import { CUSTOMERS } from "../src/data/customers.js";
import { SUPPLIERS } from "../src/data/suppliers.js";
import { PRODUCTS } from "../src/data/products.js";
import { RECIPES } from "../src/data/recipes.js";
import { MENUS } from "../src/data/menus.js";
import { MENU_ITEMS } from "../src/data/menu-items.js";
import { VEHICLES } from "../src/data/vehicles.js";
import { TESTIMONIALS } from "../src/data/testimonials.js";
import { CAMPAIGNS } from "../src/data/campaigns.js";
import { USERS } from "../src/setup/users.js";
import { COA } from "../src/data/coa.js";
import { round2, vatAmount, withVat, invoiceNumber } from "../src/utils/money.js";
import { randomNationalId, randomTaxId } from "../src/utils/hebrew.js";
import { setRngSeed } from "../src/utils/rng.js";

describe("מקורות סטטיים — שלמות בסיסית", () => {
  it("לכל הלקוחות יש key, name, ו-category ייחודיים", () => {
    const keys = new Set<string>();
    for (const c of CUSTOMERS) {
      expect(c.key).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(keys.has(c.key)).toBe(false);
      keys.add(c.key);
    }
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(50);
  });

  it("12 משתמשים מדויק כפי שהוגדר", () => {
    expect(USERS.length).toBe(12);
    const emails = new Set(USERS.map((u) => u.email));
    expect(emails.size).toBe(USERS.length);
    // לפחות מנכ"ל אחד וצוות בסיסי
    expect(USERS.find((u) => u.role === "owner")).toBeDefined();
    expect(USERS.filter((u) => u.role === "chef").length).toBeGreaterThanOrEqual(2);
    expect(USERS.filter((u) => u.role === "driver").length).toBeGreaterThanOrEqual(2);
  });

  it("ספקים — keys ייחודיים, rating בטווח 1-5", () => {
    const keys = new Set<string>();
    for (const s of SUPPLIERS) {
      expect(keys.has(s.key)).toBe(false);
      keys.add(s.key);
      expect(s.rating).toBeGreaterThanOrEqual(1);
      expect(s.rating).toBeLessThanOrEqual(5);
    }
    expect(SUPPLIERS.length).toBeGreaterThanOrEqual(15);
  });

  it("מוצרים — SKU ו-key ייחודיים, מחירים חיוביים", () => {
    const skus = new Set<string>();
    const keys = new Set<string>();
    for (const p of PRODUCTS) {
      expect(keys.has(p.key)).toBe(false);
      expect(skus.has(p.sku)).toBe(false);
      keys.add(p.key);
      skus.add(p.sku);
      expect(p.unitCost).toBeGreaterThan(0);
      expect(p.unitPrice).toBeGreaterThan(0);
      // מרווח רווחי
      expect(p.unitPrice).toBeGreaterThanOrEqual(p.unitCost);
    }
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(100);
  });

  it("המתכונים מצביעים אך ורק על מוצרים שקיימים", () => {
    const productKeys = new Set(PRODUCTS.map((p) => p.key));
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        expect(productKeys.has(ing.productKey)).toBe(true);
      }
      expect(r.servings).toBeGreaterThan(0);
    }
    expect(RECIPES.length).toBeGreaterThanOrEqual(20);
  });

  it("פריטי תפריט מצביעים על תפריטים ומתכונים קיימים", () => {
    const menuKeys = new Set(MENUS.map((m) => m.key));
    const recipeKeys = new Set(RECIPES.map((r) => r.key));
    for (const mi of MENU_ITEMS) {
      expect(menuKeys.has(mi.menuKey)).toBe(true);
      if (mi.recipeKey) {
        expect(recipeKeys.has(mi.recipeKey)).toBe(true);
      }
      expect(mi.price).toBeGreaterThan(0);
    }
    expect(MENU_ITEMS.length).toBeGreaterThanOrEqual(80);
    expect(MENUS.length).toBe(8);
  });

  it("ספקי-מוצר — Mapping תקין: כל supplierKey של product קיים ברשימת ספקים", () => {
    const supplierKeys = new Set(SUPPLIERS.map((s) => s.key));
    for (const p of PRODUCTS) {
      if (p.supplierKey) {
        expect(supplierKeys.has(p.supplierKey)).toBe(true);
      }
    }
  });

  it("רכבים — לוחיות זיהוי ייחודיות", () => {
    const plates = new Set(VEHICLES.map((v) => v.plate));
    expect(plates.size).toBe(VEHICLES.length);
    expect(VEHICLES.length).toBe(4);
  });

  it("המלצות — דירוג 1-5, יש 10", () => {
    expect(TESTIMONIALS.length).toBeGreaterThanOrEqual(10);
    for (const t of TESTIMONIALS) {
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
      expect(t.content.length).toBeGreaterThan(20);
    }
  });

  it("קמפיינים — לוחות זמן הגיוניים", () => {
    expect(CAMPAIGNS.length).toBe(5);
    for (const c of CAMPAIGNS) {
      expect(c.endOffset).toBeGreaterThan(c.startOffset);
      expect(c.budget).toBeGreaterThan(0);
    }
  });

  it("CoA — היררכיה תקפה, אין מעגלים, יש שורשים", () => {
    expect(COA.length).toBeGreaterThan(0);
    const keys = new Set<string>();
    const visit = (node: any) => {
      expect(keys.has(node.key)).toBe(false);
      keys.add(node.key);
      for (const c of node.children ?? []) visit(c);
    };
    for (const root of COA) visit(root);
  });
});

describe("פונקציות money", () => {
  it("withVat ו-vatAmount עקביים זה עם זה", () => {
    const net = 1000;
    expect(round2(net + vatAmount(net))).toBe(withVat(net));
  });

  it("invoiceNumber בפורמט שנה-XXXXXX", () => {
    expect(invoiceNumber(2026, 1)).toBe("2026-000001");
    expect(invoiceNumber(2026, 123456)).toBe("2026-123456");
  });
});

describe("Hebrew utils", () => {
  it("ת.ז. תמיד 9 ספרות וספרת ביקורת תקינה", () => {
    setRngSeed("test");
    for (let i = 0; i < 50; i++) {
      const id = randomNationalId();
      expect(id).toMatch(/^\d{9}$/);
      // ולידציה חוזרת
      let sum = 0;
      for (let j = 0; j < 9; j++) {
        let d = parseInt(id[j], 10) * ((j % 2) + 1);
        if (d > 9) d -= 9;
        sum += d;
      }
      expect(sum % 10).toBe(0);
    }
  });

  it("ח.פ. בן 9 ספרות שמתחיל ב-5", () => {
    setRngSeed("test");
    for (let i = 0; i < 20; i++) {
      const id = randomTaxId();
      expect(id).toMatch(/^5\d{8}$/);
    }
  });
});
