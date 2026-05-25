import { describe, it, expect, vi } from 'vitest';
import { AccountantNotifier } from '../src/notifications/AccountantNotifier';
import type { GeneratedFile } from '../src/types';

const baseFile: GeneratedFile = {
  id: 'f1',
  formType: 'PCN874',
  period: { period: '2026-04', year: 2026, month: 4 },
  fileName: 'PCN874-2026-04.zip',
  filePath: '/v/PCN874-2026-04.zip',
  checksum: 'abc',
  byteSize: 1024,
  generatedAt: '2026-05-10T07:00:00Z',
  status: 'pending',
};

describe('AccountantNotifier', () => {
  it('שולח מייל כשקובץ מוכן', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const n = new AccountantNotifier({
      email: { send },
      contact: { email: 'acc@example.co.il' },
    });
    await n.notifyFileReady(baseFile);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].subject).toContain('PCN874');
    expect(send.mock.calls[0][0].subject).toContain('2026/04');
  });

  it('לא שולח אם אין email contact', async () => {
    const send = vi.fn();
    const n = new AccountantNotifier({ email: { send }, contact: {} });
    await n.notifyFileReady(baseFile);
    expect(send).not.toHaveBeenCalled();
  });

  it('WhatsApp 2 ימים לפני deadline', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const n = new AccountantNotifier({
      whatsapp: { send },
      contact: { phone: '+972501234567' },
    });
    await n.notifyDeadlineApproaching(baseFile, new Date('2026-05-15'));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].text).toMatch(/תזכורת.*PCN874/);
  });

  it('SMS ביום ההגשה', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const n = new AccountantNotifier({
      sms: { send },
      contact: { phone: '+972501234567' },
    });
    await n.notifyDeadlineToday(baseFile);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].text).toContain('דחוף');
  });
});
