/**
 * Consent Ledger — מסד הסכמות בלתי-ניתן-לשינוי.
 *
 * חוק התקשורת (בזק ושידורים), תיקון 40 ("חוק הספאם"):
 *   אסור לשלוח דבר פרסומת בלי הסכמה מפורשת מראש בכתב.
 *   חובה לאפשר הסרה. חובה לתעד את ההסכמה.
 *
 * המודל: double opt-in — המשתמש נרשם, מקבל מייל אישור, ומאשר.
 * רק לאחר האישור ההסכמה תקפה. כל אירוע נכתב append-only לחבילת hash-chain.
 */
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const ConsentEventKindSchema = z.enum([
  'opt_in_requested',
  'opt_in_confirmed',
  'opt_out',
  'preferences_updated',
]);
export type ConsentEventKind = z.infer<typeof ConsentEventKindSchema>;

export const ConsentEventSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  email: z.string().email(),
  channel: z.enum(['email', 'sms', 'whatsapp', 'phone']),
  kind: ConsentEventKindSchema,
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  occurredAt: z.date(),
  /** hash של האירוע הקודם בשרשרת — מבטיח שאי אפשר לשנות היסטוריה */
  prevHash: z.string().nullable(),
  /** hash הנוכחי */
  hash: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export type ConsentEvent = z.infer<typeof ConsentEventSchema>;

function computeHash(prev: string | null, event: Omit<ConsentEvent, 'hash'>): string {
  const canonical = JSON.stringify({
    id: event.id,
    subjectId: event.subjectId,
    email: event.email,
    channel: event.channel,
    kind: event.kind,
    ip: event.ip,
    userAgent: event.userAgent,
    occurredAt: event.occurredAt.toISOString(),
    prevHash: prev,
    payload: event.payload ?? null,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export interface ConsentLedgerStore {
  append(event: ConsentEvent): Promise<void>;
  lastHashFor(subjectId: string): Promise<string | null>;
  history(subjectId: string): Promise<ConsentEvent[]>;
  /** טוקן חד-פעמי לאישור */
  saveConfirmationToken(token: string, subjectId: string, expiresAt: Date): Promise<void>;
  consumeConfirmationToken(token: string): Promise<{ subjectId: string } | null>;
}

export interface Mailer {
  sendConfirmation(email: string, confirmUrl: string): Promise<void>;
}

export interface ConsentInput {
  subjectId: string;
  email: string;
  channel: ConsentEvent['channel'];
  ip?: string | null;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
}

async function appendEvent(
  store: ConsentLedgerStore,
  kind: ConsentEventKind,
  inp: ConsentInput,
): Promise<ConsentEvent> {
  const prev = await store.lastHashFor(inp.subjectId);
  const event: Omit<ConsentEvent, 'hash'> = {
    id: crypto.randomUUID(),
    subjectId: inp.subjectId,
    email: inp.email,
    channel: inp.channel,
    kind,
    ip: inp.ip ?? null,
    userAgent: inp.userAgent ?? null,
    occurredAt: new Date(),
    prevHash: prev,
    payload: inp.payload,
  };
  const hash = computeHash(prev, event);
  const finalized: ConsentEvent = { ...event, hash };
  await store.append(finalized);
  return finalized;
}

/**
 * שלב 1 — המשתמש ביקש להירשם. שולחים מייל אימות, לא מסמנים הסכמה בפועל.
 */
export async function requestOptIn(
  inp: ConsentInput,
  store: ConsentLedgerStore,
  mailer: Mailer,
  confirmUrlTemplate: string,
): Promise<{ event: ConsentEvent; token: string }> {
  const event = await appendEvent(store, 'opt_in_requested', inp);
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 שעות
  await store.saveConfirmationToken(token, inp.subjectId, expiresAt);
  const url = confirmUrlTemplate.replace('{{token}}', encodeURIComponent(token));
  await mailer.sendConfirmation(inp.email, url);
  return { event, token };
}

/**
 * שלב 2 — המשתמש לחץ על הקישור במייל. רק עכשיו ההסכמה תקפה.
 */
export async function confirmOptIn(
  token: string,
  channel: ConsentEvent['channel'],
  metadata: { ip?: string | null; userAgent?: string | null; email: string },
  store: ConsentLedgerStore,
): Promise<ConsentEvent> {
  const consumed = await store.consumeConfirmationToken(token);
  if (!consumed) throw new Error('טוקן אישור לא תקף או פג תוקף');
  return appendEvent(store, 'opt_in_confirmed', {
    subjectId: consumed.subjectId,
    email: metadata.email,
    channel,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
  });
}

/**
 * הסרה מרשימה — חובה לפי החוק שתהיה זמינה תמיד.
 */
export async function optOut(
  inp: ConsentInput,
  store: ConsentLedgerStore,
): Promise<ConsentEvent> {
  return appendEvent(store, 'opt_out', inp);
}

/**
 * בדיקה האם נושא מידע נתן הסכמה ולא בוטלה.
 */
export async function hasActiveConsent(
  subjectId: string,
  channel: ConsentEvent['channel'],
  store: ConsentLedgerStore,
): Promise<boolean> {
  const events = await store.history(subjectId);
  let active = false;
  for (const ev of events) {
    if (ev.channel !== channel) continue;
    if (ev.kind === 'opt_in_confirmed') active = true;
    if (ev.kind === 'opt_out') active = false;
  }
  return active;
}

/**
 * אימות שלמות שרשרת — צריך לעבור ב-cron כדי לוודא שאף אחד לא שינה רשומות.
 */
export async function verifyChain(
  subjectId: string,
  store: ConsentLedgerStore,
): Promise<{ valid: boolean; brokenAt?: string }> {
  const events = await store.history(subjectId);
  let prev: string | null = null;
  for (const ev of events) {
    const expected = computeHash(prev, { ...ev });
    if (expected !== ev.hash || ev.prevHash !== prev) {
      return { valid: false, brokenAt: ev.id };
    }
    prev = ev.hash;
  }
  return { valid: true };
}
