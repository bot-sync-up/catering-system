/**
 * RBAC — מטריצת הרשאות לפי תפקיד.
 * 4 רמות: module / action / field / record
 * שני קטגוריות: official (רשמי) | unofficial (לא-רשמי)
 * Black/White lists לכל permission
 */
import { Module, Action, Permission, Role, RolePermissions } from '../types';

const all = (m: Module, cat: 'official' | 'unofficial' = 'official'): Permission => ({
  level: 'module', module: m, category: cat, list: 'white',
});

const can = (m: Module, a: Action, cat: 'official' | 'unofficial' = 'official'): Permission => ({
  level: 'action', module: m, action: a, category: cat, list: 'white',
});

const denyField = (m: Module, field: string): Permission => ({
  level: 'field', module: m, field, category: 'official', list: 'black',
});

const ownRecord = (m: Module, predicate = 'owner_id == :user.id'): Permission => ({
  level: 'record', module: m, recordPredicate: predicate, category: 'official', list: 'white',
});

export const ROLE_MATRIX: RolePermissions[] = [
  {
    role: 'general_manager',
    permissions: [
      // גישה כוללת לכל המודולים — רשמי וגם לא-רשמי
      ...(['users','orders','inventory','finance','kitchen','delivery','reports','hr','customers','audit','settings'] as Module[])
        .flatMap(m => [all(m, 'official'), all(m, 'unofficial')]),
    ],
  },
  {
    role: 'finance',
    permissions: [
      all('finance', 'official'), all('finance', 'unofficial'),
      all('reports', 'official'),
      can('orders', 'read'), can('orders', 'export'),
      can('users', 'read'),
      // יכול לראות שדות שכר/בנק (יוצא דופן ל-blacklist הגלובלי)
    ],
  },
  {
    role: 'sales',
    permissions: [
      all('orders'), all('customers'),
      can('reports', 'read'),
      can('inventory', 'read'),
      // לא רואה שכר/בנק
      denyField('users', 'salary'),
      denyField('users', 'bankAccount'),
      denyField('users', 'nationalId'),
    ],
  },
  {
    role: 'agent',
    permissions: [
      can('orders', 'create'), can('orders', 'read'), can('orders', 'update'),
      can('customers', 'create'), can('customers', 'read'), can('customers', 'update'),
      // רק רשומות שיוצרו ע"י הסוכן
      ownRecord('orders', 'agent_id == :user.id'),
      ownRecord('customers', 'created_by == :user.id'),
      denyField('users', 'salary'),
      denyField('users', 'bankAccount'),
      denyField('users', 'nationalId'),
    ],
  },
  {
    role: 'kitchen_manager',
    permissions: [
      all('kitchen'), all('inventory'),
      can('orders', 'read'), can('orders', 'update'),
      can('reports', 'read'),
      can('users', 'read'),
      denyField('users', 'salary'),
      denyField('users', 'bankAccount'),
    ],
  },
  {
    role: 'kitchen_worker',
    permissions: [
      can('kitchen', 'read'), can('kitchen', 'update'),
      can('inventory', 'read'),
      can('orders', 'read'),
    ],
  },
  {
    role: 'operations',
    permissions: [
      all('delivery'),
      can('orders', 'read'), can('orders', 'update'),
      can('inventory', 'read'),
      can('reports', 'read'),
    ],
  },
  {
    role: 'shift_worker',
    permissions: [
      can('orders', 'read'), can('orders', 'update'),
      ownRecord('orders', 'shift_id == :user.shift_id'),
    ],
  },
  {
    role: 'driver',
    permissions: [
      can('delivery', 'read'), can('delivery', 'update'),
      can('orders', 'read'),
      ownRecord('delivery', 'driver_id == :user.id'),
    ],
  },
  {
    role: 'hr',
    permissions: [
      all('hr'),
      can('users', 'create'), can('users', 'read'), can('users', 'update'),
      // HR רואה שכר/בנק
    ],
  },
  {
    role: 'customer',
    permissions: [
      can('orders', 'create'), can('orders', 'read'),
      ownRecord('orders', 'customer_id == :user.id'),
    ],
  },
];

const matrixIndex: Map<Role, Permission[]> = new Map(
  ROLE_MATRIX.map(rp => [rp.role, rp.permissions])
);

export function getPermissions(roles: Role[]): Permission[] {
  const out: Permission[] = [];
  for (const r of roles) {
    const ps = matrixIndex.get(r);
    if (ps) out.push(...ps);
  }
  return out;
}
