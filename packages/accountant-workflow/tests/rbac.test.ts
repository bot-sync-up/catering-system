import { describe, it, expect } from 'vitest';
import { canPerform, filterFilesForRole, ForbiddenError, require } from '../src/rbac';
import type { GeneratedFile } from '../src/types';

const baseFile = (status: GeneratedFile['status']): GeneratedFile => ({
  id: 'x',
  formType: 'PCN874',
  period: { period: '2026-04', year: 2026, month: 4 },
  fileName: 'x',
  filePath: '/v/x',
  checksum: 'c',
  byteSize: 1,
  generatedAt: '2026-05-10T07:00:00Z',
  status,
});

describe('RBAC', () => {
  it('accountant יכול: portal.view, file.download, file.mark-submitted, audit.view', () => {
    const r = { userId: 'a', role: 'accountant' as const };
    expect(canPerform(r, 'portal.view')).toBe(true);
    expect(canPerform(r, 'file.download')).toBe(true);
    expect(canPerform(r, 'file.mark-submitted')).toBe(true);
    expect(canPerform(r, 'audit.view')).toBe(true);
    expect(canPerform(r, 'config.change-mode')).toBe(false);
    expect(canPerform(r, 'file.delete')).toBe(false);
  });

  it('general-manager יכול הכל', () => {
    const r = { userId: 'm', role: 'general-manager' as const };
    for (const p of ['portal.view', 'file.download', 'file.mark-submitted', 'config.change-mode', 'file.delete', 'audit.view'] as const) {
      expect(canPerform(r, p)).toBe(true);
    }
  });

  it('staff לא יכול כלום', () => {
    const r = { userId: 's', role: 'staff' as const };
    expect(canPerform(r, 'portal.view')).toBe(false);
  });

  it('require זורק ForbiddenError', () => {
    const r = { userId: 'a', role: 'accountant' as const };
    expect(() => require(r, 'config.change-mode')).toThrow(ForbiddenError);
  });

  it('filterFilesForRole: רו"ח לא רואה pending', () => {
    const files = [baseFile('pending'), baseFile('downloaded'), baseFile('submitted')];
    expect(filterFilesForRole({ userId: 'a', role: 'accountant' }, files)).toHaveLength(2);
    expect(filterFilesForRole({ userId: 'm', role: 'general-manager' }, files)).toHaveLength(3);
    expect(filterFilesForRole({ userId: 's', role: 'staff' }, files)).toHaveLength(0);
  });
});
