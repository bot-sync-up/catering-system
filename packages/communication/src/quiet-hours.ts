import { Recipient } from './types';
import { timeIsBetween } from './push/preferences';

/**
 * Quiet hours — per-tenant time windows when we will NOT send marketing
 * or transactional messages. Critical messages (set priority='critical')
 * bypass quiet hours via the UnifiedSender, not via this module.
 *
 * Default for Israeli tenants: 22:00 → 08:00 local time (Asia/Jerusalem).
 * Tenants can override via `setTenantQuietHours()`.
 */

export interface QuietHoursConfig {
  startLocal: string; // "HH:MM"
  endLocal: string;
  timezone: string; // IANA
}

const DEFAULT_QUIET: QuietHoursConfig = {
  startLocal: '22:00',
  endLocal: '08:00',
  timezone: 'Asia/Jerusalem',
};

const perTenant = new Map<string, QuietHoursConfig>();

export function setTenantQuietHours(tenantId: string, cfg: QuietHoursConfig): void {
  perTenant.set(tenantId, cfg);
}

export function getTenantQuietHours(tenantId: string): QuietHoursConfig {
  return perTenant.get(tenantId) ?? DEFAULT_QUIET;
}

export async function isWithinQuietHours(recipient: Recipient, now: Date = new Date()): Promise<boolean> {
  const cfg = getTenantQuietHours(recipient.tenantId);
  return timeIsBetween(now, cfg.startLocal, cfg.endLocal, cfg.timezone);
}
