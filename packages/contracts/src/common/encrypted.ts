import { z } from 'zod';

/**
 * סמן לערך מוצפן בצד-שרת. הערך לעולם לא נחשף ב-API כטקסט גלוי.
 * הקליינט מקבל ייצוג זה ויודע שעליו לבקש פענוח/לקבל מאסקה.
 */
export const EncryptedFieldSchema = z
  .object({
    __encrypted: z.literal(true),
    /** מפתח אלגוריתם — לרוב KMS:key-id או "aes-256-gcm" */
    algo: z.string().min(1),
    /** ciphertext base64. במידה והשירות שולח רק מאסקה — ישלח null */
    ciphertext: z.string().nullable(),
    /** מאסקה לתצוגה (4 אחרונים בלבד וכד') */
    masked: z.string().nullable().optional(),
  })
  .strict();

export type EncryptedField = z.infer<typeof EncryptedFieldSchema>;
