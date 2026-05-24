/**
 * 20 מתכונים — עם שלבי הכנה ו-FK ל-products.
 */
import { did } from "../utils/ids.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededProduct } from "./products.js";

interface RecipeSpec {
  key: string;
  hebrewName: string;
  servings: number;
  prepMins: number;
  cookMins: number;
  instructions: string[];
  ingredients: { productKey: string; quantity: number; unit: string }[];
}

export const RECIPES: RecipeSpec[] = [
  {
    key: "kebab-grilled",
    hebrewName: "קבב בקר על האש",
    servings: 10,
    prepMins: 30,
    cookMins: 25,
    instructions: [
      "מערבבים בקר טחון, בצל קצוץ דק, פטרוזיליה, כמון, פפריקה ומלח",
      "מעצבים על שיפודים",
      "צולים על אש בינונית 8 דקות מכל צד",
    ],
    ingredients: [
      { productKey: "ground-beef", quantity: 2, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "parsley", quantity: 2, unit: "צרור" },
      { productKey: "spice-cumin", quantity: 0.02, unit: "ק\"ג" },
      { productKey: "spice-paprika", quantity: 0.02, unit: "ק\"ג" },
    ],
  },
  {
    key: "schnitzel-classic",
    hebrewName: "שניצל קלאסי",
    servings: 12,
    prepMins: 20,
    cookMins: 15,
    instructions: [
      "טובלים את השניצל בקמח, ביצה ופירורי לחם",
      "מטגנים בשמן עמוק עד שזהוב",
      "מסננים על נייר סופג",
    ],
    ingredients: [
      { productKey: "schnitzel", quantity: 1.5, unit: "ק\"ג" },
      { productKey: "flour", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.3, unit: "תבנית 30" },
      { productKey: "oil-canola", quantity: 1, unit: "ליטר" },
    ],
  },
  {
    key: "stuffed-chicken",
    hebrewName: "עוף ממולא אורז",
    servings: 8,
    prepMins: 45,
    cookMins: 90,
    instructions: [
      "מבשלים אורז עם בצל מטוגן ותבלינים",
      "ממלאים את העוף בערבוב",
      "אופים בתנור 180 מעלות 90 דקות",
    ],
    ingredients: [
      { productKey: "whole-chicken", quantity: 2, unit: "יחידה" },
      { productKey: "rice-white", quantity: 0.8, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "spice-baharat", quantity: 0.01, unit: "ק\"ג" },
    ],
  },
  {
    key: "salmon-baked",
    hebrewName: "סלמון אפוי בלימון",
    servings: 8,
    prepMins: 15,
    cookMins: 25,
    instructions: [
      "מצקים פילה סלמון בתבנית עם שמן זית, לימון ושום",
      "אופים בתנור 200 מעלות 20-25 דקות",
      "מקשטים בשמיר",
    ],
    ingredients: [
      { productKey: "salmon", quantity: 1.5, unit: "ק\"ג" },
      { productKey: "lemon", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "garlic", quantity: 0.05, unit: "ק\"ג" },
      { productKey: "oil-olive", quantity: 0.1, unit: "ליטר" },
      { productKey: "dill", quantity: 2, unit: "צרור" },
    ],
  },
  {
    key: "gefilte-fish",
    hebrewName: "געפילטע פיש מסורתי",
    servings: 15,
    prepMins: 60,
    cookMins: 120,
    instructions: [
      "טוחנים את הקרפיון עם בצל וביצים",
      "מעצבים כדורים ומבשלים בציר ירקות",
      "מצננים בקירור 4 שעות",
    ],
    ingredients: [
      { productKey: "carp", quantity: 2, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.4, unit: "ק\"ג" },
      { productKey: "carrot", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.2, unit: "תבנית 30" },
    ],
  },
  {
    key: "couscous-classic",
    hebrewName: "קוסקוס מרוקאי עם ירקות",
    servings: 20,
    prepMins: 40,
    cookMins: 90,
    instructions: [
      "מאדים קוסקוס בקיטור 3 פעמים",
      "מבשלים מרק ירקות עם דלעת, גזר, כרוב וגרגרי חומוס",
      "מגישים יחד עם הרבה רוטב חריף",
    ],
    ingredients: [
      { productKey: "couscous", quantity: 1.5, unit: "ק\"ג" },
      { productKey: "carrot", quantity: 0.8, unit: "ק\"ג" },
      { productKey: "cabbage", quantity: 0.6, unit: "ק\"ג" },
      { productKey: "chickpeas", quantity: 0.3, unit: "ק\"ג" },
    ],
  },
  {
    key: "hummus",
    hebrewName: "חומוס ביתי",
    servings: 30,
    prepMins: 20,
    cookMins: 90,
    instructions: [
      "משרים חומוס למשך הלילה",
      "מבשלים שעה וחצי עד רך",
      "מועכים עם טחינה, שום ולימון",
    ],
    ingredients: [
      { productKey: "chickpeas", quantity: 1, unit: "ק\"ג" },
      { productKey: "tahini", quantity: 0.4, unit: "ק\"ג" },
      { productKey: "lemon", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "garlic", quantity: 0.05, unit: "ק\"ג" },
    ],
  },
  {
    key: "tehina-salad",
    hebrewName: "סלט טחינה",
    servings: 25,
    prepMins: 15,
    cookMins: 0,
    instructions: [
      "מערבבים טחינה עם מים, לימון ושום",
      "מתבלים במלח וכמון",
      "מקשטים בפטרוזיליה",
    ],
    ingredients: [
      { productKey: "tahini", quantity: 0.6, unit: "ק\"ג" },
      { productKey: "lemon", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "garlic", quantity: 0.04, unit: "ק\"ג" },
      { productKey: "parsley", quantity: 2, unit: "צרור" },
    ],
  },
  {
    key: "israeli-salad",
    hebrewName: "סלט ישראלי",
    servings: 20,
    prepMins: 25,
    cookMins: 0,
    instructions: [
      "חותכים עגבניות ומלפפונים לקוביות קטנות",
      "מוסיפים בצל, פטרוזיליה ופלפל",
      "מתבלים בשמן זית, לימון ומלח",
    ],
    ingredients: [
      { productKey: "tomato", quantity: 1, unit: "ק\"ג" },
      { productKey: "cucumber", quantity: 1, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "parsley", quantity: 2, unit: "צרור" },
      { productKey: "oil-olive", quantity: 0.1, unit: "ליטר" },
      { productKey: "lemon", quantity: 0.1, unit: "ק\"ג" },
    ],
  },
  {
    key: "roasted-veg",
    hebrewName: "ירקות שורש קלויים",
    servings: 15,
    prepMins: 20,
    cookMins: 45,
    instructions: [
      "חותכים בטטות, גזר ותפו\"א לקוביות",
      "מערבבים בשמן זית, מלח ופפריקה",
      "אופים 200 מעלות 40 דקות",
    ],
    ingredients: [
      { productKey: "sweet-potato", quantity: 1, unit: "ק\"ג" },
      { productKey: "potato", quantity: 1, unit: "ק\"ג" },
      { productKey: "carrot", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "oil-olive", quantity: 0.1, unit: "ליטר" },
    ],
  },
  {
    key: "stuffed-grape-leaves",
    hebrewName: "עלי גפן ממולאים",
    servings: 20,
    prepMins: 60,
    cookMins: 60,
    instructions: [
      "מבשלים אורז עם פטרוזיליה ונענע",
      "ממלאים עלי גפן ומגלגלים",
      "מבשלים על אש קטנה שעה",
    ],
    ingredients: [
      { productKey: "rice-white", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "parsley", quantity: 3, unit: "צרור" },
      { productKey: "mint", quantity: 2, unit: "צרור" },
      { productKey: "lemon", quantity: 0.2, unit: "ק\"ג" },
    ],
  },
  {
    key: "shakshuka",
    hebrewName: "שקשוקה",
    servings: 8,
    prepMins: 15,
    cookMins: 25,
    instructions: [
      "מטגנים בצל ופלפלים",
      "מוסיפים עגבניות מרוסקות ותבלינים",
      "שוברים ביצים ומבשלים עד שהחלבון נקרש",
    ],
    ingredients: [
      { productKey: "tomato", quantity: 1, unit: "ק\"ג" },
      { productKey: "pepper-red", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.3, unit: "תבנית 30" },
      { productKey: "spice-paprika", quantity: 0.01, unit: "ק\"ג" },
    ],
  },
  {
    key: "burekas-cheese",
    hebrewName: "בורקס גבינה",
    servings: 24,
    prepMins: 15,
    cookMins: 25,
    instructions: [
      "ממלאים בצק עלים בגבינה",
      "מברישים בביצה ומפזרים שומשום",
      "אופים 200 מעלות 20-25 דקות",
    ],
    ingredients: [
      { productKey: "cheese-feta", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.1, unit: "תבנית 30" },
    ],
  },
  {
    key: "matbukha",
    hebrewName: "מטבוחה",
    servings: 20,
    prepMins: 20,
    cookMins: 60,
    instructions: [
      "צולים פלפלים על אש",
      "מבשלים עם עגבניות מרוסקות, שום ופפריקה",
      "מבשלים על אש נמוכה שעה",
    ],
    ingredients: [
      { productKey: "tomato", quantity: 1.5, unit: "ק\"ג" },
      { productKey: "pepper-red", quantity: 0.8, unit: "ק\"ג" },
      { productKey: "garlic", quantity: 0.08, unit: "ק\"ג" },
      { productKey: "spice-paprika", quantity: 0.02, unit: "ק\"ג" },
    ],
  },
  {
    key: "tahdig-rice",
    hebrewName: "אורז פרסי עם תחתית קראנצ'ית",
    servings: 15,
    prepMins: 30,
    cookMins: 75,
    instructions: [
      "משרים אורז בסמטי שעה",
      "מבשלים חלקית ומסננים",
      "אופים בסיר עם שמן וכורכום עד תחתית פריכה",
    ],
    ingredients: [
      { productKey: "rice-basmati", quantity: 1, unit: "ק\"ג" },
      { productKey: "oil-canola", quantity: 0.2, unit: "ליטר" },
      { productKey: "spice-turmeric", quantity: 0.005, unit: "ק\"ג" },
    ],
  },
  {
    key: "kugel-noodles",
    hebrewName: "קוגל ירושלמי",
    servings: 12,
    prepMins: 20,
    cookMins: 90,
    instructions: [
      "מטגנים אטריות עם סוכר עד קרמל",
      "מערבבים עם ביצים ופלפל שחור",
      "אופים שעה וחצי בתנור",
    ],
    ingredients: [
      { productKey: "pasta", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "sugar", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.2, unit: "תבנית 30" },
      { productKey: "spice-pepper", quantity: 0.01, unit: "ק\"ג" },
    ],
  },
  {
    key: "fruit-platter",
    hebrewName: "פלטת פירות",
    servings: 30,
    prepMins: 30,
    cookMins: 0,
    instructions: [
      "חותכים את כל הפירות לפרוסות אלגנטיות",
      "מסדרים על פלטה גדולה",
      "מקשטים בנענע",
    ],
    ingredients: [
      { productKey: "watermelon", quantity: 3, unit: "ק\"ג" },
      { productKey: "grapes", quantity: 1, unit: "ק\"ג" },
      { productKey: "strawberry", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "orange", quantity: 1, unit: "ק\"ג" },
      { productKey: "mint", quantity: 2, unit: "צרור" },
    ],
  },
  {
    key: "lentil-soup",
    hebrewName: "מרק עדשים",
    servings: 20,
    prepMins: 15,
    cookMins: 60,
    instructions: [
      "מבשלים עדשים עם בצל, גזר ושום",
      "מתבלים בכמון ובהרט",
      "מגישים עם פיתה ולימון",
    ],
    ingredients: [
      { productKey: "lentils", quantity: 0.7, unit: "ק\"ג" },
      { productKey: "carrot", quantity: 0.3, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "spice-cumin", quantity: 0.01, unit: "ק\"ג" },
    ],
  },
  {
    key: "white-bean-stew",
    hebrewName: "שעועית לבנה ברוטב עגבניות",
    servings: 18,
    prepMins: 30,
    cookMins: 120,
    instructions: [
      "משרים שעועית לבנה למשך הלילה",
      "מבשלים עם עגבניות, בצל ופפריקה",
      "מבשלים שעתיים עד שהשעועית רכה",
    ],
    ingredients: [
      { productKey: "beans-white", quantity: 0.8, unit: "ק\"ג" },
      { productKey: "tomato", quantity: 1, unit: "ק\"ג" },
      { productKey: "onion", quantity: 0.3, unit: "ק\"ג" },
    ],
  },
  {
    key: "rugelach-chocolate",
    hebrewName: "רוגלך שוקולד",
    servings: 40,
    prepMins: 60,
    cookMins: 25,
    instructions: [
      "מכינים בצק עם חמאה וקמח",
      "ממלאים בקקאו וסוכר ומגלגלים",
      "אופים 180 מעלות 20-25 דקות",
    ],
    ingredients: [
      { productKey: "flour", quantity: 0.5, unit: "ק\"ג" },
      { productKey: "butter", quantity: 1.5, unit: "חבילה 200 ג'" },
      { productKey: "sugar", quantity: 0.2, unit: "ק\"ג" },
      { productKey: "eggs", quantity: 0.1, unit: "תבנית 30" },
    ],
  },
];

