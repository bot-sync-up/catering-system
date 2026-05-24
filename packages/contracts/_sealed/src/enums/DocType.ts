import { z } from 'zod';

/** סוג מסמך פיננסי */
export const DocTypeSchema = z.enum([
  'QUOTE',
  'INVOICE',
  'TAX_INVOICE',
  'RECEIPT',
  'TAX_INVOICE_RECEIPT',
  'CREDIT_NOTE',
  'PROFORMA',
  'DELIVERY_NOTE',
]);
export const DocType = DocTypeSchema.enum;
export type DocType = z.infer<typeof DocTypeSchema>;

/**
 * תיוג מסמך — האם הוא רשמי (נכנס לדיווח לרשויות) או לא רשמי (פנימי בלבד).
 * דרוש להפרדה בין מסלולי דיווח שונים.
 */
export const DocTagSchema = z.enum(['OFFICIAL', 'UNOFFICIAL']);
export const DocTag = DocTagSchema.enum;
export type DocTag = z.infer<typeof DocTagSchema>;
