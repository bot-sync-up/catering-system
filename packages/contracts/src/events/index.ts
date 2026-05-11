import { z } from 'zod';
export * from './base.js';
export * from './lead.js';
export * from './quote.js';
export * from './order.js';
export * from './payment.js';
export * from './invoice.js';
export * from './event.js';
export * from './delivery.js';
export * from './inventory.js';
export * from './employee.js';

import { LeadCreatedEventSchema } from './lead.js';
import {
  QuoteSentEventSchema,
  QuoteAcceptedEventSchema,
} from './quote.js';
import {
  OrderPlacedEventSchema,
  OrderApprovedEventSchema,
  OrderCancelledEventSchema,
} from './order.js';
import {
  PaymentReceivedEventSchema,
  PaymentFailedEventSchema,
} from './payment.js';
import { InvoiceIssuedEventSchema, InvoicePaidEventSchema } from './invoice.js';
import { EventScheduledEventSchema, EventCompletedEventSchema } from './event.js';
import {
  DeliveryDispatchedEventSchema,
  DeliveryCompletedEventSchema,
} from './delivery.js';
import { InventoryLowEventSchema, InventoryReceivedEventSchema } from './inventory.js';
import {
  EmployeeClockedEventSchema,
  PayrollCalculatedEventSchema,
} from './employee.js';

/** דיסקרימינטור ראשי לכל אירועי הדומיין */
export const DomainEventSchema = z.discriminatedUnion('name', [
  LeadCreatedEventSchema,
  QuoteSentEventSchema,
  QuoteAcceptedEventSchema,
  OrderPlacedEventSchema,
  OrderApprovedEventSchema,
  OrderCancelledEventSchema,
  PaymentReceivedEventSchema,
  PaymentFailedEventSchema,
  InvoiceIssuedEventSchema,
  InvoicePaidEventSchema,
  EventScheduledEventSchema,
  EventCompletedEventSchema,
  DeliveryDispatchedEventSchema,
  DeliveryCompletedEventSchema,
  InventoryLowEventSchema,
  InventoryReceivedEventSchema,
  EmployeeClockedEventSchema,
  PayrollCalculatedEventSchema,
]);
export type AnyDomainEvent = z.infer<typeof DomainEventSchema>;

/** מילון שמות אירועים — לשימוש בצרכני event-bus */
export const EVENT_NAMES = [
  'lead.created',
  'quote.sent',
  'quote.accepted',
  'order.placed',
  'order.approved',
  'order.cancelled',
  'payment.received',
  'payment.failed',
  'invoice.issued',
  'invoice.paid',
  'event.scheduled',
  'event.completed',
  'delivery.dispatched',
  'delivery.completed',
  'inventory.low',
  'inventory.received',
  'employee.clocked',
  'payroll.calculated',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