export interface SeededRecipe {
  id: string;
  key: string;
  hebrewName: string;
}

export async function seedRecipes(
  ctx: SeedContext,
  products: SeededProduct[],
): Promise<SeededRecipe[]> {
  const { prisma, tenantId, factor } = ctx;
  const count = scaled(RECIPES.length, factor);
  const selected = RECIPES.slice(0, count);
  const productMap = new Map(products.map((p) => [p.key, p]));
  const out: SeededRecipe[] = [];

  for (const r of selected) {
    const id = did(`recipe:${tenantId}:${r.key}`);
    await prisma.recipe.upsert({
      where: { id },
      update: { name: r.hebrewName, servings: r.servings },
      create: {
        id,
        tenantId,
        name: r.hebrewName,
        hebrewName: r.hebrewName,
        servings: r.servings,
        prepTimeMins: r.prepMins,
        cookTimeMins: r.cookMins,
        instructions: r.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        currentVersion: 1,
        isActive: true,
      },
    });

    let order = 0;
    for (const ing of r.ingredients) {
      const product = productMap.get(ing.productKey);
      if (!product) continue;
      const riId = did(`ri:${id}:${product.id}`);
      await prisma.recipeIngredient.upsert({
        where: { recipeId_productId: { recipeId: id, productId: product.id } },
        update: { quantity: ing.quantity as any },
        create: {
          id: riId,
          tenantId,
          recipeId: id,
          productId: product.id,
          quantity: ing.quantity as any,
          unit: ing.unit,
          sortOrder: order++,
        },
      });
    }

    out.push({ id, key: r.key, hebrewName: r.hebrewName });
  }

  return out;
}
