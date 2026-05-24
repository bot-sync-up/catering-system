import { describe, it, expect } from 'vitest';
import { can } from '../src/lib/rbac.js';

describe('rbac', () => {
  it('viewer cannot create', () => {
    expect(can('VIEWER', 'doc.create')).toBe(false);
    expect(can('VIEWER', 'doc.read')).toBe(true);
  });
  it('sales cannot freeze', () => {
    expect(can('SALES', 'customer.freeze')).toBe(false);
    expect(can('SALES', 'doc.create')).toBe(true);
  });
  it('admin can do everything', () => {
    expect(can('ADMIN', 'doc.cancel')).toBe(true);
    expect(can('ADMIN', 'admin')).toBe(true);
  });
  it('accountant can credit & freeze', () => {
    expect(can('ACCOUNTANT', 'doc.credit')).toBe(true);
    expect(can('ACCOUNTANT', 'customer.freeze')).toBe(true);
  });
});
