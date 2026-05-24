import { z } from 'zod';
import { ProductIdSchema, SupplierIdSchema, RecipeIdSchema } from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { TimestampsSchema } from '../common/timestamps.js';

export const ProductKindSchema = z.enum([
  'INGREDIENT',
  'DISH',
  'PACKAGE',
  'BEVERAGE',
  'EQUIPMENT',
  'SERVICE',
]);
export type ProductKind = z.infer<typeof ProductKindSchema>;

export const UnitOfMeasureSchema = z.enum([
  'PIECE',
  'KG',
  'GRAM',
  'LITER',
  'ML',
  'PORTION',
  'BOX',
  'HOUR',
]);
export type UnitOfMeasure = z.infer<typeof UnitOfMeasureSchema>;

export const ProductSchema = z
  .object({
    id: ProductIdSchema,
    sku: z.string().min(1).max(64),
    name: z.string().min(1).max(255),
    kind: ProductKindSchema,
    unit: UnitOfMeasureSchema,
    price: MoneySchema,
    cost: MoneySchema.nullable().optional(),
    recipeId: RecipeIdSchema.nullable().optional(),
    primarySupplierId: SupplierIdSchema.nullable().optional(),
    tracksInventory: z.boolean().default(false),
    stockQty: z
      .string()
      .regex(/^-?\d+(\.\d{1,4})?$/, 'Stock must be decimal')
      .default('0'),
    minStockQty: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Min stock must be decimal')
      .default('0'),
    isActive: z.boolean().default(true),
    allergens: z
      .array(
        z.enum([
          'GLUTEN',
          'DAIRY',
          'EGG',
          'NUT',
          'PEANUT',
          'SESAME',
          'SOY',
          'FISH',
          'SHELLFISH',
        ]),
      )
      .default([]),
    kosher: z
      .enum(['MEHADRIN', 'KOSHER', 'KOSHER_LEMEHADRIN', 'PARVE', 'NONE'])
      .nullable()
      .optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Product = z.infer<typeof ProductSchema>;
