/**
 * Marketing Consent Ledger
 * ---------------------------------------------------------------
 * תואם לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ"ב-1982 —
 * "חוק הספאם". דורש הסכמה מפורשת מתועדת לפני שיווק.
 *
 * תכונות:
 *   1) Double opt-in — לאחר טופס, מייל אישור עם token חד-פעמי.
 *   2) Immutable hash-chain log — כל רשומה כוללת prevHash, כך
 *      שלא ניתן לערוך רשומות ישנות בלי לחבל בשרשרת.
 *   3) Withdraw — ביטול הסכמה בקלות, בכל עת (one-click unsubscribe).
 *   4) שליפת היסטוריית הסכמות לכל משתמש (לצרכי ביקורת).
 */

import crypto from 'crypto';
import { z } from 'zod';

/* ----------------------------------------------------------- */
/* Types                                                         */
/* ----------------------------------------------------------- */
export type ConsentChannel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'push';
export type ConsentAction = 'requested' | 'confirmed' | 'withdrawn' | 'expired';

export interface ConsentEntry {
  id: string;
  userId: string;
  channel: ConsentChannel;
  action: ConsentAction;
  purpose: string;             // "newsletter", "promos", וכו'
  ip: string;
  userAgent?: string;
  evidence?: string;           // טוקן מהמייל / מספר טופס
  timestamp: Date;
  prevHash: string;            // hex of sha256
  hash: string;                // hex of sha256(serialize(entry without hash))
}

export interface ConsentStore {
  appendEntry(entry: ConsentEntry): Promise<void>;
  getLastHash(): Promise<string>;
  findByUser(userId: string): Promise<ConsentEntry[]>;
  findPendingToken(token: string): Promise<{ userId: string; channel: ConsentChannel; purpose: string } | null>;
  consumeToken(token: string): Promise<void>;
  storePendingToken(token: string, userId: string, channel: ConsentChannel, purpose: string, ttlMinutes: number): Promise<void>;
}

export interface MailSender {
  sendConfirmation(email: string, opts: { token: string; purpose: string; verifyUrl: string }): Promise<void>;
}

/* ----------------------------------------------------------- */
/* Schemas                                                       */
/* ----------------------------------------------------------- */
export const RequestConsentSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  channel: z.enum(['email', 'sms', 'whatsapp', 'phone', 'push']),
  purpose: z.string().min(2).max(120),
});

export const ConfirmConsentSchema = z.object({
  token: z.string().min(16),
});

export const WithdrawConsentSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(['email', 'sms', 'whatsapp', 'phone', 'push']),
  purpose: z.string().min(2).max(120),
});

/* ----------------------------------------------------------- */
/* Helpers                                                       */
/* ----------------------------------------------------------- */
function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function newId(): string {
  return crypto.randomUUID();
}

function newToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function entryDigest(entry: Omit<ConsentEntry, 'hash'>): string {
  // serialize בסדר קבוע, ללא שדה hash
  const data = JSON.stringify({
    id: entry.id,
    userId: entry.userId,
    channel: entry.channel,
    action: entry.action,
    purpose: entry.purpose,
    ip: entry.ip,
    userAgent: entry.userAgent ?? '',
    evidence: entry.evidence ?? '',
    timestamp: entry.timestamp.toISOString(),
    prevHash: entry.prevHash,
  });
  return sha256Hex(data);
}

/* ----------------------------------------------------------- */
/* Public API                                                    */
/* ----------------------------------------------------------- */
export class ConsentLedger {
  constructor(
    private store: ConsentStore,
    private mail: MailSender,
    private verifyBaseUrl: string,
    private tokenTtlMinutes = 60 * 24, // 24 שעות
  ) {}

  /** שלב 1 — בקשת הסכמה ואישור במייל */
  async requestConsent(input: {
    userId: string;
    email: string;
    channel: ConsentChannel;
    purpose: string;
    ip: string;
    userAgent?: string;
  }): Promise<{ token: string }> {
    const token = newToken();
    await this.store.storePendingToken(token, input.userId, input.channel, input.purpose, this.tokenTtlMinutes);

    const prevHash = await this.store.getLastHash();
    const entryBase = {
      id: newId(),
      userId: input.userId,
      channel: input.channel,
      action: 'requested' as ConsentAction,
      purpose: input.purpose,
      ip: input.ip,
      userAgent: input.userAgent,
      evidence: sha256Hex(token).slice(0, 12), // לא שומרים את ה-token עצמו בלוג
      timestamp: new Date(),
      prevHash,
    };
    const hash = entryDigest(entryBase);
    await this.store.appendEntry({ ...entryBase, hash });

    await this.mail.sendConfirmation(input.email, {
      token,
      purpose: input.purpose,
      verifyUrl: `${this.verifyBaseUrl}?token=${encodeURIComponent(token)}`,
    });

    return { token };
  }

  /** שלב 2 — אישור הקליק במייל */
  async confirmConsent(input: { token: string; ip: string; userAgent?: string }): Promise<boolean> {
    const pending = await this.store.findPendingToken(input.token);
    if (!pending) return false;

    const prevHash = await this.store.getLastHash();
    const entryBase = {
      id: newId(),
      userId: pending.userId,
      channel: pending.channel,
      action: 'confirmed' as ConsentAction,
      purpose: pending.purpose,
      ip: input.ip,
      userAgent: input.userAgent,
      evidence: sha256Hex(input.token).slice(0, 12),
      timestamp: new Date(),
      prevHash,
    };
    const hash = entryDigest(entryBase);
    await this.store.appendEntry({ ...entryBase, hash });
    await this.store.consumeToken(input.token);
    return true;
  }

  /** ביטול הסכמה (חד-קליק) */
  async withdrawConsent(input: {
    userId: string;
    channel: ConsentChannel;
    purpose: string;
    ip: string;
    userAgent?: string;
  }): Promise<void> {
    const prevHash = await this.store.getLastHash();
    const entryBase = {
      id: newId(),
      userId: input.userId,
      channel: input.channel,
      action: 'withdrawn' as ConsentAction,
      purpose: input.purpose,
      ip: input.ip,
      userAgent: input.userAgent,
      timestamp: new Date(),
      prevHash,
    };
    const hash = entryDigest(entryBase);
    await this.store.appendEntry({ ...entryBase, hash });
  }

  /** היסטוריית הסכמות למשתמש */
  async getHistory(userId: string): Promise<ConsentEntry[]> {
    return this.store.findByUser(userId);
  }

  /** בדיקת תקינות שרשרת ה-hash (לאודיט) */
  async verifyChain(entries: ConsentEntry[]): Promise<boolean> {
    let prev = '';
    for (const e of entries) {
      if (e.prevHash !== prev) return false;
      const recomputed = entryDigest({ ...e, hash: undefined } as unknown as Omit<ConsentEntry, 'hash'>);
      if (recomputed !== e.hash) return false;
      prev = e.hash;
    }
    return true;
  }
}
