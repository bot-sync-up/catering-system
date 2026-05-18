import { z } from 'zod';

/** תפקידי משתמשים במערכת */
export const RoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
  'KITCHEN',
  'OPERATIONS',
  'DELIVERY',
  'ACCOUNTANT',
  'EMPLOYEE',
  'VIEWER',
]);
export const Role = RoleSchema.enum;
export type Role = z.infer<typeof RoleSchema>;
