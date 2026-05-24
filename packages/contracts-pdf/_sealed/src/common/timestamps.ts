import { z } from 'zod';

/** תאריך בפורמט ISO 8601 (UTC) */
export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime());

export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/** שדות מטא-מידע סטנדרטיים לכל ישות */
export const TimestampsSchema = z.object({
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable().optional(),
});

export type Timestamps = z.infer<typeof TimestampsSchema>;
