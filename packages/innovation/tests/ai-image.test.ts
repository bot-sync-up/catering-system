import { describe, it, expect } from "vitest";
import { MenuImageGenerator, StableDiffusionStubProvider } from "../src/ai-image/MenuImageGenerator.js";
import { buildMenuImagePrompt, TEMPLATES } from "../src/ai-image/promptTemplates.js";

describe("promptTemplates", () => {
  it("בונה פרומפט אנגלי + תיאור עברי", () => {
    const r = buildMenuImagePrompt(
      { id: "1", nameHe: "סלט קצוץ", nameEn: "Chopped Salad", ingredientsHe: ["מלפפון", "עגבנייה"] },
      "studio",
    );
    expect(r.prompt).toMatch(/Chopped Salad/);
    expect(r.descriptionHe).toMatch(/סלט קצוץ/);
    expect(r.aspectRatio).toBe("1:1");
    expect(r.negativePrompt).toContain("watermark");
  });

  it("תבנית SHABBAT_DISH מוסיפה אווירה של שבת", () => {
    const r = TEMPLATES.SHABBAT_DISH({ id: "2", nameHe: "חמין", nameEn: "Cholent" });
    expect(r.prompt.toLowerCase()).toContain("shabbat");
  });
});

describe("MenuImageGenerator", () => {
  it("מייצר תמונה דרך הסטאב", async () => {
    const g = new MenuImageGenerator({ provider: new StableDiffusionStubProvider() });
    const img = await g.generateForItem({ id: "10", nameHe: "פסטה" });
    expect(img.url).toContain("picsum.photos");
    expect(img.width).toBeGreaterThan(0);
    expect(img.itemId).toBe("10");
  });

  it("bulk מכבד concurrency", async () => {
    const g = new MenuImageGenerator({ concurrency: 2 });
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, nameHe: `פריט ${i}` }));
    const results = await g.generateBulk(items);
    expect(results).toHaveLength(5);
    expect(new Set(results.map((r) => r.itemId)).size).toBe(5);
  });
});
