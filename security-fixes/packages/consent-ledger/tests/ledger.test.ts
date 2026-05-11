import { describe, it, expect, vi } from 'vitest';
import { requestOptIn, confirmOptIn, optOut, hasActiveConsent, verifyChain, type ConsentLedgerStore, type Mailer, type ConsentEvent } from '../src/index';

function inMemoryStore(): ConsentLedgerStore & { events: ConsentEvent[]; tokens: Map<string, { subjectId: string; expiresAt: Date }> } {
  const events: ConsentEvent[] = [];
  const tokens = new Map<string, { subjectId: string; expiresAt: Date }>();
  return {
    events,
    tokens,
    append: async (e) => { events.push(e); },
    lastHashFor: async (subjectId) => {
      const items = events.filter((e) => e.subjectId === subjectId);
      return items.length ? items[items.length - 1]!.hash : null;
    },
    history: async (subjectId) => events.filter((e) => e.subjectId === subjectId),
    saveConfirmationToken: async (token, subjectId, expiresAt) => { tokens.set(token, { subjectId, expiresAt }); },
    consumeConfirmationToken: async (token) => {
      const v = tokens.get(token);
      if (!v || v.expiresAt < new Date()) return null;
      tokens.delete(token);
      return { subjectId: v.subjectId };
    },
  };
}

const mailer: Mailer = { sendConfirmation: vi.fn() };

describe('Consent Ledger', () => {
  it('דבל-אופט-אין מלא', async () => {
    const store = inMemoryStore();
    const { token } = await requestOptIn(
      { subjectId: 'u1', email: 'a@b.com', channel: 'email' },
      store, mailer, 'https://x/confirm?token={{token}}',
    );
    expect(await hasActiveConsent('u1', 'email', store)).toBe(false);
    await confirmOptIn(token, 'email', { email: 'a@b.com' }, store);
    expect(await hasActiveConsent('u1', 'email', store)).toBe(true);
  });

  it('opt-out מבטל הסכמה', async () => {
    const store = inMemoryStore();
    const { token } = await requestOptIn(
      { subjectId: 'u2', email: 'a@b.com', channel: 'email' },
      store, mailer, 'https://x/?token={{token}}',
    );
    await confirmOptIn(token, 'email', { email: 'a@b.com' }, store);
    await optOut({ subjectId: 'u2', email: 'a@b.com', channel: 'email' }, store);
    expect(await hasActiveConsent('u2', 'email', store)).toBe(false);
  });

  it('טוקן לא תקף', async () => {
    const store = inMemoryStore();
    await expect(
      confirmOptIn('nope', 'email', { email: 'x@y' }, store),
    ).rejects.toThrow();
  });

  it('verifyChain מצליח על שרשרת תקינה', async () => {
    const store = inMemoryStore();
    const { token } = await requestOptIn(
      { subjectId: 'u3', email: 'a@b.com', channel: 'email' },
      store, mailer, 'https://x/?token={{token}}',
    );
    await confirmOptIn(token, 'email', { email: 'a@b.com' }, store);
    await optOut({ subjectId: 'u3', email: 'a@b.com', channel: 'email' }, store);
    const v = await verifyChain('u3', store);
    expect(v.valid).toBe(true);
  });

  it('verifyChain מזהה שינוי', async () => {
    const store = inMemoryStore();
    const { token } = await requestOptIn(
      { subjectId: 'u4', email: 'a@b.com', channel: 'email' },
      store, mailer, 'https://x/?token={{token}}',
    );
    await confirmOptIn(token, 'email', { email: 'a@b.com' }, store);
    // שינוי לא לגיטימי
    store.events[1]!.email = 'attacker@evil.com';
    const v = await verifyChain('u4', store);
    expect(v.valid).toBe(false);
  });
});
