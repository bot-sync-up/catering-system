import { UnifiedSender } from '../src/UnifiedSender';
import { MockEmailProvider } from '../src/email/MockEmailProvider';
import {
  InMemoryConsentLedger,
  setConsentLedger,
} from '../src/consent/check';
import { InMemoryAuditSink, setAuditSink } from '../src/consent/audit';
import { setTenantQuietHours } from '../src/quiet-hours';
import { setTenantRateLimit } from '../src/rate-limit';
import { Message } from '../src/types';

describe('consent + audit integration', () => {
  let ledger: InMemoryConsentLedger;
  let audit: InMemoryAuditSink;
  let mock: MockEmailProvider;
  let sender: UnifiedSender;

  beforeEach(() => {
    ledger = new InMemoryConsentLedger();
    audit = new InMemoryAuditSink();
    setConsentLedger(ledger);
    setAuditSink(audit);
    // Disable quiet hours by setting an empty window.
    setTenantQuietHours('t1', { startLocal: '00:00', endLocal: '00:00', timezone: 'UTC' });
    setTenantRateLimit('t1', { dailyQuota: { email: 100_000 }, perMinute: 10_000 });
    mock = new MockEmailProvider();
    sender = new UnifiedSender([mock], { maxRetriesPerProvider: 1 });
  });

  const msg = (): Message => ({
    channel: 'email',
    to: { address: 'u1@example.com', tenantId: 't1', userId: 'u1' },
    subject: 's',
    body: 'b',
  });

  it('skips send when no consent record exists', async () => {
    const [r] = await sender.send(msg());
    expect(r.status).toBe('skipped');
    expect(r.skippedReason).toBe('no_consent');
    expect(mock.outbox).toHaveLength(0);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0].skippedReason).toBe('no_consent');
  });

  it('skips when consent is revoked', async () => {
    await ledger.record({
      userId: 'u1',
      tenantId: 't1',
      channel: 'email',
      status: 'revoked',
      source: 'unsubscribe-link',
      capturedAt: new Date().toISOString(),
    });
    const [r] = await sender.send(msg());
    expect(r.status).toBe('skipped');
  });

  it('sends when consent is granted, and writes audit row with redacted address', async () => {
    await ledger.record({
      userId: 'u1',
      tenantId: 't1',
      channel: 'email',
      status: 'granted',
      source: 'signup',
      capturedAt: new Date().toISOString(),
    });
    const [r] = await sender.send(msg());
    expect(r.status).toBe('sent');
    expect(mock.outbox).toHaveLength(1);

    const entry = audit.entries.find((a) => a.status === 'sent')!;
    expect(entry.recipientAddress).not.toContain('u1@example.com');
    expect(entry.recipientAddress.startsWith('u1')).toBe(true);
    expect(entry.recipientAddress.endsWith('om')).toBe(true);
  });

  it('honors bypassConsent for OTPs / system messages', async () => {
    const [r] = await sender.send({ ...msg(), bypassConsent: true });
    expect(r.status).toBe('sent');
  });
});
