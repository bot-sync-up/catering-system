import { z } from 'zod';

/** מטבע ברירת מחדל — שקל ישראלי */
export const CurrencySchema = z.enum(['ILS', 'USD', 'EUR']);
export const Currency = CurrencySchema.enum;
export type Currency = z.infer<typeof CurrencySchema>;
