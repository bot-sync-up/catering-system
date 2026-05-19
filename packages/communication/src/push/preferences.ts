import { Channel } from '../types';

/**
 * Push notification preferences — applied BEFORE handing off to a provider.
 *
 * Supports:
 *   - DND (Do Not Disturb) windows per user (e.g. 22:00–08:00 Asia/Jerusalem)
 *   - Per-channel preference (email/sms/whatsapp/push on/off)
 *   - Per-category preference inside push ("marketing" / "system" / "social")
 *   - Hard opt-out (kill switch)
 *
 * The storage adapter is pluggable so this works against Postgres,
 * Redis, DynamoDB, etc.
 */

export interface DndWindow {
  /** "HH:MM" 24h local time. */
  startLocal: string;
  endLocal: string;
  /** IANA timezone, e.g. "Asia/Jerusalem". */
  timezone: string;
}

export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  /** Hard opt-out — overrides everything else. */
  optedOut: boolean;
  /** Per-channel toggle. Missing = enabled. */
  channels: Partial<Record<Channel, boolean>>;
  /** Categories user has muted (free-form strings). */
  mutedCategories: string[];
  /** Optional DND windows; if any matches "now", non-critical pushes are blocked. */
  dnd: DndWindow[];
}

export interface PreferenceStore {
  get(userId: string, tenantId: string): Promise<NotificationPreferences | null>;
  upsert(prefs: NotificationPreferences): Promise<void>;
}

/** In-memory store — fine for tests, swap for Postgres in prod. */
export class InMemoryPreferenceStore implements PreferenceStore {
  private readonly map = new Map<string, NotificationPreferences>();
  private key(u: string, t: string) {
    return `${t}::${u}`;
  }
  async get(userId: string, tenantId: string) {
    return this.map.get(this.key(userId, tenantId)) ?? null;
  }
  async upsert(prefs: NotificationPreferences) {
    this.map.set(this.key(prefs.userId, prefs.tenantId), prefs);
  }
}

export function isInDnd(prefs: NotificationPreferences, now: Date = new Date()): boolean {
  for (const w of prefs.dnd) {
    if (timeIsBetween(now, w.startLocal, w.endLocal, w.timezone)) return true;
  }
  return false;
}

/**
 * Compare `now` against an [start,end] window in a specific IANA timezone.
 * Handles windows that cross midnight (e.g. 22:00–08:00).
 */
export function timeIsBetween(now: Date, start: string, end: string, tz: string): boolean {
  const local = formatInTz(now, tz);
  const minsNow = parseHM(local);
  const minsStart = parseHM(start);
  const minsEnd = parseHM(end);
  if (minsStart === minsEnd) return false;
  if (minsStart < minsEnd) return minsNow >= minsStart && minsNow < minsEnd;
  // Crosses midnight.
  return minsNow >= minsStart || minsNow < minsEnd;
}

function parseHM(s: string): number {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function formatInTz(d: Date, tz: string): string {
  // Intl gives us a stable HH:MM in the target zone.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  return fmt.format(d);
}

/**
 * Decide whether a push send is allowed given the user's preferences.
 * Critical messages bypass DND + per-category mutes (but still respect optedOut).
 */
export function canSendPush(
  prefs: NotificationPreferences | null,
  opts: { category?: string; critical?: boolean } = {},
): { allowed: boolean; reason?: string } {
  if (!prefs) return { allowed: true };
  if (prefs.optedOut) return { allowed: false, reason: 'opted_out' };
  if (prefs.channels.push === false) return { allowed: false, reason: 'channel_disabled' };
  if (!opts.critical) {
    if (opts.category && prefs.mutedCategories.includes(opts.category)) {
      return { allowed: false, reason: 'category_muted' };
    }
    if (isInDnd(prefs)) return { allowed: false, reason: 'dnd' };
  }
  return { allowed: true };
}
