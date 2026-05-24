import { z } from 'zod';
import {
  CustomerSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
} from '../entities/Customer.js';
import { CustomerIdSchema } from '../common/id.js';

export const CreateCustomerInputSchema = CreateCustomerSchema;
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;
export const CreateCustomerOutputSchema = CustomerSchema;
export type CreateCustomerOutput = z.infer<typeof CreateCustomerOutputSchema>;

export const UpdateCustomerInputSchema = z
  .object({ id: CustomerIdSchema, patch: UpdateCustomerSchema })
  .strict();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

export const GetCustomerInputSchema = z
  .object({ id: CustomerIdSchema })
  .strict();
export type GetCustomerInput = z.infer<typeof GetCustomerInputSchema>;

export const ListCustomersInputSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(200).default(50),
    search: z.string().max(255).nullable().optional(),
  })
  .strict();
export type ListCustomersInput = z.infer<typeof ListCustomersInputSchema>;

export const ListCustomersOutputSchema = z
  .object({
    items: z.array(CustomerSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type ListCustomersOutput = z.infer<typeof ListCustomersOutputSchema>;
