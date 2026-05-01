import { getPermissions, ROLE_MATRIX } from '../src/rbac/roles';

describe('RBAC matrix', () => {
  test('כל 11 התפקידים מוגדרים', () => {
    const roles = ROLE_MATRIX.map(r => r.role);
    expect(roles).toEqual(expect.arrayContaining([
      'general_manager', 'finance', 'sales', 'agent',
      'kitchen_manager', 'kitchen_worker', 'operations',
      'shift_worker', 'driver', 'hr', 'customer',
    ]));
    expect(roles.length).toBe(11);
  });

  test('general_manager מקבל הרשאות לכל המודולים — official ו-unofficial', () => {
    const perms = getPermissions(['general_manager']);
    const offModules = new Set(perms.filter(p => p.category === 'official').map(p => p.module));
    const unofModules = new Set(perms.filter(p => p.category === 'unofficial').map(p => p.module));
    expect(offModules.size).toBe(11);
    expect(unofModules.size).toBe(11);
  });

  test('סוכן מקבל record-level predicate', () => {
    const perms = getPermissions(['agent']);
    const recordRules = perms.filter(p => p.level === 'record');
    expect(recordRules.length).toBeGreaterThan(0);
    expect(recordRules.some(p => p.recordPredicate?.includes(':user.id'))).toBe(true);
  });
});
