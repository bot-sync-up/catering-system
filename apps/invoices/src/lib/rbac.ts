// Role-based access control.
import type { Role } from '@prisma/client';

export type Action =
  | 'doc.read'
  | 'doc.create'
  | 'doc.issue'
  | 'doc.cancel'
  | 'doc.credit'
  | 'payment.record'
  | 'check.manage'
  | 'customer.manage'
  | 'customer.freeze'
  | 'reminder.manage'
  | 'admin';

const MATRIX: Record<Role, Action[]> = {
  ADMIN: [
    'doc.read', 'doc.create', 'doc.issue', 'doc.cancel', 'doc.credit',
    'payment.record', 'check.manage',
    'customer.manage', 'customer.freeze',
    'reminder.manage', 'admin',
  ],
  ACCOUNTANT: [
    'doc.read', 'doc.create', 'doc.issue', 'doc.credit',
    'payment.record', 'check.manage',
    'customer.manage', 'customer.freeze',
    'reminder.manage',
  ],
  SALES: [
    'doc.read', 'doc.create', 'doc.issue',
    'customer.manage',
  ],
  VIEWER: ['doc.read'],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.includes(action) ?? false;
}
