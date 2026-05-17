/**
 * מיפוי בין מפתחות מכונת המצב (lowercase) ל-Prisma enum (UPPER_CASE)
 */

import type { OrderStatusKey } from './stateMachine';

// אנחנו לא ייבאים את ה-Prisma enum ישירות בקוד דומיין —
// כדי שלוגיקת המצב תעבוד גם בלי DB (בטסטים).
export type PrismaOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'PREPARING'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WAITLISTED';

const TO_PRISMA: Record<OrderStatusKey, PrismaOrderStatus> = {
  draft: 'DRAFT',
  pending: 'PENDING',
  approved: 'APPROVED',
  preparing: 'PREPARING',
  delivering: 'DELIVERING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  waitlisted: 'WAITLISTED',
};

const FROM_PRISMA: Record<PrismaOrderStatus, OrderStatusKey> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PREPARING: 'preparing',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  WAITLISTED: 'waitlisted',
};

export const toPrismaStatus = (s: OrderStatusKey): PrismaOrderStatus =>
  TO_PRISMA[s];

export const fromPrismaStatus = (s: PrismaOrderStatus): OrderStatusKey =>
  FROM_PRISMA[s];

export const STATUS_LABELS_HE: Record<OrderStatusKey, string> = {
  draft: 'טיוטה',
  pending: 'ממתין לאישור',
  approved: 'אושר',
  preparing: 'בהכנה',
  delivering: 'במשלוח',
  completed: 'הושלם',
  cancelled: 'בוטל',
  waitlisted: 'ברשימת המתנה',
};
