/**
 * תרשים חשבונות ישראלי — BudgetCategories היררכי.
 */
import { did } from "../utils/ids.js";
import type { SeedContext } from "../context.js";

interface CoaNode {
  key: string;
  name: string;
  hebrewName: string;
  children?: CoaNode[];
  monthlyBudget?: number;
  yearlyBudget?: number;
}

export const COA: CoaNode[] = [
  {
    key: "revenue",
    name: "Revenue",
    hebrewName: "הכנסות",
    children: [
      { key: "rev-events", name: "Event Revenue", hebrewName: "הכנסות מאירועים", yearlyBudget: 5000000 },
      { key: "rev-catering", name: "Catering", hebrewName: "הכנסות מקייטרינג שוטף", yearlyBudget: 1500000 },
    ],
  },
  {
    key: "cogs",
    name: "Cost of Goods Sold",
    hebrewName: "עלות המכר",
    children: [
      { key: "cogs-food", name: "Food", hebrewName: "מזון וחומרי גלם", monthlyBudget: 80000 },
      { key: "cogs-disposables", name: "Disposables", hebrewName: "כלי חד\"פ", monthlyBudget: 12000 },
      { key: "cogs-beverages", name: "Beverages", hebrewName: "משקאות ויינות", monthlyBudget: 25000 },
    ],
  },
  {
    key: "opex",
    name: "Operating Expenses",
    hebrewName: "הוצאות תפעוליות",
    children: [
      { key: "opex-rent", name: "Rent", hebrewName: "שכירות מטבח ומחסן", monthlyBudget: 22000 },
      { key: "opex-utilities", name: "Utilities", hebrewName: "חשמל, מים, גז", monthlyBudget: 8000 },
      { key: "opex-fuel", name: "Fuel", hebrewName: "דלק לרכבים", monthlyBudget: 6000 },
      { key: "opex-maintenance", name: "Maintenance", hebrewName: "תחזוקה ותיקונים", monthlyBudget: 4500 },
      { key: "opex-insurance", name: "Insurance", hebrewName: "ביטוחים", monthlyBudget: 7500 },
    ],
  },
  {
    key: "salaries",
    name: "Salaries",
    hebrewName: "שכר עבודה",
    children: [
      { key: "sal-kitchen", name: "Kitchen", hebrewName: "שכר מטבח", monthlyBudget: 65000 },
      { key: "sal-service", name: "Service", hebrewName: "שכר שטח", monthlyBudget: 35000 },
      { key: "sal-office", name: "Office", hebrewName: "שכר משרד", monthlyBudget: 45000 },
      { key: "sal-drivers", name: "Drivers", hebrewName: "שכר נהגים", monthlyBudget: 22000 },
    ],
  },
  {
    key: "marketing",
    name: "Marketing",
    hebrewName: "שיווק",
    children: [
      { key: "mkt-ads", name: "Ads", hebrewName: "פרסום דיגיטלי", monthlyBudget: 8000 },
      { key: "mkt-print", name: "Print", hebrewName: "פליירים וברושורים", monthlyBudget: 1500 },
    ],
  },
];

export interface SeededBudgetCategory {
  id: string;
  key: string;
  hebrewName: string;
}

export async function seedCoa(ctx: SeedContext): Promise<SeededBudgetCategory[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededBudgetCategory[] = [];

  async function insert(node: CoaNode, parentId: string | null): Promise<void> {
    const id = did(`bc:${tenantId}:${node.key}`);
    await prisma.budgetCategory.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        parentId,
        name: node.name,
        hebrewName: node.hebrewName,
        monthlyBudget: (node.monthlyBudget ?? null) as any,
        yearlyBudget: (node.yearlyBudget ?? null) as any,
        isActive: true,
      },
    });
    out.push({ id, key: node.key, hebrewName: node.hebrewName });
    for (const child of node.children ?? []) {
      await insert(child, id);
    }
  }

  for (const root of COA) {
    await insert(root, null);
  }

  return out;
}
