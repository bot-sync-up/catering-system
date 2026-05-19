import {
  isWithinQuietHours,
  setTenantQuietHours,
  getTenantQuietHours,
} from '../src/quiet-hours';
import { timeIsBetween } from '../src/push/preferences';

describe('quiet-hours', () => {
  it('default window for Israeli tenants is 22:00–08:00 Asia/Jerusalem', () => {
    const cfg = getTenantQuietHours('not-configured');
    expect(cfg.startLocal).toBe('22:00');
    expect(cfg.endLocal).toBe('08:00');
    expect(cfg.timezone).toBe('Asia/Jerusalem');
  });

  it('overnight window correctly flags both sides of midnight', () => {
    // 2026-05-19 in Jerusalem; pick UTC times that map to known local hours.
    // 23:00 Asia/Jerusalem in summer (IDT, UTC+3) = 20:00 UTC.
    const midnight = new Date('2026-05-19T20:00:00Z');
    expect(timeIsBetween(midnight, '22:00', '08:00', 'Asia/Jerusalem')).toBe(true);

    // 02:00 Asia/Jerusalem = 23:00 UTC previous day.
    const lateNight = new Date('2026-05-19T23:00:00Z');
    expect(timeIsBetween(lateNight, '22:00', '08:00', 'Asia/Jerusalem')).toBe(true);

    // 10:00 Asia/Jerusalem (summer) = 07:00 UTC — outside the window.
    const morning = new Date('2026-05-19T07:00:00Z');
    expect(timeIsBetween(morning, '22:00', '08:00', 'Asia/Jerusalem')).toBe(false);
  });

  it('respects per-tenant override', async () => {
    setTenantQuietHours('t-night-shift', {
      startLocal: '02:00',
      endLocal: '06:00',
      timezone: 'Asia/Jerusalem',
    });
    // 04:00 Asia/Jerusalem (summer) = 01:00 UTC.
    const t = new Date('2026-05-19T01:00:00Z');
    const within = await isWithinQuietHours(
      { address: 'x', tenantId: 't-night-shift' },
      t,
    );
    expect(within).toBe(true);
  });

  it('non-overlapping window returns false outside it', async () => {
    setTenantQuietHours('t-day', {
      startLocal: '13:00',
      endLocal: '14:00',
      timezone: 'Asia/Jerusalem',
    });
    // 09:00 Asia/Jerusalem (summer) = 06:00 UTC.
    const t = new Date('2026-05-19T06:00:00Z');
    expect(await isWithinQuietHours({ address: 'x', tenantId: 't-day' }, t)).toBe(false);
  });
});
