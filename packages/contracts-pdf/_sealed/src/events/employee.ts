import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { EmployeeIdSchema } from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const EmployeeClockedPayloadSchema = z
  .object({
    employeeId: EmployeeIdSchema,
    direction: z.enum(['IN', 'OUT']),
    at: IsoDateTimeSchema,
    geo: z
      .object({ lat: z.number(), lng: z.number() })
      .nullable()
      .optional(),
  })
  .strict();
export const EmployeeClockedEventSchema = DomainEventEnvelopeSchema(
  'employee.clocked',
  EmployeeClockedPayloadSchema,
);
export type EmployeeClockedEvent = z.infer<typeof EmployeeClockedEventSchema>;

export const PayrollCalculatedPayloadSchema = z
  .object({
    employeeId: EmployeeIdSchema,
    periodStart: IsoDateTimeSchema,
    periodEnd: IsoDateTimeSchema,
    gross: MoneySchema,
    net: MoneySchema,
    hoursWorked: z.string(),
  })
  .strict();
export const PayrollCalculatedEventSchema = DomainEventEnvelopeSchema(
  'payroll.calculated',
  PayrollCalculatedPayloadSchema,
);
export type PayrollCalculatedEvent = z.infer<
  typeof PayrollCalculatedEventSchema
>;
