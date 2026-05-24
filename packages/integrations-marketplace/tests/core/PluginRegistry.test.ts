import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../../src/core/PluginRegistry';
import { mockContext } from '../helpers/mockContext';
import googleCalendar from '../../plugins/calendar/google-calendar';

describe('PluginRegistry', () => {
  it('registers a plugin', () => {
    const reg = new PluginRegistry();
    reg.register(googleCalendar);
    expect(reg.get('google-calendar')).toBeDefined();
  });

  it('refuses duplicate registration', () => {
    const reg = new PluginRegistry();
    reg.register(googleCalendar);
    expect(() => reg.register(googleCalendar)).toThrow();
  });

  it('installs a plugin', async () => {
    const reg = new PluginRegistry();
    reg.register(googleCalendar);
    const ctx = mockContext();
    const rec = await reg.install(
      'google-calendar',
      'org1',
      { calendarId: 'primary', syncDirection: 'two-way' },
      ctx
    );
    expect(rec.status).toBe('active');
    expect(rec.pluginId).toBe('google-calendar');
  });

  it('rejects unknown plugin id', async () => {
    const reg = new PluginRegistry();
    const ctx = mockContext();
    await expect(reg.install('nope', 'org1', {}, ctx)).rejects.toThrow();
  });

  it('lists by category', () => {
    const reg = new PluginRegistry();
    reg.register(googleCalendar);
    expect(reg.list('calendar')).toHaveLength(1);
    expect(reg.list('payment')).toHaveLength(0);
  });
});
