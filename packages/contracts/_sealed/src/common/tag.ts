import { z } from 'zod';
import { TagIdSchema } from './id.js';

export const TagSchema = z
  .object({
    id: TagIdSchema,
    name: z.string().min(1).max(64),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be HEX')
      .nullable()
      .optional(),
  })
  .strict();

export type Tag = z.infer<typeof TagSchema>;
