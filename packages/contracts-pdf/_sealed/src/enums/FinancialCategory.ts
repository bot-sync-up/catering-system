import { z } from 'zod';

/** קטגוריות הנהלת חשבונות פנימיות */
export const FinancialCategorySchema = z.enum([
  'INCOME_SALES',
  'INCOME_OTHER',
  'EXPENSE_INGREDIENTS',
  'EXPENSE_PACKAGING',
  'EXPENSE_SALARIES',
  'EXPENSE_RENT',
  'EXPENSE_UTILITIES',
  'EXPENSE_TRANSPORT',
  'EXPENSE_MARKETING',
  'EXPENSE_TAX',
  'EXPENSE_OTHER',
  'REFUND',
  'TRANSFER',
]);
export const FinancialCategory = FinancialCategorySchema.enum;
export type FinancialCategory = z.infer<typeof FinancialCategorySchema>;
