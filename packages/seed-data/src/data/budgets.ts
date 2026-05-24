/**
 * תקציבים — alias ל-CoA. הסעיפים יוצרו עם monthly/yearly budget.
 * הפונקציה הזו מספקת תקציב נוסף ספציפי לאירוע (כאשר רלוונטי).
 */
import type { SeedContext } from "../context.js";
import { seedCoa } from "./coa.js";

export async function seedBudgets(ctx: SeedContext) {
  return seedCoa(ctx);
}
