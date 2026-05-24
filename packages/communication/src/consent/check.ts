import { Channel, Recipient } from '../types';

/**
 * Consent ledger lookup. Every outbound non-OTP message must verify
 * a positive consent record exists for (userId, tenantId, channel).
 *
 * The ledger itself lives outside this package (separate microservice
 * for auditability). We talk to it through a pluggable adapter so unit
 * tests can swap in an in-memory mock.
 */

export interface ConsentRecord {
  userId: string;
  tenantId: string;
  channel: Channel;
  /** "granted" or "revoked". Latest record wins. */
  status: 'granted' | 'revoked';
  /** Source of consent: "signup", "import", "import-consent-page", etc. */
  source: string;
  /** Timestamp when consent was recorded. */
  capturedAt: string;
}

export interface ConsentLedger {
  latest(userId: string, tenantId: string, channel: Channel): Promise<ConsentRecord | null>;
  record(record: ConsentRecord): Promise<void>;
}

let ledger: ConsentLedger | null = null;
export function setConsentLedger(impl: ConsentLedger) {
  ledger = impl;
}

/** Returns true if the recipient has granted consent for the channel. */
export async function checkConsent(recipient: Recipient, channel: Channel): Promise<boolean> {
  // No userId → we can't look up consent. Reject by default to be safe.
  // OTP / system flows should set `message.bypassConsent = true` explicitly.
  if (!recipient.userId) return false;
  if (!ledger) {
    // Fail-open in dev only; production deployments MUST register a ledger.
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }
  const rec = await ledger.latest(recipient.userId, recipient.tenantId, channel);
  return rec?.status === 'granted';
}

/** In-memory ledger for tests + local dev. */
export class InMemoryConsentLedger implements ConsentLedger {
  private readonly records = new Map<string, ConsentRecord[]>();

  private key(u: string, t: string, c: Channel) {
    return `${t}::${u}::${c}`;
  }

  async latest(userId: string, tenantId: string, channel: Channel) {
    const list = this.records.get(this.key(userId, tenantId, channel)) ?? [];
    return list[list.length - 1] ?? null;
  }

  async record(record: ConsentRecord) {
    const list = this.records.get(this.key(record.userId, record.tenantId, record.channel)) ?? [];
    list.push(record);
    this.records.set(this.key(record.userId, record.tenantId, record.channel), list);
  }
}
