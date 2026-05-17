import { z } from 'zod';
import { ProductIdSchema, RecipeIdSchema } from '../common/id.js';
import { TimestampsSchema } from '../common/timestamps.js';

export const RecipeIngredientSchema = z
  .object({
    productId: ProductIdSchema,
    quantity: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Quantity must be decimal'),
    note: z.string().max(500).nullable().optional(),
  })
  .strict();
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeStepSchema = z
  .object({
    order: z.number().int().nonnegative(),
    instruction: z.string().min(1).max(2000),
    durationMinutes: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeSchema = z
  .object({
    id: RecipeIdSchema,
    name: z.string().min(1).max(255),
    /** מנת בסיס — לכמה מנות המתכון מכוון */
    yieldPortions: z.number().int().positive().default(1),
    ingredients: z.array(RecipeIngredientSchema).min(1),
    steps: z.array(RecipeStepSchema).default([]),
    prepMinutes: z.number().int().nonnegative().nullable().optional(),
    cookMinutes: z.number().int().nonnegative().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .merge(TimestampsSchema)
  .strict();

export type Recipe = z.infer<typeof RecipeSchema>;
