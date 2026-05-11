import { describe, it, expect, vi } from 'vitest';
import { runArchivalCron, buildColdKey, expiresAt, type ArchiveRecord, type ColdStorage, type ArchivalSource } from '../src/cron';

function rec(id: string, createdAt: Date): ArchiveRecord {
  return { id, kind: 'invoice', createdAt, movedToColdAt: null, coldKey: null, checksum: null, status: 'hot' };
}

describe('archival cron', () => {
  it('buildColdKey יוצר נתיב נכון', () => {
    const r = rec('abc', new Date('2024-03-15'));
    expect(buildColdKey(r)).toBe('archive/invoice/2024/03/abc.bin');
  });

  it('expiresAt מוסיף 7 שנים', () => {
    const d = expiresAt(new Date('2025-01-01'));
    expect(d.getFullYear()).toBe(2032);
  });

  it('מעביר מסמכים ל-cold ומוחק שפג תוקפם', async () => {
    const old = rec('old', new Date('2023-01-01'));
    const ancient = { ...rec('ancient', new Date('2015-01-01')), status: 'cold' as const, coldKey: 'archive/invoice/2015/01/ancient.bin' };
    const source: ArchivalSource = {
      listForCold: vi.fn().mockResolvedValue([old]),
      listForDeletion: vi.fn().mockResolvedValue([ancient]),
      loadPayload: vi.fn().mockResolvedValue(Buffer.from('hello')),
      markCold: vi.fn(),
      markExpired: vi.fn(),
    };
    const cold: ColdStorage = {
      upload: vi.fn().mockResolvedValue({ key: 'k', sha256: 'abc' }),
      delete: vi.fn(),
    };
    const report = await runArchivalCron(source, cold, new Date('2025-05-01'));
    expect(report.movedToCold).toBe(1);
    expect(report.deletedExpired).toBe(1);
    expect(source.markCold).toHaveBeenCalled();
    expect(source.markExpired).toHaveBeenCalledWith('ancient');
    expect(cold.delete).toHaveBeenCalledWith('archive/invoice/2015/01/ancient.bin');
  });

  it('כשלון בודד לא עוצר את כל ה-batch', async () => {
    const a = rec('a', new Date('2023-01-01'));
    const b = rec('b', new Date('2023-01-01'));
    const source: ArchivalSource = {
      listForCold: vi.fn().mockResolvedValue([a, b]),
      listForDeletion: vi.fn().mockResolvedValue([]),
      loadPayload: vi.fn().mockImplementation((id: string) => {
        if (id === 'a') throw new Error('boom');
        return Promise.resolve(Buffer.from('x'));
      }),
      markCold: vi.fn(),
      markExpired: vi.fn(),
    };
    const cold: ColdStorage = {
      upload: vi.fn().mockResolvedValue({ key: 'k', sha256: 'abc' }),
      delete: vi.fn(),
    };
    const report = await runArchivalCron(source, cold, new Date('2025-05-01'));
    expect(report.movedToCold).toBe(1);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]!.id).toBe('a');
  });
});
