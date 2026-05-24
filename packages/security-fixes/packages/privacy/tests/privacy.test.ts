import { describe, it, expect, vi } from 'vitest';
import { newSARRequest, isOverdue, executeSAR, type SARRequest, type DataSource, type SARStore } from '../src/subjectAccessRequest';
import { pseudonymize, anonymizeValue, eraseSubject, DEFAULT_ISRAEL_POLICIES, type ErasureDriver } from '../src/rightToErasure';

describe('SAR', () => {
  it('יוצר בקשה עם דדליין של 30 יום', () => {
    const req = newSARRequest('user-1', 'a@b.com');
    const diff = req.dueBy.getTime() - req.requestedAt.getTime();
    expect(Math.round(diff / (1000 * 60 * 60 * 24))).toBe(30);
  });

  it('isOverdue מחזיר false עבור בקשה טריה', () => {
    const req = newSARRequest('user-1', 'a@b.com');
    expect(isOverdue(req)).toBe(false);
  });

  it('isOverdue מחזיר true אחרי 31 יום', () => {
    const req = newSARRequest('user-1', 'a@b.com');
    const later = new Date(req.dueBy);
    later.setDate(later.getDate() + 1);
    expect(isOverdue(req, later)).toBe(true);
  });

  it('executeSAR אוסף מכל המקורות', async () => {
    const req: SARRequest = { ...newSARRequest('user-1', 'a@b.com'), status: 'in_progress' };
    const src1: DataSource = { name: 'orders', exportFor: vi.fn().mockResolvedValue({ count: 5 }) };
    const src2: DataSource = { name: 'profile', exportFor: vi.fn().mockResolvedValue({ name: 'X' }) };
    const store: SARStore = { create: vi.fn(), update: vi.fn(), get: vi.fn() };
    const out = await executeSAR(req, [src1, src2], store);
    expect(out.orders).toEqual({ count: 5 });
    expect(out.profile).toEqual({ name: 'X' });
    expect(store.update).toHaveBeenCalledWith(req.id, { status: 'completed' });
  });
});

describe('Erasure', () => {
  it('pseudonymize דטרמיניסטי', () => {
    expect(pseudonymize('user-1')).toBe(pseudonymize('user-1'));
    expect(pseudonymize('user-1')).not.toBe(pseudonymize('user-2'));
  });

  it('anonymizeValue מחזיר ערכים ידועים', () => {
    expect(anonymizeValue('email')).toBe('anonymized@deleted.local');
    expect(anonymizeValue('phone')).toBe('+972000000000');
    expect(anonymizeValue('name')).toBe('משתמש שנמחק');
  });

  it('eraseSubject משדרג hard_delete ל-anonymize כשיש חובת שמירה', async () => {
    const driver: ErasureDriver = {
      hardDelete: vi.fn().mockResolvedValue(0),
      updateBySubject: vi.fn().mockResolvedValue(3),
    };
    const policy = { ...DEFAULT_ISRAEL_POLICIES[0]!, mode: 'hard_delete' as const };
    const results = await eraseSubject('user-1', [policy], driver);
    expect(results[0]!.mode).toBe('anonymize');
    expect(driver.hardDelete).not.toHaveBeenCalled();
    expect(driver.updateBySubject).toHaveBeenCalled();
  });

  it('eraseSubject מוחק לחלוטין marketing_preferences', async () => {
    const driver: ErasureDriver = {
      hardDelete: vi.fn().mockResolvedValue(2),
      updateBySubject: vi.fn().mockResolvedValue(0),
    };
    const policy = DEFAULT_ISRAEL_POLICIES.find((p) => p.resource === 'marketing_preferences')!;
    const results = await eraseSubject('user-1', [policy], driver);
    expect(results[0]!.mode).toBe('hard_delete');
    expect(driver.hardDelete).toHaveBeenCalledWith('marketing_preferences', 'user-1');
  });
});
