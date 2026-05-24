import { z } from 'zod';
import { IsoDateTimeSchema } from '../common/timestamps.js';
import { CuidSchema } from '../common/id.js';

/**
 * מעטפת אחידה לכל אירוע דומיין. ה-payload ספציפי לכל אירוע.
 */
export const DomainEventEnvelopeSchema = <T extends z.ZodTypeAny>(
  name: string,
  payload: T,
) =>
  z
    .object({
      /** מזהה אירוע ייחודי (cuid) */
      eventId: CuidSchema,
      /** שם האירוע — חובה להיות זהה ל-`name` הנתון */
      name: z.literal(name),
      /** גרסת סכמה של האירוע */
      version: z.number().int().positive().default(1),
      /** מתי האירוע התרחש */
      occurredAt: IsoDateTimeSchema,
      /** מזהה בעל הסיבתיות (אם רלוונטי — משתמש/מערכת) */
      actorId: CuidSchema.nullable().optional(),
      /** trace/correlation לקישור בין אירועים */
      correlationId: CuidSchema.nullable().optional(),
      causationId: CuidSchema.nullable().optional(),
      payload,
    })
    .strict();

export type DomainEvent<T> = {
  eventId: string;
  name: string;
  version: number;
  occurredAt: string;
  actorId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  payload: T;
};
