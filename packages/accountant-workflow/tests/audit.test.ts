import { describe, it, expect } from 'vitest';
import { SubmissionAuditLog, InMemoryAuditStore } from '../src/audit/SubmissionAuditLog';

describe('SubmissionAuditLog', () => {
  it('שומר אירועים ומאפשר סינון לפי fileId', async () => {
    const log = new SubmissionAuditLog(new InMemoryAuditStore());
    await log.record('file.generated', 'system', { fileId: 'f1' });
    await log.record('file.downloaded', 'u-acc', { fileId: 'f1' });
    await log.record('file.marked-submitted', 'u-acc', {
      fileId: 'f1',
      submissionReference: 'REF-001',
    });
    await log.record('file.generated', 'system', { fileId: 'f2' });

    const f1Events = await log.getHistoryForFile('f1');
    expect(f1Events).toHaveLength(3);
    expect(f1Events.map((e) => e.action)).toEqual([
      'file.generated',
      'file.downloaded',
      'file.marked-submitted',
    ]);
    expect(f1Events[2].submissionReference).toBe('REF-001');

    const all = await log.getAll();
    expect(all).toHaveLength(4);
  });
});
