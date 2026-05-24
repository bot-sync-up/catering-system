import { auditQuerySchema } from '../src/api/auditQuery';

describe('auditQuerySchema', () => {
  it('accepts a fully-populated query', () => {
    const parsed = auditQuerySchema.safeParse({
      q: 'הרב',
      action: 'OFFICIAL_TAG_CHANGE',
      entityType: 'Answer',
      from: '2026-01-01',
      to: '2026-05-01',
      page: '2',
      pageSize: '100',
      sort: 'asc',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.pageSize).toBe(100);
      expect(parsed.data.action).toBe('OFFICIAL_TAG_CHANGE');
    }
  });

  it('rejects invalid action enum', () => {
    const parsed = auditQuerySchema.safeParse({ action: 'NOT_REAL' });
    expect(parsed.success).toBe(false);
  });

  it('clamps default page/size', () => {
    const parsed = auditQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.sort).toBe('desc');
  });
});
